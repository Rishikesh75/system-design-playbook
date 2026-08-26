import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "HLD");
const outputRoot = join(sourceRoot, "images");
const entryFile = join(root, ".diagram-export-entry.html");

async function findSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === "images") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findSources(path));
    if (entry.isFile() && extname(entry.name) === ".excalidraw") files.push(path);
  }

  return files;
}

const sources = await findSources(sourceRoot);
if (sources.length === 0) {
  console.log("No .excalidraw files found under HLD.");
  process.exit(0);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await writeFile(
  entryFile,
  `<!doctype html><html><body><script type="module" src="/scripts/export-diagrams-browser.mjs"></script></body></html>`,
);

const server = await createServer({
  root,
  server: { port: 0 },
  plugins: [{
    name: "write-exported-svg",
    configureServer(viteServer) {
      viteServer.middlewares.use("/api/write-svg", async (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = "";
        for await (const chunk of request) body += chunk;
        const { output, content } = JSON.parse(body);
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, content, "utf8");
        response.statusCode = 204;
        response.end();
      });
    },
  }],
});
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${url}.diagram-export-entry.html`);
  await page.evaluate(async (files) => {
    await window.exportDiagrams(files);
  }, sources.map((path) => ({
    source: relative(root, path).replaceAll("\\", "/"),
    output: join(outputRoot, `${relative(sourceRoot, path).replaceAll("\\", "/").replace(/\.excalidraw$/, "")}.svg`),
  })));
} finally {
  await browser.close();
  await server.close();
  await rm(entryFile, { force: true });
}

console.log(`Exported ${sources.length} diagram(s) to ${relative(root, outputRoot)}.`);