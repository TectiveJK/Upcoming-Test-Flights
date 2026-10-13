import { randomUUID } from "node:crypto";
import { watch, type FSWatcher } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Entry, Kind, NewEntryInput } from "@/lib/schedule";

export { validateNewEntry } from "@/lib/schedule";

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

function seedEntries(): Entry[] {
  return [];
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

export function updateEntry(id: string, input: NewEntryInput): Promise<Entry | null> {
  return enqueue(async () => {
    const shape = await readFileShape();
    const index = shape.entries.findIndex((entry) => entry.id === id);
    if (index < 0) return null;
    const current = shape.entries[index];
    const updated: Entry = {
      ...current,
      ...input,
      id: current.id,
      example: current.example,
      createdAt: current.createdAt,
    };
    shape.entries[index] = updated;
    await writeShape(shape);
    publish(shape.entries);
    return updated;
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
