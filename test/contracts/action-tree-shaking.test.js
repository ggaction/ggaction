import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("bundlers discard unused built-in wrappers but preserve extension validation", async () => {
  const result = await build({
    stdin: { contents: `
      import { createDensityData } from "./src/actions/data/density.js";
      import { applyTheme } from "./src/actions/theme/actions.js";
      import { action, getWrappedActionMetadata } from "./src/core/action.js";
      console.log(getWrappedActionMetadata(applyTheme).op);
      console.log(getWrappedActionMetadata(createDensityData).op);
      try { action({ op: "", description: "Invalid" }, () => {}); }
      catch (error) { console.log(error.message); }
    `, resolveDir: root },
    bundle: true, format: "esm", platform: "node", write: false, minify: true
  });
  const code = result.outputFiles[0].text;
  assert.doesNotMatch(code, /op:"removeTheme"/);
  assert.doesNotMatch(code, /"createCategoricalDensityData",/);
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-tree-shaking-"));
  try {
    const file = path.join(directory, "consumer.mjs");
    await writeFile(file, code);
    assert.equal(execFileSync(process.execPath, [file], { encoding: "utf8" }),
      "applyTheme\ncreateDensityData\nAction metadata requires a non-empty op.\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
