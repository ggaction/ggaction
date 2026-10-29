import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { exampleImportMap } from "../../examples/browser-host/dependencies.js";

const CONTENT_TYPES = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"]
]);

function requestPath(root, requestUrl) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Request escaped the static root.");
  }
  return target;
}

function dependencyHTML(html, imports) {
  // Public examples exercise their own canonical loader without host injection.
  if (/<script\b[^>]*\bdata-example-module\s*=/i.test(html)) return html;
  const pattern = /(<script\b[^>]*\btype=["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  const maps = [...html.matchAll(pattern)];
  if (maps.length > 1) throw new TypeError("Browser fixture requires one import map.");
  if (maps.length === 1) {
    const definition = JSON.parse(maps[0][2]);
    for (const [key, value] of Object.entries(imports)) {
      if (Object.hasOwn(definition.imports ?? {}, key) && definition.imports[key] !== value) {
        throw new TypeError("Browser fixture dependency conflicts with its pinned manifest.");
      }
    }
    return html.replace(pattern, (_match, open, _content, close) =>
      `${open}${JSON.stringify({ ...definition, imports: { ...imports, ...definition.imports } })}${close}`);
  }
  const script = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, open => open + script)
    : html.replace(/^(\s*<!doctype[^>]*>)?/i, prefix => prefix + script);
}

export async function startStaticServer(root, { dependencies } = {}) {
  const absoluteRoot = path.resolve(root);
  let imports;
  if (dependencies !== undefined) {
    if (!["repository", "installed"].includes(dependencies)) throw new TypeError("Unknown browser dependency mode.");
    const libraryRoot = dependencies === "repository" ? absoluteRoot : path.join(absoluteRoot, "node_modules/ggaction");
    const manifest = JSON.parse(await readFile(path.join(libraryRoot, "licenses/geometry-math.json"), "utf8"));
    const definition = exampleImportMap(manifest, "https://fixture.invalid/");
    imports = Object.fromEntries(manifest.packages.map(({ installKey }) =>
      [installKey, new URL(definition.imports[installKey]).pathname]));
  }
  const server = createServer(async (request, response) => {
    try {
      let target = requestPath(absoluteRoot, request.url);
      if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
      const content = await readFile(target);
      const body = imports !== undefined && path.extname(target) === ".html"
        ? dependencyHTML(content.toString("utf8"), imports) : content;
      response.writeHead(200, {
        "content-type": CONTENT_TYPES.get(path.extname(target)) ??
          "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    })
  };
}
