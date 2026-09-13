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
    const precisionCalls = [...Array(13).keys()].flatMap(precision => ["f", "%", "e"].map(suffix =>
      `p.encodeText({ value: 0.125, format: ".${precision}${suffix}" });`));
    const paddedCalls = [...Array(10).keys()].flatMap(precision => ["f", "%", "e"].map(suffix =>
      `p.encodeText({ value: 0.125, format: ".0${precision}${suffix}" });`));
    await writeFile(file, `
import type { ChartProgram, TextEncodingOptions, DatumPositionEncodingOptions, CreateMarkLabelsOptions, EditMarkLabelPlacementOptions, EditMarkLabelSelectionOptions, MarkLabelPlacement, RemoveMarkLabelsOptions, CreateAnnotationOptions, ReferenceStatistic, CreateReferenceLineOptions, CreateReferenceBandOptions, RotationInput } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const shared: TextEncodingOptions = { content: "share", normalizeBy: "category", format: ".1%" };
p.encodeText(shared);
const labels: CreateMarkLabelsOptions = { source: "bars", content: "share", normalizeBy: "category", layout: { axis: "y" } };
p.createMarkLabels(labels);
p.createMarkLabels();
p.createMarkLabels({ source: "bars", select: { field: "value", op: "max", count: 2 } });
p.createMarkLabels({ source: "bars", selection: "focus" });
const editLabelSelection: EditMarkLabelSelectionOptions = { target: "bars-labels", all: true };
p.editMarkLabelSelection(editLabelSelection);
p.editMarkLabelSelection({ target: "bars-labels", select: { field: "value", op: "gt", value: 2 } });
p.editMarkLabelSelection({ target: "bars-labels", selection: "focus" });
const placement: MarkLabelPlacement = { anchor: "outsideEnd", gap: 4, overflow: "outside", leader: { strokeWidth: 1 } };
p.createMarkLabels({ source: "bars", placement });
const editPlacement: EditMarkLabelPlacementOptions = { target: "bars-labels", placement: "auto" };
p.editMarkLabelPlacement(editPlacement);
p.editMarkLabelPlacement({ target: "bars-labels", placement: { anchor: "insideEnd", leader: false } });
// @ts-expect-error Selected-label editing is Full-only.
basic.editMarkLabelSelection({ target: "bars-labels", all: true });
// @ts-expect-error Semantic label placement editing is Full-only.
basic.editMarkLabelPlacement({ target: "bars-labels", placement: "auto" });
// @ts-expect-error Placement requires a closed anchor.
p.createMarkLabels({ placement: { anchor: "edge" } });
// @ts-expect-error Placement objects require an anchor.
p.editMarkLabelPlacement({ target: "bars-labels", placement: { gap: 4 } });
// @ts-expect-error Placement reset is the exact auto token.
p.editMarkLabelPlacement({ target: "bars-labels", placement: "default" });
// @ts-expect-error Label creation selection modes are exclusive.
p.createMarkLabels({ select: { field: "value", op: "max" }, selection: "focus" });
// @ts-expect-error Label selection editing requires exactly one replacement.
p.editMarkLabelSelection({ target: "bars-labels" });
// @ts-expect-error all is a true-only reset branch.
p.editMarkLabelSelection({ target: "bars-labels", all: false });
// @ts-expect-error Label selection replacement branches are exclusive.
p.editMarkLabelSelection({ target: "bars-labels", all: true, selection: "focus" });
const removeLabels: RemoveMarkLabelsOptions = { source: "bars" };
p.removeMarkLabels(removeLabels);
p.removeMarkLabels({ target: "bars-labels" });
// @ts-expect-error Attached labels are Full-only.
basic.removeMarkLabels({ source: "bars" });
// @ts-expect-error Label removal requires exactly one selector.
p.removeMarkLabels({});
// @ts-expect-error Label target and source are exclusive.
p.removeMarkLabels({ target: "bars-labels", source: "bars" });
const annotation: CreateAnnotationOptions = { text: "Peak", x: 8, y: 9, dx: 4 };
p.createAnnotation(annotation);
p.createAnnotation({ text: "mark", source: "points", layout: false });
p.createAnnotation({ text: "plot", space: "plot", x: 0.5, y: 0.75, data: "data" });
// @ts-expect-error Annotation requires text.
p.createAnnotation({ x: 1, y: 2 });
// @ts-expect-error Coordinate anchors require both axes.
p.createAnnotation({ text: "x only", x: 1 });
// @ts-expect-error Plot coordinates are numeric.
p.createAnnotation({ text: "plot", space: "plot", x: "0.5", y: 0.5 });
// @ts-expect-error Plot anchors do not bind a source.
p.createAnnotation({ text: "plot", space: "plot", x: 0.5, y: 0.5, source: "points" });
// @ts-expect-error Data anchors inherit their dataset.
p.createAnnotation({ text: "data", x: 1, y: 2, data: "data" });
// @ts-expect-error Layout target is facade-owned.
p.createAnnotation({ text: "mark", layout: { target: "other" } });
const referenceLine: CreateReferenceLineOptions = { y: 5, source: "bars" };
const referenceBand: CreateReferenceBandOptions = { space: "plot", x: [0.2, 0.6] };
p.createReferenceLine(referenceLine);
p.createReferenceBand(referenceBand);
p.createReferenceLine({ x: "2021-01-01", temporalUnit: "timestamp" });
const statistic: ReferenceStatistic = { op: "quantile", p: 0.5 };
p.createReferenceLine({ source: "bars", axis: "y", statistic });
p.createReferenceBand({ source: "bars", axis: "y", field: "value", statistics: [{ op: "min" }, { op: "max" }] });
// @ts-expect-error Dynamic and literal bindings are exclusive.
p.createReferenceLine({ source: "bars", axis: "y", y: 5, statistic: { op: "mean" } });
// @ts-expect-error Lines take one statistic.
p.createReferenceLine({ source: "bars", axis: "y", statistics: [{ op: "mean" }, { op: "max" }] });
// @ts-expect-error Bands take exactly two statistics.
p.createReferenceBand({ source: "bars", axis: "y", statistics: [{ op: "mean" }] });
// @ts-expect-error Simple statistics do not accept p.
p.createReferenceLine({ source: "bars", axis: "y", statistic: { op: "mean", p: 0.5 } });
const textDatum: DatumPositionEncodingOptions = { datum: 8, scale: { domain: [0, 10] } };
p.createTextMark({ data: "data", text: "note" }).encodeX(textDatum).encodeY({ datum: "B", fieldType: "nominal" });
const explicitRotation: RotationInput = { value: 90, unit: "degrees" };
p.createTextMark({ data: "data", text: "degree", rotation: explicitRotation });
p.editTextMark({ rotation: { value: Math.PI / 4, unit: "radians" } });
p.createYAxisTitle({ rotation: { value: -90, unit: "degrees" } });
p.editYAxisTitle({ rotation: { value: 0, unit: "radians" } });
// @ts-expect-error Rotation units are closed.
p.createTextMark({ rotation: { value: 90, unit: "turns" } });
// @ts-expect-error Explicit rotations require a value.
p.createYAxisTitle({ rotation: { unit: "degrees" } });
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
p.encodeText({ value: 1250, format: ".2e" });
p.encodeText({ value: "2024-03-05T00:00:00Z", format: "%Y-%m-%d" });
p.createLegend({ channels: ["color"], labels: { format: ".2e" } });
p.editLegendLabels({ format: "%Y" });
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
// @ts-expect-error Scientific precision follows the same bounds.
p.encodeText({ value: 1, format: ".13e" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
