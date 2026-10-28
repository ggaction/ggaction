import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { copyDocumentationSupportFiles } from "../../../scripts/doc-snippets.js";

test("documentation support preserves explicit example modules and bytes without private source imports", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-doc-support-"));
  try {
    await copyDocumentationSupportFiles({ supportFiles: { "program.js": "examples/font-assets/program.js", "fonts/korean.otf": "examples/font-assets/fonts/korean.otf" } }, directory);
    assert.equal(await readFile(path.join(directory, "program.js"), "utf8"), await readFile(new URL("../../../examples/font-assets/program.js", import.meta.url), "utf8"));
    assert.deepEqual(await readFile(path.join(directory, "fonts/korean.otf")), await readFile(new URL("../../../examples/font-assets/fonts/korean.otf", import.meta.url)));
    await assert.rejects(copyDocumentationSupportFiles({ supportFiles: { "private.js": "examples/cars-scatterplot/program.js" } }, directory), /public installed package/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("documentation support rejects path escapes before copying any support files", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-doc-paths-"));
  try {
    for (const supportFiles of [{ "../escape.js": "examples/font-assets/program.js" }, { "/escape.js": "examples/font-assets/program.js" },
      { "x.js": "src/index.js" }, { "x.js": "examples/../src/index.js" }, { "x.js": "examples\\file.js" }]) {
      await assert.rejects(copyDocumentationSupportFiles({ supportFiles }, directory), /relative example/);
    }
    await copyDocumentationSupportFiles({}, directory);
    assert.deepEqual(await readdir(directory), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
