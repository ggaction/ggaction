import assert from "node:assert/strict";
import test from "node:test";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";

test("snapshot producer version matches the installed package", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));
  assert.equal(JSON.parse(serializeProgram(chart())).packageVersion, manifest.version);
});

test("persistence bundles for browsers without native, filesystem, or MCP dependencies", async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../../../src/persistence.js", import.meta.url))],
    bundle: true, platform: "browser", format: "esm", write: false, metafile: true
  });
  assert.ok(result.outputFiles[0].text.includes("deserializeProgram"));
  const manifest = JSON.parse(await readFile(new URL("../../../licenses/geometry-math.json", import.meta.url), "utf8"));
  const require = createRequire(new URL("../../../package.json", import.meta.url));
  const roots = await Promise.all(manifest.packages.map(async entry => path.resolve(path.dirname(await realpath(require.resolve(entry.installKey))),
    ...Array(entry.moduleEntry.split("/").length - 1).fill(".."))));
  const inputs = Object.keys(result.metafile.inputs);
  assert.equal(inputs.some(file => /(?:\/mcp\/|\/renderers\/native)/.test(file)), false);
  for (const file of inputs.filter(file => file.includes("node_modules/"))) {
    const actual = await realpath(file);
    assert.ok(roots.some(root => actual.startsWith(root + path.sep)), `Unexpected browser dependency: ${file}`);
  }
  assert.ok(Object.values(result.metafile.outputs).every(output => output.imports.every(entry => entry.external !== true)));
});
