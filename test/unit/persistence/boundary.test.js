import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
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
  assert.equal(Object.keys(result.metafile.inputs).some(file => /(?:node_modules|\/mcp\/|\/renderers\/native)/.test(file)), false);
});
