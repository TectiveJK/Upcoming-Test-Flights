import type { Entry } from "@/lib/schedule";

export function remoteBoardUrl(): string {
  return process.env.NEXT_PUBLIC_BOARD_URL ?? "";
}

type BoardFile = { entries: Entry[]; version: number };

function boardUrl(): string {
  const value = remoteBoardUrl();
  if (!value) throw new Error("The shared board is not configured.");
  return value;
}

export async function readRemoteBoard(): Promise<BoardFile> {
  const response = await fetch(`${boardUrl()}?t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("The board could not be loaded.");
  const body = (await response.json()) as Partial<BoardFile>;
  if (!body || !Array.isArray(body.entries)) {
    throw new Error("The board could not be loaded.");
  }
  return { entries: body.entries, version: Number(body.version) || 0 };
}

export async function mutateRemoteBoard(
  change: (entries: Entry[]) => Entry[],
): Promise<Entry[]> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readRemoteBoard();
    const entries = change(current.entries.map((entry) => ({ ...entry })));
    const response = await fetch(boardUrl(), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries, version: current.version + 1 }),
    });
    if (!response.ok) {
      lastError = new Error("The board could not be saved.");
      continue;
    }
    const wanted = JSON.stringify(entries);
    for (let check = 0; check < 5; check += 1) {
      try {
        const saved = await readRemoteBoard();
        if (JSON.stringify(saved.entries) === wanted) return saved.entries;
      } catch {
        lastError = new Error("The board could not be saved.");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError ?? new Error("The board could not be saved.");
}
