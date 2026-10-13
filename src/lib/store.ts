import { randomUUID } from "node:crypto";
import { watch, type FSWatcher } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  addDays,
  formatDateInput,
  isValidDate,
  isValidTime,
  type Entry,
  type Kind,
} from "@/lib/schedule";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "entries.json");

type FileShape = { entries: Entry[] };
type BoardSnapshot = { entries: Entry[]; version: number };
type Waiter = {
  after: number;
  resolve: (snapshot: BoardSnapshot) => void;
};

type LiveHub = {
  chain: Promise<unknown>;
  version: number;
  latest: Entry[] | null;
  primed: boolean;
  waiters: Set<Waiter>;
  watcherStarted: boolean;
  watcher: FSWatcher | null;
  watchTimer: ReturnType<typeof setTimeout> | null;
};

const hub: LiveHub = ((globalThis as { __flightBoardHub?: LiveHub }).__flightBoardHub ??= {
  chain: Promise.resolve(),
  version: 0,
  latest: null,
  primed: false,
  waiters: new Set(),
  watcherStarted: false,
  watcher: null,
  watchTimer: null,
});

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = hub.chain.then(task, task);
  hub.chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function publish(entries: Entry[]) {
  const snapshot = entries.map((entry) => ({ ...entry }));
  hub.latest = snapshot;
  hub.primed = true;
  hub.version += 1;
  const update = { entries: snapshot, version: hub.version };
  for (const waiter of hub.waiters) {
    if (hub.version > waiter.after) {
      hub.waiters.delete(waiter);
      waiter.resolve(update);
    }
  }
}

function ensureWatcher() {
  if (hub.watcherStarted) return;
  hub.watcherStarted = true;
  void mkdir(DATA_DIR, { recursive: true }).then(() => {
    if (hub.watcher) return;
    hub.watcher = watch(DATA_DIR, (_event, filename) => {
      const name = filename?.toString();
      if (name && name !== "entries.json") return;
      if (hub.watchTimer) clearTimeout(hub.watchTimer);
      hub.watchTimer = setTimeout(() => {
        void listEntries().then(publish).catch(() => undefined);
      }, 40);
    });
  });
}

export async function waitForBoard(
  after: number,
  signal: AbortSignal,
): Promise<BoardSnapshot> {
  ensureWatcher();
  if (!hub.primed || !hub.latest) {
    hub.latest = (await listEntries()).map((entry) => ({ ...entry }));
    hub.primed = true;
    if (hub.version < 1) hub.version = 1;
  }

  if (hub.version > after) {
    return { entries: hub.latest, version: hub.version };
  }

  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      after,
      resolve: (snapshot) => {
        windowClear();
        resolve(snapshot);
      },
    };
    const timer = setTimeout(() => {
      hub.waiters.delete(waiter);
      signal.removeEventListener("abort", onAbort);
      resolve({ entries: hub.latest ?? [], version: hub.version });
    }, 20000);
    const windowClear = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      clearTimeout(timer);
      hub.waiters.delete(waiter);
      reject(new Error("The live request was closed."));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort);
    hub.waiters.add(waiter);
  });
}

function isKind(value: unknown): value is Kind {
  return value === "flight" || value === "test";
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<Entry>;
  return (
    typeof entry.id === "string" &&
    isKind(entry.kind) &&
    typeof entry.title === "string" &&
    typeof entry.date === "string" &&
    typeof entry.time === "string" &&
    typeof entry.owner === "string" &&
    typeof entry.notes === "string" &&
    typeof entry.example === "boolean" &&
    typeof entry.createdAt === "string"
  );
}

function seedEntries(now = new Date()): Entry[] {
  const today = formatDateInput(now);
  const createdAt = now.toISOString();
  const samples: Array<Omit<Entry, "id" | "example" | "createdAt">> = [
    {
      kind: "flight",
      title: "Pad checkout",
      date: today,
      time: "09:15",
      owner: "Alex",
      notes: "Confirm wind limits before launch.",
    },
    {
      kind: "test",
      title: "Battery thermal cycle",
      date: today,
      time: "14:00",
      owner: "Priya",
      notes: "Lab 2. Bring the spare pack.",
    },
    {
      kind: "flight",
      title: "North range survey",
      date: addDays(today, 1),
      time: "08:30",
      owner: "Sam",
      notes: "",
    },
    {
      kind: "test",
      title: "Radio link drop",
      date: addDays(today, 1),
      time: "11:00",
      owner: "Jordan",
      notes: "Needs two people on the radios.",
    },
    {
      kind: "flight",
      title: "Customer demo hop",
      date: addDays(today, 2),
      time: "10:00",
      owner: "Riley",
      notes: "Hold if weather is below minimums.",
    },
    {
      kind: "test",
      title: "Ground station failover",
      date: addDays(today, 4),
      time: "13:30",
      owner: "Chris",
      notes: "",
    },
  ];

  return samples.map((sample) => ({
    ...sample,
    id: randomUUID(),
    example: true,
    createdAt,
  }));
}

async function readFileShape(): Promise<FileShape> {
  try {
    const raw = await readFile(DATA_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as FileShape).entries) &&
      (parsed as FileShape).entries.every(isEntry)
    ) {
      return { entries: (parsed as FileShape).entries };
    }
    throw new Error("Schedule file is unreadable.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const seeded = { entries: seedEntries() };
      await writeShape(seeded);
      return seeded;
    }
    throw error;
  }
}

async function writeShape(shape: FileShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const temporary = `${DATA_PATH}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(shape, null, 2));
  await rename(temporary, DATA_PATH);
}

export function listEntries(): Promise<Entry[]> {
  return enqueue(async () => (await readFileShape()).entries);
}

export type NewEntryInput = {
  kind: Kind;
  title: string;
  date: string;
  time: string;
  owner: string;
  notes: string;
};

export function validateNewEntry(
  input: Partial<Record<keyof NewEntryInput, unknown>>,
  now = new Date(),
): { ok: true; value: NewEntryInput } | { ok: false; error: string } {
  if (!isKind(input.kind)) {
    return { ok: false, error: "Choose Flight or Test." };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Add a name for the flight or test." };
  if (title.length > 80) {
    return { ok: false, error: "Keep the name under 80 characters." };
  }

  const date = typeof input.date === "string" ? input.date : "";
  if (!isValidDate(date)) return { ok: false, error: "Choose a valid date." };
  const year = Number(date.slice(0, 4));
  const thisYear = now.getFullYear();
  if (year < thisYear - 1 || year > thisYear + 3) {
    return { ok: false, error: "Choose a date within the next few years." };
  }

  const time = typeof input.time === "string" ? input.time : "";
  if (!isValidTime(time)) return { ok: false, error: "Choose a valid time." };

  const owner = typeof input.owner === "string" ? input.owner.trim() : "";
  if (owner.length > 60) {
    return { ok: false, error: "Keep the name under 60 characters." };
  }

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 240) {
    return { ok: false, error: "Keep the note under 240 characters." };
  }

  return { ok: true, value: { kind: input.kind, title, date, time, owner, notes } };
}

export function addEntry(input: NewEntryInput): Promise<Entry> {
  return enqueue(async () => {
    const shape = await readFileShape();
    const entry: Entry = {
      ...input,
      id: randomUUID(),
      example: false,
      createdAt: new Date().toISOString(),
    };
    shape.entries.push(entry);
    await writeShape(shape);
    publish(shape.entries);
    return entry;
  });
}

export function removeEntry(id: string): Promise<boolean> {
  return enqueue(async () => {
    const shape = await readFileShape();
    const next = shape.entries.filter((entry) => entry.id !== id);
    if (next.length === shape.entries.length) return false;
    shape.entries = next;
    await writeShape(shape);
    publish(shape.entries);
    return true;
  });
}
