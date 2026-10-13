import { removeEntry, updateEntry, validateNewEntry } from "@/lib/store";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/entries/[id]">,
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "That entry could not be found." }, { status: 400 });
  }

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
    const entry = await updateEntry(id, result.value);
    if (!entry) {
      return Response.json(
        { error: "That entry is already gone." },
        { status: 404 },
      );
    }
    return Response.json({ entry });
  } catch {
    return Response.json(
      { error: "The entry could not be saved." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/entries/[id]">,
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "That entry could not be found." }, { status: 400 });
  }

  try {
    const removed = await removeEntry(id);
    if (!removed) {
      return Response.json(
        { error: "That entry is already gone." },
        { status: 404 },
      );
    }
    return new Response(null, { status: 204 });
  } catch {
    return Response.json(
      { error: "The entry could not be removed." },
      { status: 500 },
    );
  }
}
