import { removeEntry } from "@/lib/store";

export const runtime = "nodejs";

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
