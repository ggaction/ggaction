import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { exportAccessibleData as out } from "../../../src/accessibility.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
const values = [{ id: "a", group: "A", x: 1, y: 2 }, { id: "b", group: "A", x: 2, y: 4 }, { id: "c", group: "B", x: 3, y: 6 }];
const base = (factory = chart) => factory().createCanvas({ width: 300, height: 240, margin: 20 }).createData({ id: "rows", keyField: "id", values });
const points = () => base().createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
const items = (p, target) => out(p, { format: "items", ...(target ? { target } : {}) }).views[0].items;

test("item snapshots retain final grain, all named selections and prior immutable programs", () => {
  const p = base().createBarPlot({ id: "bars", x: "group", y: { field: "y", aggregate: "mean" }, guides: false })
    .selectMarks({ id: "first", target: "bars", field: "group", op: "eq", value: "A" })
    .selectMarks({ id: "both", target: "bars", items: [], empty: "all" });
  const before = serializeProgram(p), result = out(p, { format: "items", target: "bars" });
  assert.deepEqual(result.views[0].childPath, []);
  assert.deepEqual(result.views[0].items.map(i => [i.channels.x, i.channels.y, i.channels.y2, i.selectedBy, i.visible]), [
    ["A", 0, 3, ["first", "both"], true], ["B", 0, 6, ["both"], true]
  ]);
  assert.deepEqual(result.views[0].items.map(i => i.key), getMarkItems(p, { target: "bars" }).map(i => i.key));
  assert.throws(() => result.views[0].items[0].selectedBy.push("fake"), TypeError);
  assert.throws(() => { result.views[0].items[0].fields.group = "bad"; }, TypeError);
  const next = p.filterMarks({ target: "bars", field: "group", op: "eq", value: "B" });
  assert.deepEqual(items(next).map(i => i.selectedBy), [["both"]]);
  assert.equal(result.views[0].items.length, 2); assert.equal(serializeProgram(p), before);
  assert.deepEqual(out(deserializeProgram(before), { format: "items" }), result);
});

test("logical visibility respects native filters while opacity and viewport clipping remain distinct", () => {
  const p = points().encodeOpacity({ target: "points", value: 0 }).editScale({ id: "x", domain: [10, 20] });
  assert.deepEqual(items(p).map(i => i.visible), [true, true, true]);
  const q = p.filterMarks({ target: "points", field: "id", op: "eq", value: "b" });
  assert.deepEqual(items(q).map(i => i.fields.id), ["b"]);
  assert.deepEqual(items(q.filterMarks({ target: "points", field: "id", op: "eq", value: "missing", mode: "replace" })), []);
});

test("nested repeated owners have exact inspected namespace keys and local selection IDs", () => {
  const p = points().selectMarks({ id: "picked", target: "points", field: "id", op: "eq", value: "a" });
  const nested = hconcat({ id: "outer", programs: [{ id: "nested", program: hconcat({ id: "inner", programs: [{ id: "left", program: p }, { id: "right", program: p }] }) }, { id: "plain", program: p }] });
  const result = out(nested, { format: "items" });
  assert.deepEqual(result.views.map(v => v.childPath), [["nested", "left"], ["nested", "right"], ["plain"]]);
  for (const view of result.views) {
    assert.deepEqual(view.items.map(i => i.key), getMarkItems(nested, { target: { childPath: view.childPath, id: "points" } }).map(i => i.key));
    assert.deepEqual(view.items.map(i => i.selectedBy), [["picked"], [], []]);
  }
  assert.equal(new Set(result.views.flatMap(v => v.items.map(i => i.key))).size, 9);
  assert.deepEqual(out(deserializeProgram(serializeProgram(nested)), { format: "items" }), result);
  assert.throws(() => out(nested, { format: "items", target: "points" }), /explicit child/);
});

test("composite components report authored selection names instead of generated child selections", () => {
  const p = base().createErrorBar({ id: "interval", x: { field: "group", fieldType: "nominal" }, y: { field: "y", center: "mean", extent: "stderr" } })
    .selectMarks({ id: "picked", target: "interval", field: "group", op: "eq", value: "A" }).highlightMarks({ selection: "picked", stroke: "red" });
  const result = out(p, { format: "items" });
  assert.equal(result.views.length, 1);
  assert.equal(new Set(result.views[0].items.map(i => i.component)).size, 3);
  assert.deepEqual(result.views[0].items.filter(i => i.fields.group === "A").map(i => i.selectedBy), [["picked"], ["picked"], ["picked"]]);
  assert.throws(() => out(p, { format: "items", target: "intervalLowerCap" }), /stable owner/);
});

test("focused hierarchy retains hidden logical nodes and native navigation without inventing pixel visibility", () => {
  const rows = [{ id: "r", parent: null }, { id: "a", parent: "r", value: 2 }, { id: "b", parent: "r", value: 4 }];
  const p = chart().createCanvas().createData({ id: "rows", keyField: "id", values: rows })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "value" }).layoutHierarchy({ id: "layout", method: "partition" })
    .createPartitionPlot({ id: "partition" }).selectMarks({ id: "picked", target: "partition", field: "id", op: "eq", value: "b" });
  const q = p.editPartitionPlot({ target: "partition", focus: { key: "a" } });
  const result = items(q);
  assert.deepEqual(result.map(i => [i.fields.id, i.visible, i.selectedBy]), [["r", false, []], ["a", true, []], ["b", false, ["picked"]]]);
  assert.equal(result[1].navigation.parent, result[0].navigation.key);
  assert.equal(result[1].navigation.nextSibling, result[2].navigation.key);
  assert.deepEqual(out(deserializeProgram(serializeProgram(q)), { format: "items" }), out(q, { format: "items" }));
});

test("Basic and standalone Text use native items while the default table contract stays unchanged", () => {
  const p = base(basic).createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  assert.equal(items(p).length, 3);
  assert.deepEqual(out(p, { format: "table" }), out(p));
  const text = base().createTextMark({ id: "note" }).encodeX({ datum: 1 }).encodeY({ datum: 2 }).encodeText({ value: "Readable text" });
  const result = items(text);
  assert.equal(result.length, 1); assert.equal(result[0].markType, "text");
  assert.equal(result[0].channels.text, "Readable text");
  assert.throws(() => out(text), /unsupported text/);
  assert.deepEqual(out(chart(), { format: "items" }), { schemaVersion: 1, format: "items", title: null, views: [] });
});

test("items fail closed for invalid options and incomplete owners without invoking option accessors", () => {
  for (const format of [null, false, "other", 1]) assert.throws(() => out(chart(), { format }), /format/);
  let calls = 0;
  assert.throws(() => out(chart(), { get format() { calls++; return "items"; } }), /own data/);
  assert.equal(calls, 0);
  assert.throws(() => out(chart(), { format: "items", target: "missing" }), /Unknown mark/);
  const p = points();
  assert.throws(() => out(p._clone({ graphicSpec: { ...p.graphicSpec, objects: {} } }), { format: "items" }), /not materialized/);
});

test("geographic representation aliases remain scoped while selectedBy follows the native current item", () => {
  const features = ids => ({ type: "FeatureCollection", features: ids.map((id, index) => ({ type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [40 + index * 60, 60] } })) });
  const p = chart().createCanvas({ width: 240, height: 180, margin: 0 })
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: features(["state"]) })
    .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: features([1, "1"]) })
    .createGeoLODData({ id: "regions", levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties", parents: [{ key: 1, parent: "state" }, { key: "1", parent: "state" }], enterZoom: 4.2, exitZoom: 3.8 }], zoom: 5 })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points", geometry: "regions", radiusPx: 9 });
  const original = items(p), selected = p.selectMarks({ id: "county", target: "points", items: [original[0].key] });
  const coarse = selected.editGeoLODData({ target: "regions", zoom: 3 });
  assert.deepEqual(items(coarse).map(i => i.selectedBy), [["county"]]);
  assert.ok(original.every(i => items(coarse)[0].representationKeys.includes(i.key)));
  const composite = hconcat({ programs: [{ id: "left", program: coarse }, { id: "right", program: coarse }] });
  const result = out(composite, { format: "items" });
  for (const view of result.views) assert.deepEqual(view.items[0].representationKeys, getMarkItems(composite, { target: { childPath: view.childPath, id: "points" } })[0].representationKeys);
  assert.equal(result.views[0].items[0].representationKeys.some(key => result.views[1].items[0].representationKeys.includes(key)), false);
  assert.deepEqual(items(coarse.editGeoLODData({ target: "regions", zoom: 5 })).map(i => i.selectedBy), [["county"], []]);
});

test("graph item roles and fields expose native nodes and edges without fabricated table rows", () => {
  const p = base().createInferredGraphData({ id: "graph", nodeKey: "id", ruleId: "same", rule: "group", options: { fields: ["group"] } })
    .layoutGraph({ id: "layout", method: "circular", options: { radius: 60 } }).createGraphPlot({ id: "network", origin: [120, 100], labels: {} });
  const result = items(p);
  assert.deepEqual(result.map(i => i.role), ["edge", "node", "node", "node"]);
  assert.deepEqual(result.slice(1).map(i => i.fields.key), ["a", "b", "c"]);
  assert.deepEqual(result.map(i => i.key), getMarkItems(p, { target: "network" }).map(i => i.key));
});

test("item export bounds cumulative output and preflights ownership work before resolution", () => {
  const p = points(), layer = p.semanticSpec.layers[0];
  const wide = p._clone({ semanticSpec: { ...p.semanticSpec, layers: Array(3163).fill(layer) } });
  assert.throws(() => out(wide, { format: "items" }), /Accessible item work must not exceed 10000000/);
  // A valid repeated child snapshot needs distinct scoped output for each occurrence.
  const shape = hconcat({ programs: [{ id: "a", program: p }, { id: "b", program: p }] }).compositionSpec;
  const repeated = p._clone({ compositionSpec: { ...shape, id: "repeat", children: Array.from({ length: 33334 }, (_, i) => `c${i}`) },
    children: Object.fromEntries(Array.from({ length: 33334 }, (_, i) => [`c${i}`, p])) });
  assert.throws(() => out(repeated, { format: "items" }), /Accessible item count must not exceed 100000/);
  assert.equal(items(p).length, 3);
});
