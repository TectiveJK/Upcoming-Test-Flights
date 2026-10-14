import { spawn } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";

const apiDir = "src/app/api";
const holdDir = "/tmp/upcoming-flights-api";
const devTypesDir = ".next/dev/types";
const devTypesHold = ".next/dev/_types_hold";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (await exists(holdDir)) {
  throw new Error("A previous hosted build did not put the API routes back.");
}

await rename(apiDir, holdDir);
const hideDevTypes = await exists(devTypesDir);
if (hideDevTypes) await rename(devTypesDir, devTypesHold);

try {
  await new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "build"], {
      stdio: "inherit",
      env: {
        ...process.env,
        HOSTED_EXPORT: "1",
        NEXT_PUBLIC_BOARD_URL: "https://extendsclass.com/api/json-storage/bin/defbaaf",
      },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with ${code}`));
    });
  });
} finally {
  await rename(holdDir, apiDir);
  if (hideDevTypes) await rename(devTypesHold, devTypesDir);
}

const pageUrl = "https://extendsclass.com/api/json-storage/bin/ecafdcc";
const htmlPath = ".next-hosted/index.html";
let html = await readFile(htmlPath, "utf8");
html = html.replaceAll(' crossorigin=""', "");
html = html.replaceAll(
  'href="/',
  'href="https://tectivejk.github.io/Upcoming-Test-Flights/',
);
html = html.replaceAll(
  'src="/',
  'src="https://tectivejk.github.io/Upcoming-Test-Flights/',
);
html = html.replaceAll(
  '\\"/',
  '\\"https://tectivejk.github.io/Upcoming-Test-Flights/',
);
await writeFile(htmlPath, html);
console.log(`Hosted page built. The old link is ${pageUrl}.`);
