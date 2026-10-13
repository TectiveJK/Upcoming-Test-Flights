import { connection } from "next/server";
import { addEntry, listEntries, validateNewEntry } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  await connection();
  try {
    const entries = await listEntries();
    return Response.json(
      { entries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "The schedule could not be read." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That was not a valid entry." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "That was not a valid entry." }, { status: 400 });
  }

  const result = validateNewEntry(body as Record<string, unknown>);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  try {
    const entry = await addEntry(result.value);
    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json(
      { error: "The entry could not be saved." },
      { status: 500 },
    );
  }
}
