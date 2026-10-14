const pageUrl = "https://tectivejk.github.io/Upcoming-Test-Flights/";
const binUrl = "https://extendsclass.com/api/json-storage/bin/ecafdcc";
const marker = "Turn on alerts";

let ready = false;
for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    const response = await fetch(`${pageUrl}?ready=${Date.now()}`, { cache: "no-store" });
    const html = await response.text();
    if (response.ok && html.includes(marker)) {
      ready = true;
      break;
    }
    console.log(`Waiting for the new board (${response.status}, attempt ${attempt + 1}).`);
  } catch (error) {
    console.log(`Waiting for the new board (${error instanceof Error ? error.message : "fetch failed"}).`);
  }
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

if (!ready) {
  console.log("GitHub Pages is not serving the new board yet. The previous link stays as it is.");
  process.exit(0);
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
  <title>Upcoming flights & tests</title>
  <link rel="canonical" href="${pageUrl}">
  <script>location.replace(${JSON.stringify(pageUrl)});</script>
</head>
<body>
  <p><a href="${pageUrl}">Open the live board</a>.</p>
</body>
</html>
`;

const published = await fetch(binUrl, {
  method: "PUT",
  headers: { "content-type": "text/html" },
  body: html,
});
if (!published.ok) {
  throw new Error(`The previous link was not updated (${published.status}).`);
}
console.log(`Previous link now opens ${pageUrl}`);
