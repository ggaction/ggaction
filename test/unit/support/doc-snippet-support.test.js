import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { copyDocumentationSupportFiles } from "../../../scripts/doc-snippets.js";

test("documentation support maps the canonical public entry while preserving example calls and binary assets", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-doc-support-"));
  try {
    await copyDocumentationSupportFiles({ supportFiles: { "program.js": "examples/font-assets/program.js", "fonts/korean.otf": "examples/font-assets/fonts/korean.otf" } }, directory);
    assert.equal(await readFile(path.join(directory, "program.js"), "utf8"), (await readFile(new URL("../../../examples/font-assets/program.js", import.meta.url), "utf8")).replace('from "../../src/index.js"', 'from "ggaction"'));
    assert.deepEqual(await readFile(path.join(directory, "fonts/korean.otf")), await readFile(new URL("../../../examples/font-assets/fonts/korean.otf", import.meta.url)));
    await assert.rejects(copyDocumentationSupportFiles({ supportFiles: { "private.js": "examples/getting-started/program.js" } }, directory), /public installed package/);
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

test("paired documentation HTML is explicit, same-section, bounded and hashed independently", async () => {
  const { documentationCodeBlocks, documentationHtmlHost } = await import("../../../scripts/doc-snippets.js");
  const options = { host: "paired-html", environment: "browser-module", rendering: "renders-canvas", mode: "complete" };
  const blocks = documentationCodeBlocks('## Example\n```html\n<canvas id="real-host"></canvas>\n```\n```js\nconst program = chart();\n```');
  const [html, script] = blocks;
  const result = documentationHtmlHost(blocks, script, options);
  assert.equal(result.html, '<canvas id="real-host"></canvas>');
  assert.equal(result.htmlSha256, 'f167fc8ba6480bfc6525f2923d040fc873683ce9c7344efee26d55308e411ae4');
  assert.deepEqual(documentationHtmlHost(blocks, script, {}), {});
  for (const invalid of [{ ...options, host: "anything" }, { ...options, environment: "node-esm" },
    { ...options, rendering: "authoring-only" }, { ...options, mode: "continuation" }]) {
    assert.throws(() => documentationHtmlHost(blocks, script, invalid), /complete rendering browser/);
  }
  for (const invalid of [[], [script], [{ ...html, heading: "Other" }, script], [{ ...html, line: script.line + 1 }, script],
    [html, { ...html }, script], [{ ...html, code: '<script>alert(1)</script>' }, script],
    [{ ...html, code: 'x'.repeat(131073) }, script]]) {
    assert.throws(() => documentationHtmlHost(invalid, script, options), /one bounded preceding HTML block/);
  }
  assert.notEqual(documentationHtmlHost([{ ...html, code: html.code + '\n' }, script], script, options).htmlSha256, result.htmlSha256);
});
