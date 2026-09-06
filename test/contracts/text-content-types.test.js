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
import type { ChartProgram, TextEncodingOptions, DatumPositionEncodingOptions, CreateMarkLabelsOptions, CreateReferenceLineOptions, CreateReferenceBandOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
declare const p: ChartProgram;
const shared: TextEncodingOptions = { content: "share", normalizeBy: "category", format: ".1%" };
p.encodeText(shared);
const labels: CreateMarkLabelsOptions = { source: "bars", content: "share", normalizeBy: "category", layout: { axis: "y" } };
p.createMarkLabels(labels);
p.createMarkLabels();
const referenceLine: CreateReferenceLineOptions = { y: 5, source: "bars" };
const referenceBand: CreateReferenceBandOptions = { space: "plot", x: [0.2, 0.6] };
p.createReferenceLine(referenceLine);
p.createReferenceBand(referenceBand);
p.createReferenceLine({ x: "2021-01-01", temporalUnit: "timestamp" });
const textDatum: DatumPositionEncodingOptions = { datum: 8, scale: { domain: [0, 10] } };
p.createTextMark({ data: "data", text: "note" }).encodeX(textDatum).encodeY({ datum: "B", fieldType: "nominal" });
// @ts-expect-error Exactly one position is required.
p.createReferenceLine({});
// @ts-expect-error Axes are exclusive.
p.createReferenceLine({ x: 1, y: 2 });
// @ts-expect-error Plot fractions are numeric.
p.createReferenceLine({ space: "plot", x: "0.5" });
// @ts-expect-error Plot coordinates do not bind a source.
p.createReferenceBand({ space: "plot", x: [0.2, 0.6], source: "bars" });
// @ts-expect-error Data coordinates inherit data from source.
p.createReferenceLine({ y: 5, data: "data" });
// @ts-expect-error An interval has exactly two values.
p.createReferenceBand({ y: [1, 2, 3] });
// @ts-expect-error Plot intervals are numeric.
p.createReferenceBand({ space: "plot", y: ["1", 2] });

p.createMarkLabels({});
p.createMarkLabels({ field: "value", layout: false });
p.createMarkLabels({ value: "constant", fontSize: 18 });
p.createMarkLabels({ format: ".1f", baseline: "bottom", dy: -4 });
p.createRectMark().encodeX({ datum: 2 }).encodeX2({ datum: 6 });
p.createRectMark().encodeY({ datum: "2020-01-01", fieldType: "temporal" }).encodeY2({ datum: "2020-01-03" });
// @ts-expect-error Facade must preserve exclusive encoding branches.
p.createMarkLabels({ field: "value", content: "value" });
// @ts-expect-error No independent dataset in attached-label facade.
p.createMarkLabels({ data: "data" });
// @ts-expect-error Layout targets its own label layer.
p.createMarkLabels({ layout: { target: "other" } });
// @ts-expect-error Normalize requires an explicit share branch.
p.createMarkLabels({ normalizeBy: "source" });
// @ts-expect-error Invalid text format is rejected in facade too.
p.createMarkLabels({ format: ".13f" });
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
