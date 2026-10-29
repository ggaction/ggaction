import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const values = [{ id: "a", x: 1, y: 2, c: 1 }, { id: "b", x: 2, y: 20, c: "1" }, { id: "c", x: 3, y: 4, c: 1 }, { id: "d", x: 4, y: 100, c: false }];
function base() {
  return chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ id: "rows", keyField: "id", values })
    .createScatterPlot({ id: "points", x: "x", y: "y", color: "c", guides: false }).createLegend({ target: "points", channels: ["color"] });
}
const request = extra => ({ target: "points", channel: "color", values: ["1"], visible: false, scaleDomain: "visible-data", ...extra });
const items = p => getMarkItems(p, { target: "points" });
const ids = p => items(p).map(item => item.fields.id);

test("visibility changes real final items while preserving typed categories, colors, source rows and lineage", () => {
  const p = base(), before = serializeProgram(p), colors = new Map(items(p).map(item => [item.fields.id, item.properties.fill]));
  const q = p.setMarkVisibility(request({ values: ["1", false] }));
  assert.deepEqual(ids(q), ["a", "c"]); assert.deepEqual(q.resolvedScales.y.domain, [2, 4]);
  assert.deepEqual(q.resolvedScales.color.domain, [1, "1", false]); assert.deepEqual(q.guideConfigs.legend.color.domain, [1, "1", false]);
  for (const item of items(q)) { assert.equal(item.properties.fill, colors.get(item.fields.id)); assert.equal(item.properties.opacity, undefined); }
  assert.deepEqual(items(q).map(item => item.rows.filter(row => row.data === "rows").map(row => row.index)), [[0], [2]]);
  assert.equal(q.semanticSpec.datasets[0], p.semanticSpec.datasets[0]); assert.equal(serializeProgram(p), before);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(q))), ["a", "c"]);
  assert.deepEqual(ids(q.removeMarkVisibility()), ["a", "b", "c", "d"]);
  assert.equal(q.removeMarkVisibility().semanticSpec.datasets.length, 1);
});

test("all-data uses the native filter result and removing either view preserves the other intent", () => {
  const p = base().filterMarks({ target: "points", field: "x", op: "lte", value: 3 });
  const q = p.setMarkVisibility(request({ scaleDomain: "all-data" }));
  assert.deepEqual(ids(q), ["a", "c"]); assert.deepEqual(q.resolvedScales.y.domain, [2, 20]);
  assert.deepEqual(q.guideConfigs.legend.color.domain, [1, "1"]);
  assert.deepEqual(ids(q.removeMarkVisibility()), ["a", "b", "c"]);
  assert.deepEqual(ids(q.removeMarkFilter()), ["a", "c", "d"]);
  const replaced = q.filterMarks({ target: "points", field: "x", op: "gte", value: 2, mode: "replace" });
  assert.deepEqual(ids(replaced), ["c", "d"]); assert.deepEqual(replaced.resolvedScales.y.domain, [4, 100]);
  assert.deepEqual(ids(replaced.removeMarkVisibility()), ["b", "c", "d"]);
  const hideFirst = base().setMarkVisibility(request()).filterMarks({ target: "points", field: "x", op: "lte", value: 3 });
  assert.deepEqual(ids(hideFirst), ["a", "c"]); assert.deepEqual(ids(hideFirst.removeMarkVisibility()), ["a", "b", "c"]);
});

test("visibility restores hidden categories and empty views retain control legends and valid domains", () => {
  const p = base(), hidden = p.setMarkVisibility(request({ values: [1, "1", false] }));
  assert.deepEqual(ids(hidden), []); assert.deepEqual(hidden.graphicSpec.objects.points.items, []);
  assert.deepEqual(hidden.guideConfigs.legend.color.domain, [1, "1", false]); assert.deepEqual(hidden.resolvedScales.y.domain, p.resolvedScales.y.domain);
  const shown = hidden.setMarkVisibility(request({ values: [1], visible: true })); assert.deepEqual(ids(shown), ["a", "c"]);
  const all = shown.setMarkVisibility(request({ values: ["1", false], visible: true })); assert.deepEqual(ids(all), ["a", "b", "c", "d"]);
  assert.equal(all.semanticSpec.datasets.length, 1);
  assert.equal(p.setMarkVisibility(request({ visible: true })).semanticSpec, p.semanticSpec);
  assert.equal(hidden.setMarkVisibility(request({ values: [1, "1", false] })).graphicSpec, hidden.graphicSpec);
});

test("source revisions keep both derived stages, original row provenance and new visible categories", () => {
  const p = base().filterMarks({ target: "points", field: "x", op: "gte", value: 2 }).setMarkVisibility(request());
  const next = values.map(row => ({ ...row, y: row.y * 10 })); next.push({ id: "e", x: 5, y: 7, c: "new" });
  const q = p.reviseData({ source: "rows", id: "updated", values: next });
  assert.deepEqual(ids(q), ["c", "d", "e"]);
  assert.deepEqual(items(q).map(item => item.rows.filter(row => row.data === "updated").map(row => row.index)), [[2], [3], [4]]);
  assert.deepEqual(ids(q.removeMarkVisibility()), ["b", "c", "d", "e"]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(q))), ["c", "d", "e"]);
});

test("invalid visibility and later filter failures preserve the exact earlier program and trace", () => {
  const p = base(), before = serializeProgram(p);
  for (const extra of [{ channel: "x" }, { values: ["unknown"] }, { values: [] }, { values: [null] }, { values: [1, 1] }, { visible: 0 }, { scaleDomain: undefined }, { scaleDomain: "auto" }]) assert.throws(() => p.setMarkVisibility(request(extra)));
  assert.throws(() => p.removeMarkVisibility());
  const q = p.setMarkVisibility(request()), snapshot = serializeProgram(q);
  assert.throws(() => q.filterMarks({ target: "points", property: "unknown", op: "eq", value: 1 }));
  assert.equal(serializeProgram(q), snapshot); assert.equal(serializeProgram(p), before);
  assert.equal(typeof basic().setMarkVisibility, "undefined"); assert.equal(typeof basic().removeMarkVisibility, "undefined");
});

test("histogram visibility preserves full bin partitions and independently restores native filter policies", () => {
  const rows = [{ x: 2, y: 4, c: "a" }, { x: 12, y: 6, c: "b" }, { x: 22, y: 8, c: "a" }, { x: 32, y: 10, c: "b" }];
  const p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ values: rows })
    .createBarPlot({ id: "bars", x: { field: "x", bin: { step: 10 }, scale: { nice: false, zero: false } }, y: { field: "y", aggregate: "sum" }, guides: false })
    .encodeColor({ field: "c" }).createLegend({ channels: ["color"] });
  const opt = { target: "bars", channel: "color", values: ["b"], visible: false, scaleDomain: "visible-data" };
  const intervals = q => getMarkItems(q, { target: "bars" }).map(item => [item.channels.x, item.channels.x2, item.channels.y2]);
  const q = p.setMarkVisibility(opt);
  assert.deepEqual(intervals(q), [[0, 10, 4], [20, 30, 8]]); assert.deepEqual(q.resolvedScales.x.domain, [0, 30]);
  const all = q.setMarkVisibility({ ...opt, scaleDomain: "all-data" }); assert.deepEqual(all.resolvedScales.x.domain, [0, 40]); assert.deepEqual(all.resolvedScales.y.domain, [0, 10]);
  assert.deepEqual(intervals(all.editCanvas({ width: 700 })), intervals(q));
  const filtered = q.filterMarks({ target: "bars", channel: "x", op: "gte", value: 10 });
  assert.deepEqual(intervals(filtered), [[20, 30, 8]]); assert.deepEqual(intervals(filtered.removeMarkVisibility()), [[10, 20, 6], [20, 30, 8], [30, 40, 10]]);
  const restored = filtered.removeMarkFilter().removeMarkVisibility(); assert.deepEqual(intervals(restored), intervals(p));
  assert.deepEqual(restored.semanticSpec.layers[0].encoding.x.bin, p.semanticSpec.layers[0].encoding.x.bin);
});

test("series visibility retains missing-value breaks, combined category mappings and source-owned label membership", () => {
  const rows = [{ x: 1, y: 2, c: "a" }, { x: 2, y: null, c: "a" }, { x: 3, y: 4, c: "a" }, { x: 1, y: 9, c: "b" }, { x: 3, y: 10, c: "b" }];
  const p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ id: "rows", values: rows })
    .createLineMark({ id: "lines", missing: "break" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "c" })
    .encodeColor({ field: "c" }).encodeStrokeDash({ field: "c" }).createLegend({ channels: ["color", "strokeDash"] });
  const q = p.setMarkVisibility({ channel: "strokeDash", values: ["b"], visible: false, scaleDomain: "all-data" });
  assert.equal(getMarkItems(q, { target: "lines" }).length, 1);
  assert.deepEqual(q.semanticSpec.datasets.at(-1).values, rows.slice(0, 3));
  assert.deepEqual(q.graphicSpec.objects.lines.items[0].properties.commands, p.graphicSpec.objects.lines.items[0].properties.commands);
  assert.deepEqual(q.resolvedScales.color.domain, ["a", "b"]); assert.deepEqual(q.resolvedScales.strokeDash.domain, ["a", "b"]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  const point = base().selectMarks({ id: "picked", field: "c", op: "eq", value: "1" }).highlightMarks({ selection: "picked", color: "red" })
    .createMarkLabels({ source: "points", id: "labels", field: "id" });
  const hidden = point.setMarkVisibility(request());
  assert.deepEqual(hidden.graphicSpec.objects.labels.items.map(item => item.properties.text), ["a", "c", "d"]);
  const restored = hidden.removeMarkVisibility();
  assert.deepEqual(restored.graphicSpec.objects.points, point.graphicSpec.objects.points);
  assert.deepEqual(new Map(restored.graphicSpec.objects.labels.items.map(item => [item.id, item.properties])),
    new Map(point.graphicSpec.objects.labels.items.map(item => [item.id, item.properties])));
});

test("a visibility recipe cannot survive a controlling field rebind and keeps explicit domains authoritative", () => {
  const p = base().editYScale({ domain: [0, 500] }).setMarkVisibility(request()); const snapshot = serializeProgram(p);
  assert.deepEqual(p.resolvedScales.y.domain, [0, 500]);
  for (const change of [q => q.encodeColor({ value: "red" }), q => q.encodeColor({ field: "id" }), q => q.removeEncoding({ channel: "color" })]) assert.throws(() => change(p), /Remove mark visibility/);
  assert.equal(serializeProgram(p), snapshot);
  assert.doesNotThrow(() => p.removeMarkVisibility().encodeColor({ field: "id" }));
});


test("editable restoration rejects corrupted visibility ownership, recipe and realized rows without replay", () => {
  const p = base().setMarkVisibility(request()), encoded = serializeProgram(p);
  for (const corrupt of [
    state => { delete state.materializationConfigs.marks.points.visibilityFilter; },
    state => { state.materializationConfigs.marks.points.visibilityFilter.source = "missing"; },
    state => { state.materializationConfigs.marks.points.visibilityFilter.empty = true; },
    state => { state.materializationConfigs.marks.points.visibilityFilter.unexpected = 1; },
    state => { delete state.materializationConfigs.rowProvenance.pointsVisibleData; },
    state => { state.semanticSpec.datasets.find(d => d.id === "pointsVisibleData").transform[0].visibility.hidden = [1]; },
    state => { state.semanticSpec.layers[0].encoding.color.field = "id"; },
    state => { state.semanticSpec.layers[0].data = "rows"; }
  ]) {
    const envelope = JSON.parse(encoded), state = decodeValue(envelope.payload); corrupt(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(deserializeProgram(encoded)), encoded); assert.equal(serializeProgram(p), encoded);
});


test("parameter DAG revisions refresh both filters, all-data domains and original typed row lineage", () => {
  const expression = { version: 2, registry: "standard@1", root: { type: "binary", op: "multiply", left: { type: "field", name: "y" }, right: { type: "parameter", id: "factor" } } };
  const p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ id: "rows", keyField: "id", values })
    .createParameter({ id: "factor", value: 2 }).createComputedData({ id: "computed", source: "rows", as: "scaled", expression })
    .createScatterPlot({ id: "points", data: "computed", x: "x", y: { field: "scaled", scale: { nice: false, zero: false } }, color: "c", guides: false })
    .createLegend({ channels: ["color"] }).filterMarks({ target: "points", field: "x", op: "lte", value: 3 }).setMarkVisibility(request({ scaleDomain: "all-data" }));
  const before = serializeProgram(p), q = p.editParameter({ target: "factor", value: 3 });
  assert.deepEqual(ids(q), ["a", "c"]); assert.deepEqual(q.resolvedScales.y.domain, [6, 60]);
  assert.deepEqual(items(q).map(item => item.rows.filter(row => row.data === "rows").map(row => row.index)), [[0], [2]]);
  assert.deepEqual(ids(q.removeMarkVisibility()), ["a", "b", "c"]);
  const stages = q.semanticSpec.datasets.filter(dataset => dataset.transform?.[0]?.type === "markFilter");
  assert.equal(stages.length, 2); assert.equal(stages[1].source, stages[0].id);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec); assert.equal(serializeProgram(p), before);
});

test("control legend order includes hidden categories while separate blocks retain their own ownership", () => {
  const p = base().editLegend({ order: { values: [false, "1", 1] } });
  const q = p.setMarkVisibility(request()); assert.deepEqual(q.guideConfigs.legend.color.domain, [false, "1", 1]);
  assert.deepEqual(ids(q), ["a", "c", "d"]);
  const multiple = base().encodeShape({ field: "c" }).createLegend({ channels: ["shape"] });
  const hidden = multiple.setMarkVisibility(request());
  assert.throws(() => hidden.setMarkVisibility(request({ channel: "shape", values: [1] })), /controlling legend block/);
  const independent = multiple.editLegend({ channel: "shape", order: { values: [false, "1", 1] } }).setMarkVisibility(request());
  assert.deepEqual(independent.guideConfigs.legend.color.domain, [1, "1", false]);
  assert.deepEqual(independent.guideConfigs.legend.series.domain, [false, 1]);
  const continuous = base().removeLegend().encodeColor({ field: "x", fieldType: "quantitative" }).createLegend({ channels: ["color"] });
  assert.throws(() => continuous.setMarkVisibility(request()), /categorical/);
});

test("retained visibility snapshots keep their original membership while a new view receives a distinct owner", () => {
  const p = base().setMarkVisibility(request());
  const retained = p.createComputedData({ id: "saved", source: "pointsVisibleData", as: "extra", expression: { version: 2, registry: "standard@1", root: { type: "literal", value: 1 } } });
  const q = retained.removeMarkVisibility().setMarkVisibility(request({ values: [1] }));
  assert.equal(q.semanticSpec.layers[0].data, "pointsVisibleData2");
  assert.deepEqual(q.semanticSpec.datasets.find(d => d.id === "pointsVisibleData").values.map(row => row.id), ["a", "c", "d"]);
  assert.deepEqual(ids(q), ["b", "d"]); assert.deepEqual(ids(q.removeMarkVisibility()), ["a", "b", "c", "d"]);
});


test("known dormant hidden categories can be restored after a source revision while unknown values still reject", () => {
  const p = base().setMarkVisibility(request()).reviseData({ source: "rows", id: "next", values: values.filter(row => row.id !== "b") });
  const q = p.setMarkVisibility(request()); assert.equal(q.semanticSpec, p.semanticSpec);
  assert.throws(() => p.setMarkVisibility(request({ values: ["never-seen"] })), /original category domain/);
  const restored = p.setMarkVisibility(request({ visible: true }));
  assert.equal(restored.markConfigs.points.visibilityFilter, undefined); assert.deepEqual(ids(restored), ["a", "c", "d"]);
});
