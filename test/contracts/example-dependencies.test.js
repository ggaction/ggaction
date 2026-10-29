import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, realpathSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exampleImportMap, installExampleDependencies } from "../../examples/browser-host/dependencies.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, "licenses/geometry-math.json"), "utf8"));
const requireDependency = createRequire(import.meta.resolve("geographic-math"));
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);

test("native example import maps resolve the same pinned local entries as Node without copied identities", () => {
  const map = exampleImportMap(manifest, "https://example.test/repository/");
  assert.equal(map.imports.ggaction, "https://example.test/repository/src/index.js");
  assert.equal(map.imports["ggaction/extension"], "https://example.test/repository/src/extension.js");
  for (const dependency of manifest.packages) {
    const local = path.join(root, "node_modules", dependency.installKey, dependency.moduleEntry);
    const actual = dependency.installKey === manifest.directDependency ? fileURLToPath(import.meta.resolve("geographic-math")) : requireDependency.resolve(dependency.installKey);
    assert.equal(realpathSync(local), realpathSync(actual));
    const pkg = JSON.parse(readFileSync(path.join(path.dirname(path.dirname(actual)), "package.json"), "utf8"));
    assert.equal(pkg.module, dependency.moduleEntry);
    assert.equal(map.imports[dependency.installKey], `https://example.test/repository/node_modules/${dependency.installKey}/${dependency.moduleEntry}`);
  }
});

test("every native example module starts through the shared dependency loader with its original local entry", () => {
  let entries = 0;
  for (const file of walk(path.join(root, "examples")).filter(file => file.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/<script\b([^>]*\btype="module"[^>]*)>/g)) {
      const attrs = match[1], loader = /\bsrc="([^"]+)"/.exec(attrs)?.[1];
      assert.ok(loader, `${file} has an unregistered inline module`);
      const entry = /\bdata-example-module="([^"]+)"/.exec(attrs)?.[1];
      assert.ok(entry, `${file} bypasses dependency installation`);
      assert.equal(path.resolve(path.dirname(file), loader), path.join(root, "examples/browser-host/load.js"));
      assert.ok(existsSync(path.resolve(path.dirname(file), entry)), `${file} entry must exist`);
      entries++;
    }
    assert.equal(html.includes('type="importmap"'), false, `${file} duplicates the shared import map`);
  }
  assert.ok(entries >= 100);
});

test("dependency installation awaits verified manifest fields before appending one import map", async () => {
  const appended = [], document = { createElement: tag => ({ tag }), head: { append: value => appended.push(value) } };
  const result = await installExampleDependencies(document, async url => {
    assert.ok(url.href.endsWith("licenses/geometry-math.json"));
    assert.deepEqual(appended, []);
    return { ok: true, json: async () => manifest };
  });
  assert.equal(appended.length, 1); assert.equal(appended[0].type, "importmap");
  assert.deepEqual(JSON.parse(appended[0].textContent), result);
  await assert.rejects(installExampleDependencies(document, async () => ({ ok: false })), /install the repository dependencies/);
  for (const altered of [null, { ...manifest, packages: [] }, { ...manifest, directDependency: "missing" },
    { ...manifest, packages: [{ ...manifest.packages[0], installKey: "../outside" }] },
    { ...manifest, packages: [{ ...manifest.packages[0], moduleEntry: "../outside.js" }] },
    { ...manifest, packages: [{ ...manifest.packages[0], moduleEntry: "src/absent.js" }] },
    { ...manifest, packages: [manifest.packages[0], manifest.packages[0]] }]) assert.throws(() => exampleImportMap(altered, "https://example.test/"));
  assert.equal(appended.length, 1);
});
