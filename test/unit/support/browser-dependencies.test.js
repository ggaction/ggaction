import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startStaticServer } from "../../support/static-server.js";

const manifest = JSON.parse(await readFile(new URL("../../../licenses/geometry-math.json", import.meta.url), "utf8"));
async function fixture(mode, html, check) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-browser-dependencies-"));
  let server;
  try {
    const library = mode === "installed" ? path.join(directory, "node_modules/ggaction") : directory;
    await mkdir(path.join(library, "licenses"), { recursive: true });
    await writeFile(path.join(library, "licenses/geometry-math.json"), JSON.stringify(manifest));
    await writeFile(path.join(directory, "index.html"), html);
    server = await startStaticServer(directory, { dependencies: mode });
    const response = await fetch(server.baseUrl);
    await check(response, await response.text());
  } finally { await server?.close(); await rm(directory, { recursive: true, force: true }); }
}

test("repository and installed fixture hosts use the canonical pinned dependency entries", async () => {
  for (const mode of ["repository", "installed"]) await fixture(mode,
    '<!doctype html><html><head><title>Fixture</title></head><body><script type="module">import("/src/index.js")</script></body></html>',
    async (response, html) => {
      assert.equal(response.status, 200);
      const map = JSON.parse(/<script type="importmap">(.*?)<\/script>/.exec(html)[1]);
      assert.deepEqual(Object.keys(map.imports), manifest.packages.map(item => item.installKey));
      for (const item of manifest.packages) assert.equal(map.imports[item.installKey], `/node_modules/${item.installKey}/${item.moduleEntry}`);
      assert.ok(html.indexOf('type="importmap"') < html.indexOf('type="module"'));
    });
});

test("fixture dependency maps preserve authored package entries and public examples keep their own loader", async () => {
  const html = '<!doctype html><script type="importmap">{"imports":{"ggaction":"/node_modules/ggaction/src/index.js"}}</script><script type="module"></script>';
  await fixture("installed", html, async (response, result) => {
    assert.equal(response.status, 200); assert.equal([...result.matchAll(/type="importmap"/g)].length, 1);
    const map = JSON.parse(/<script type="importmap">(.*?)<\/script>/.exec(result)[1]);
    assert.equal(map.imports.ggaction, "/node_modules/ggaction/src/index.js");
    assert.ok(Object.hasOwn(map.imports, manifest.directDependency));
  });
  const native = '<!doctype html><script type="module" src="/examples/browser-host/load.js" data-example-module="./program.js"></script>';
  await fixture("repository", native, async (response, result) => { assert.equal(response.status, 200); assert.equal(result, native); });
});

test("fixture hosts reject conflicting or duplicate maps instead of silently overriding them", async () => {
  const conflicting = `<script type="importmap">${JSON.stringify({ imports: { [manifest.directDependency]: "/wrong.js" } })}</script>`;
  for (const html of [conflicting, '<script type="importmap">{}</script><script type="importmap">{}</script>']) {
    await fixture("repository", html, async response => assert.equal(response.status, 404));
  }
  await assert.rejects(startStaticServer(tmpdir(), { dependencies: "unknown" }), /dependency mode/);
});

test("static hosts remain byte-exact when dependency installation was not requested", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-static-exact-")); let server;
  try {
    const html = '<!doctype html><title>Plain</title>';
    await writeFile(path.join(directory, "index.html"), html);
    server = await startStaticServer(directory);
    assert.equal(await (await fetch(server.baseUrl)).text(), html);
  } finally { await server?.close(); await rm(directory, { recursive: true, force: true }); }
});
