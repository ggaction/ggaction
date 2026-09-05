import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { resolveAreaMaterialization } from "../../../../src/actions/marks/area/materialize.js";
import { resolveBarItems } from "../../../../src/materialization/selection/items/bar.js";
import { deriveAreaSeries } from "../../../../src/grammar/areaSeries.js";
import { resolveAreaItems } from "../../../../src/materialization/selection/items/path.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

const rows = ["a", "b"].flatMap((series, group) => [2, 4, 3].map((value, x) => ({
  x, category: String(x), series, region: group ? "south" : "north", value: group ? [1, 2, 1][x] : value,
  tone: x + group + 1
})));
const base = (values = rows, entry = chart) => entry().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ id: "data", values });
const area = (values = rows, options = {}) => base(values).createAreaPlot({ id: "m", x: "x", y: "value", groupBy: "series", guides: false, ...options });
const bar = (values = rows, entry = chart) => base(values, entry).createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, guides: false }).encodeGroup({ field: "series" });
const layer = p => p.semanticSpec.layers.find(l => l.id === "m");
const items = p => p.graphicSpec.objects.m.items;
const derive = p => deriveAreaSeries(p.semanticSpec.datasets[0].values, layer(p));

for (const [mode, domain, first] of [
  ["stack", [0, 6], [[0, 2], [2, 3]]], ["fill", [0, 1], [[0, 2 / 3], [2 / 3, 1]]],
  ["center", [-3, 3], [[-1.5, 0.5], [0.5, 1.5]]]
]) test(`area ${mode} conserves series thickness independently of color`, () => {
  const before = area();
  const p = before.layoutSeries({ mode }).encodeColor({ field: "region" });
  assert.deepEqual(p.resolvedScales.y.domain, domain);
  assert.deepEqual(derive(p).series.map(s => [s.values[0].y, s.values[0].y2]), first);
  assert.equal(layer(p).layout.mode, mode);
  assert.equal(layer(p).encoding.color.layout, undefined);
  assert.equal(layer(p).encoding.y.stack, undefined);
  assert.equal(layer(p).encoding.group.field, "series");
  assert.deepEqual(p.semanticSpec.datasets, before.semanticSpec.datasets);
  const plain = p.removeEncoding({ channel: "color" });
  assert.deepEqual(derive(plain), derive(p));
  assert.equal(items(plain).length, 2);
  assert.deepEqual(p.layoutSeries({ mode: "overlay" }).resolvedScales.y.domain, [0, 4]);
});

test("diverging area separates signed sums and supports horizontal zero baselines", () => {
  const signed = rows.map(row => ({ ...row, value: row.series === "b" ? -row.value : row.value }));
  const p = area(signed, { layout: "diverging" });
  assert.deepEqual(p.resolvedScales.y.domain, [-2, 4]);
  assert.deepEqual(derive(p).series.map(s => [s.values[0].y, s.values[0].y2]), [[0, 2], [0, -1]]);
  const horizontal = area(rows, { x: "value", y: "x", valueChannel: "x", layout: "stack" });
  assert.equal(derive(horizontal).orientation, "horizontal");
  assert.deepEqual(horizontal.resolvedScales.x.domain, [0, 6]);
});

test("a missing endpoint breaks all stacked series at the same source position", () => {
  const values = ["a", "b"].flatMap(series => [2, 3, 1, 4, 2].map((value, x) => ({ x, series, value: series === "b" && x === 2 ? null : value })));
  const p = area(values, { missing: "break", layout: "stack" });
  const series = derive(p).series;
  assert.deepEqual(series.map(s => s.sourceIndices), [[0, 1], [3, 4], [5, 6], [8, 9]]);
  assert.deepEqual(resolveAreaItems(p, layer(p), p.semanticSpec.datasets[0]).map(item => item.members.map(row => row.x)), [[0, 1], [3, 4], [0, 1], [3, 4]]);
  assert.deepEqual(p.semanticSpec.datasets[0].values, values);
  const zero = area(rows.map(row => ({ ...row, value: 0 })), { layout: "fill" });
  assert.deepEqual(zero.resolvedScales.y.domain, [0, 1]);
  assert.ok(derive(zero).series.every(s => s.values.every(point => point.y === 0 && point.y2 === 0)));
});

test("invalid area layout edits preserve every state and caller input", () => {
  const p = area();
  assertAtomicFailures(p, [
    ...[undefined, "group", "invalid"].map(mode => ({ operation: () => p.layoutSeries({ mode }) })),
    { operation: () => p.layoutSeries({ mode: "stack", extra: true }) },
    { operation: () => p.encodeY2({ datum: 1 }).layoutSeries({ mode: "stack" }) },
    { operation: () => p.layoutSeries({ mode: "stack" }).removeEncoding({ channel: "group" }) },
    { operation: () => p.layoutSeries({ mode: "stack" }).encodeY2({ datum: 1 }) },
    { operation: () => p.encodeColor({ field: "category" }) }
  ]);
  assert.throws(() => area(rows.filter((_, i) => i !== 3), { layout: "stack" }), /aligned/);
  assert.throws(() => area([...rows, rows[0]], { layout: "stack" }), /unique/);
  assert.throws(() => area(rows.map(row => ({ ...row, value: -1 })), { layout: "fill" }), /non-negative/);
  assert.throws(() => area(rows, { x: "value", y: "x", valueChannel: "x", layout: "center" }), /orientation/);
  assert.throws(() => area(rows, { y: { lower: "value", upper: "tone" }, layout: "stack" }), /zero datum/);
});

test("bar group stack group roundtrip removes generated offsets and preserves source identity", () => {
  const grouped = bar().layoutSeries({ mode: "group" });
  const stacked = grouped.layoutSeries({ mode: "stack" });
  assert.equal(layer(stacked).encoding.xOffset, undefined);
  assert.equal(stacked.semanticSpec.scales.some(scale => scale.id === "xOffset"), false);
  assert.equal(stacked.resolvedScales.xOffset, undefined);
  assert.deepEqual(stacked.resolvedScales.y.domain, [0, 6]);
  const restored = stacked.layoutSeries({ mode: "group" });
  assert.deepEqual(restored.graphicSpec, grouped.graphicSpec);
  assert.deepEqual(layer(restored), layer(grouped));
  assert.equal(restored.semanticSpec.guides.legend, undefined);
  assert.equal(items(restored).length, rows.length);
});

test("explicit and shared offset scales survive leaving grouped layout", () => {
  const p = bar().createScale({ id: "slots", type: "ordinal", domain: ["a", "b"] })
    .encodeXOffset({ field: "series", scale: { id: "slots" }, paddingInner: 0.1 });
  const next = p.layoutSeries({ mode: "stack" });
  assert.ok(next.semanticSpec.scales.some(s => s.id === "slots"));
  assert.equal(next.markConfigs.m?.xOffset, undefined);
  assertAtomicFailures(p, [{ operation: () => p.editSemantic({ property: "scale[slots]", remove: true }) }]);
});

test("bar tuple groups and cell quantitative color remain independent", () => {
  const p = bar().encodeGroup({ fields: ["series", "region"] }).layoutSeries({ mode: "group" })
    .encodeColor({ field: "tone", fieldType: "quantitative", aggregate: "mean" });
  assert.equal(items(p).length, 6);
  assert.equal(layer(p).layout.mode, "group");
  assert.deepEqual(layer(p).encoding.group.fields, ["series", "region"]);
  assert.equal(new Set(items(p).map(item => item.properties.fill)).size, 4);
  assert.equal(items(p.layoutSeries({ mode: "stack" })).length, 6);
});

test("legacy layout assignments have one canonical owner and preserve an explicit group", () => {
  const p = bar().encodeColor({ field: "region", layout: "stack" });
  assert.equal(layer(p).encoding.group.inferredFrom, undefined);
  assert.equal(layer(p).encoding.group.field, "series");
  assert.equal(layer(p).layout.mode, "stack");
  assert.equal(layer(p.encodeColor({ field: "series" })).layout.mode, "stack");
  assert.equal(layer(p.encodeY({ field: "value", aggregate: "sum", stack: "normalize" })).layout.mode, "fill");
  assert.equal(layer(p.encodeXOffset({ field: "series" })).layout.mode, "group");
  assertAtomicFailures(p, [{ operation: () => p.encodeXOffset({ field: "region" }) }]);
  const inferred = base().createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color: "series", guides: false });
  assert.equal(layer(inferred).layout.mode, "group");
  assert.equal(layer(inferred).encoding.group.inferredFrom, "color");
  const reassigned = inferred.encodeColor({ field: "region" });
  assert.equal(layer(reassigned).encoding.group.field, "region");
  assert.equal(layer(reassigned.encodeGroup({ field: "region" })).encoding.group.inferredFrom, undefined);
});

test("Basic exposes Bar layout while keeping the Area facade outside its entry", () => {
  const p = bar(rows, basic).layoutSeries({ mode: "stack" });
  assert.equal(items(p).length, 6);
  assert.equal(p.createAreaPlot, undefined);
  assert.throws(() => p.layoutSeries({ mode: "center" }), /Centered bars/);
});


test("stacked Area lifecycle replays bounds, guides and source-based highlighting", () => {
  const p = area(rows, { layout: "stack", guides: {} });
  const incomplete = p.removeEncoding({ channel: "y2" });
  assert.equal(items(incomplete).length, 0);
  const restored = incomplete.encodeY2({ datum: 0 });
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  const resized = p.editCanvas({ width: 1200 });
  assert.notDeepEqual(items(resized)[0].properties.commands, items(p)[0].properties.commands);
  const recolored = p.highlightMarks({ select: { field: "series", op: "eq", value: "b" }, fill: "#123456" }).layoutSeries({ mode: "fill" });
  assert.equal(items(recolored)[1].properties.fill, "#123456");
  assert.deepEqual(recolored.resolvedScales.y.domain, [0, 1]);
  const scaled = p.editScale({ id: "y", domain: [0, 12] });
  assert.deepEqual(scaled.resolvedScales.y.domain, [0, 12]);
  assert.notDeepEqual(items(scaled)[0].properties.commands, items(p)[0].properties.commands);
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
  assertAtomicFailures(p, [{ operation: () => p.editSemantic({ property: "scale[y]", remove: true }) }]);
});

test("layout rejects incompatible mark families without mutation", () => {
  const point = base().createPointMark({ id: "p" }).encodeX({ field: "x" }).encodeY({ field: "value" });
  const horizon = base().createHorizonPlot({ x: "x", y: "value", groupBy: "series", guides: false });
  for (const p of [point, horizon]) assertAtomicFailures(p, [{ operation: () => p.layoutSeries({ mode: "stack" }) }]);
});


test("legacy centered semantic intent materializes like the canonical assignment", () => {
  const p = area(rows, { layout: "center", color: "series" });
  const legacy = structuredClone(layer(p));
  delete legacy.layout;
  delete legacy.encoding.y2;
  legacy.encoding.y.stack = "center";
  legacy.encoding.color.layout = "center";
  const resolved = resolveAreaMaterialization({ rows, layer: legacy, resolvedScales: p.resolvedScales, config: p.markConfigs.m });
  assert.deepEqual(resolved.paths, items(p).map(item => item.properties.commands));
  assert.deepEqual(resolved.fills, items(p).map(item => item.properties.fill));
});

test("Bar selection endpoints share geometry math with explicit domains and quantitative color", () => {
  const p = base().createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum", scale: { domain: [-2, 8] } }, guides: false })
    .encodeColor({ field: "tone", fieldType: "quantitative", aggregate: "mean" });
  const selections = resolveBarItems(p, layer(p), p.semanticSpec.datasets[0]);
  assert.equal(selections.length, items(p).length);
  assert.deepEqual(selections.map(item => item.channels.y), [0, 0, 0]);
  assert.deepEqual(selections.map(item => item.channels.y2), [3, 6, 4]);
});


test("shared range preflight preserves Rule temporal endpoint support", () => {
  const p = base([{ start: "2020-01-01", end: "2020-02-01" }, { start: "2020-03-01", end: "2020-04-01" }])
    .createRuleMark({ id: "m" })
    .encodeXRange({ lower: "start", upper: "end", fieldType: "temporal", temporalUnit: "auto" })
    .encodeYRange({ lower: "start", upper: "end", fieldType: "temporal", temporalUnit: "auto" });
  assert.equal(items(p).length, 2);
  assert.equal(layer(p).encoding.x2.field, "end");
  assert.equal(layer(p).encoding.y2.field, "end");
  assert.deepEqual(p.resolvedScales.x.domain, p.resolvedScales.y.domain);
});
