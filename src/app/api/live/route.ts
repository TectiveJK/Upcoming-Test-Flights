import { connection } from "next/server";
import { waitForBoard } from "@/lib/store";

export async function GET(request: Request) {
  await connection();
  const after = Number(new URL(request.url).searchParams.get("after") ?? "0");

  try {
    const snapshot = await waitForBoard(Number.isFinite(after) ? after : 0, request.signal);
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
