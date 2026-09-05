import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("text content and precision types match their runtime vocabularies", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-text-content-types-"));
  try {
    const file = path.join(directory, "text.mts");
    const precisionCalls = [...Array(13).keys()].flatMap(precision => ["f", "%"].map(suffix =>
      `p.encodeText({ value: 0.125, format: ".${precision}${suffix}" });`));
    const paddedCalls = [...Array(10).keys()].flatMap(precision => ["f", "%"].map(suffix =>
      `p.encodeText({ value: 0.125, format: ".0${precision}${suffix}" });`));
    await writeFile(file, `
import type { ChartProgram, TextEncodingOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
declare const p: ChartProgram;
const shared: TextEncodingOptions = { content: "share", normalizeBy: "category", format: ".1%" };
p.encodeText(shared);
p.encodeText({ content: "value" });
p.encodeText({ content: "category" });
p.encodeText({ field: "value" });
p.encodeText({ value: "hello", format: "auto" });
${[...precisionCalls, ...paddedCalls].join("\n")}
// @ts-expect-error Content and field are exclusive.
p.encodeText({ content: "value", field: "value" });
// @ts-expect-error Semantic and constant content are exclusive.
p.encodeText({ content: "value", value: 1 });
// @ts-expect-error Normalization is for shares only.
p.encodeText({ content: "category", normalizeBy: "source" });
// @ts-expect-error Normalization scope is closed.
p.encodeText({ content: "share", normalizeBy: "rows" });
// @ts-expect-error Content is closed.
p.encodeText({ content: "aggregate" });
// @ts-expect-error Precision must not exceed twelve.
p.encodeText({ value: 1, format: ".13f" });
// @ts-expect-error Negative precision is invalid.
p.encodeText({ value: 1, format: ".-1f" });
// @ts-expect-error Fractional precision is invalid.
p.encodeText({ value: 1, format: ".1.5f" });
// @ts-expect-error Percent precision follows the same bounds.
p.encodeText({ value: 1, format: ".13%" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
