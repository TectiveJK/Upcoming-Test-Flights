const writeProxy = "https://cors.jimmywarting.deno.net/";

function writeUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (new URL(url).origin === window.location.origin) return url;
  const query = new URLSearchParams({
    cors: JSON.stringify({
      url,
      deleteRequestHeaders: ["Origin", "Sec-Fetch-Mode"],
    }),
  });
  return `${writeProxy}?${query.toString()}`;
}

export async function readDocument<T>(url: string): Promise<T> {
  const response = await fetch(`${url}?t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("The board could not be loaded.");
  return (await response.json()) as T;
}

export async function writeDocument(url: string, body: string): Promise<void> {
  const response = await fetch(writeUrl(url), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("That change could not be saved.");
}
