export type Kind = "flight" | "test";

export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  date: string;
  time: string;
  owner: string;
  notes: string;
  example: boolean;
  createdAt: string;
};

export type DayTone = "earlier" | "today" | "upcoming" | "later";

export type DayGroup = {
  date: string;
  label: string;
  tone: DayTone;
  entries: Entry[];
};

export const WEEK_AHEAD_DAYS = 6;

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return formatDateInput(new Date(year, month - 1, day + days));
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function compareEntries(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.time !== b.time) return a.time < b.time ? -1 : 1;
  return a.title.localeCompare(b.title);
}

export function hasPassed(entry: Entry, now = new Date()): boolean {
  const today = formatDateInput(now);
  const time = formatTimeInput(now);
  return entry.date < today || (entry.date === today && entry.time < time);
}

export function dayHeading(date: string, today: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const written = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  if (date === today) return `Today · ${written}`;
  if (date === addDays(today, 1)) return `Tomorrow · ${written}`;
  return written;
}

export function kindLabel(kind: Kind): string {
  return kind === "flight" ? "Flight" : "Test";
}

export function groupEntries(entries: Entry[], now = new Date()) {
  const today = formatDateInput(now);
  const horizon = addDays(today, WEEK_AHEAD_DAYS);
  const sorted = [...entries].sort(compareEntries);
  const byDate = new Map<string, Entry[]>();

  for (const entry of sorted) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  const earlier: DayGroup[] = [];
  const soon: DayGroup[] = [];
  const later: DayGroup[] = [];

  for (const [date, dayEntries] of byDate) {
    const tone: DayTone =
      date < today
        ? "earlier"
        : date === today
          ? "today"
          : date <= horizon
            ? "upcoming"
            : "later";
    const group: DayGroup = {
      date,
      label: dayHeading(date, today),
      tone,
      entries: dayEntries,
    };
    if (tone === "earlier") earlier.push(group);
    else if (tone === "later") later.push(group);
    else soon.push(group);
  }

  const next = sorted.find((entry) => !hasPassed(entry, now)) ?? null;

  return { today, earlier, soon, later, next };
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
  if (input.kind !== "flight" && input.kind !== "test") {
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

  return {
    ok: true,
    value: { kind: input.kind, title, date, time, owner, notes },
  };
}
