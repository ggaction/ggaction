import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? ".artifacts/chart-gallery");
const port = Number(process.argv[3] ?? 8770);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Expected a valid port.");
const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
const allowed = new Set(["index.html", "manifest.json"]);
for (const chart of manifest.charts) {
  for (const name of [chart.png, chart.svg].filter(Boolean)) {
    if (!/^assets\/[a-z0-9-]+\.(png|svg)$/.test(name)) throw new Error(`Invalid gallery asset: ${name}`);
    allowed.add(name);
  }
}
const types = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };
createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    if (!allowed.has(name)) { response.writeHead(404).end(); return; }
    const bytes = await readFile(path.join(directory, name));
    response.writeHead(200, { "Content-Type": types[path.extname(name)], "Content-Length": bytes.length,
      "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch { response.writeHead(404).end(); }
}).listen(port, "127.0.0.1", () => console.log(`Gallery: http://127.0.0.1:${port}/ (${allowed.size} files)`));
