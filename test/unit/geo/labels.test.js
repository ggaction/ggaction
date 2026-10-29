import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";

const feature = (id, name, geometry = { type: "Point", coordinates: [40, 60] }) => ({ type: "Feature", id, properties: { name }, geometry });
const values = (...features) => ({ type: "FeatureCollection", features });
const point = (x, y) => ({ type: "Point", coordinates: [x, y] });
function base(input = values(feature("a", "Alpha"), feature("b", "Beta", point(120, 100))), mode = "Point") {
  return chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: input })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ id: "geo", type: "geo" })
    [`createGeo${mode}Mark`]({ id: "regions" });
}
const properties = (p, id = "regions-labels") => p.graphicSpec.objects[id].items.map(item => item.properties);
const ops = (node, op) => [...(node.op === op ? [node] : []), ...(node.children ?? []).flatMap(child => ops(child, op))];

test("geographic labels use feature centroids and resource identity without a dataset", () => {
  const p = base(values(feature("a", "Pair", { type: "MultiPoint", coordinates: [[20, 40], [60, 80]] }), feature("empty", "None", null)))
    .createMarkLabels({ field: "name", dx: 3, dy: -2 });
  assert.deepEqual(properties(p).map(p => [p.x, p.y, p.text]), [[43, 58, "Pair"]]);
  assert.equal(p.semanticSpec.datasets.length, 0);
  const layer = p.semanticSpec.layers.find(layer => layer.id === "regions-labels");
  assert.equal(layer.data, undefined); assert.equal(layer.source, "regions"); assert.equal(layer.coordinate, "geo");
  assert.deepEqual(Object.keys(layer.encoding), ["text"]);
  const graphic = p.graphicSpec.objects['regions-labels'].items[0];
  assert.deepEqual(graphic.identity.lineage, { kind: "resource", resource: { kind: "geometry", id: "places", revision: 0 } });
  assert.deepEqual(getMarkItems(p, { target: "regions-labels" })[0].rows, []);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("shape and line labels use their centroid rather than first component or path endpoint", () => {
  const shape = base(values(feature("s", "Box", { type: "Polygon", coordinates: [[[20, 20], [100, 20], [100, 60], [20, 60], [20, 20]]] })), "Shape")
    .createMarkLabels({ field: "name", placement: { anchor: "center" } });
  assert.deepEqual(properties(shape).map(p => [p.x, p.y]), [[60, 40]]);
  const line = base(values(feature("l", "Route", { type: "LineString", coordinates: [[20, 30], [80, 30]] })), "Line").createMarkLabels({ field: "name" });
  assert.deepEqual(properties(line).map(p => [p.x, p.y]), [[50, 30]]);
  assert.throws(() => shape.editMarkLabelPlacement({ placement: { anchor: "outsideEnd" } }), /anchor|placement/);
});

test("generated graticule labels preserve native axis/value features and projection lineage", () => {
  const p = chart().createCanvas({ width: 400, height: 300, margin: 0 }).createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [200, 150] })
    .createCoordinate({ type: "geo" }).createGraticule({ id: "grid", stepDeg: [30, 30], extentDeg: [[-30, -30], [30, 30]] })
    .createMarkLabels({ field: "value", format: ".0f", select: { field: "axis", op: "eq", value: "longitude" } });
  assert.deepEqual(properties(p, "grid-labels").map(p => p.text), ["-30", "0", "30"]);
  assert.ok(properties(p, "grid-labels").every(p => Math.abs(p.y - 150) < 1e-9));
  const children = p.graphicSpec.objects["grid-labels"].items;
  assert.ok(children.every(child => child.identity.lineage.resource.kind === "projection"));
  const q = p.editProjection({ translatePx: [210, 160] });
  assert.deepEqual(q.graphicSpec.objects["grid-labels"].items.map(item => item.identity.key), children.map(item => item.identity.key));
  assert.ok(q.graphicSpec.objects["grid-labels"].items.every(item => item.identity.lineage.resource.revision === 1));
});

test("geometry and projection edits refresh labels once, preserve keys and reject invalid content atomically", () => {
  const p = base(values(feature("a", 1), feature("b", 2, point(120, 100)))).createMarkLabels({ field: "name", format: ".1f" });
  const original = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editGeometryData({ values: values(feature("a", "bad")) }), /finite|number|format|numeric/i);
  assert.equal(serializeProgram(p), original); assert.equal(p.trace, trace);
  const q = p.editGeometryData({ values: values(feature("b", 4, point(140, 120)), feature("a", 3, point(50, 70))) });
  assert.deepEqual(properties(q).map(p => [p.x, p.y, p.text]), [[140, 120, "4.0"], [50, 70, "3.0"]]);
  assert.deepEqual(getMarkItems(q, { target: "regions-labels" }).map(item => item.key), getMarkItems(p, { target: "regions-labels" }).map(item => item.key).reverse());
  assert.equal(ops(q.trace.children.at(-1), "rematerializeTextMark").length, 1);
  assert.deepEqual(properties(q.editGeometryData({ values: values() })), []);
  const moved = q.editProjection({ scalePx: 2, translatePx: [5, 10] });
  assert.deepEqual(properties(moved).map(p => [p.x, p.y]), [[285, 250], [105, 150]]);
  assert.deepEqual(deserializeProgram(serializeProgram(moved)).graphicSpec, moved.graphicSpec);
});

test("named source selection and label highlighting preserve native membership and edit lifecycle", () => {
  const p = base().selectMarks({ id: "chosen", target: "regions", field: "name", op: "eq", value: "Alpha" })
    .createMarkLabels({ field: "name", selection: "chosen" });
  assert.deepEqual(properties(p).map(p => p.text), ["Alpha"]);
  const q = p.editMarkSelection({ selection: "chosen", field: "name", op: "eq", value: "Beta" });
  assert.deepEqual(properties(q).map(p => p.text), ["Beta"]);
  const selected = q.selectMarks({ id: "labels", target: "regions-labels", field: "name", op: "eq", value: "Beta" })
    .highlightMarks({ selection: "labels", fill: "red", bringToFront: true });
  assert.equal(properties(selected)[0].fill, "red");
  assert.throws(() => selected.removeMarkSelection({ selection: "chosen" }), /used|referenc|label/i);
  assert.equal(selected.removeMarkLabels({ source: "regions" }).semanticSpec.layers.length, 1);
  assert.equal(selected.removeMark({ target: "regions" }).semanticSpec.layers.length, 0);
});

test("labels retain original LOD keys as aliases while current hit identity belongs to the visible feature", () => {
  const p = base().removeMark({ target: "regions" })
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(feature("s", "State")) })
    .createGeoLODData({ id: "lod", zoom: 5, levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "places", enterZoom: 4, exitZoom: 3,
      parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }] }] })
    .createGeoPointMark({ id: "regions", geometry: "lod" }).createMarkLabels({ field: "name" });
  const key = getMarkItems(p, { target: "regions-labels" })[0].key;
  const selected = p.selectMarks({ id: "one", target: "regions-labels", items: [key] });
  const q = selected.editGeoLODData({ zoom: 2 });
  assert.deepEqual(properties(q).map(p => p.text), ["State"]);
  assert.notEqual(getMarkItems(q, { target: "regions-labels" })[0].key, key);
  assert.equal(resolveStoredSelection(q, "one").keys.length, 1);
  assert.equal(resolveStoredSelection(q.editGeoLODData({ zoom: 5 }), "one").keys[0], key);
});

test("malformed geographic label ownership is rejected on restoration and Basic cannot infer Geo", () => {
  const p = base().createMarkLabels({ field: "name" }), serialized = serializeProgram(p);
  for (const patch of [{ data: "fake" }, { coordinate: "missing" }, { source: "regions-labels" }, { encoding: { x: { datum: 1 }, text: { datum: "bad", format: "auto" } } }]) {
    const snapshot = JSON.parse(serialized), state = decodeValue(snapshot.payload);
    Object.assign(state.semanticSpec.layers.find(layer => layer.id === "regions-labels"), patch);
    snapshot.payload = encodeValue(state); assert.throws(() => deserializeProgram(JSON.stringify(snapshot)));
  }
  assert.throws(() => basic().createTextMark({ source: "regions" }), /source|mark/i);
  assert.throws(() => p.createTextMark({ id: "bad", source: "regions", data: "fake" }), /mutually exclusive/);
  assert.throws(() => p.createMarkLabels({ id: "bad", source: "regions" }), /Bar or Arc/);
  assert.throws(() => p.encodeX({ target: "regions-labels", value: 3 }), /source|position|value/i);
});

test("joined labels keep actual table rows, conditional content and parameter revisions", () => {
  const p = base().removeMark({ target: "regions" }).createData({ id: "table", values: [{ code: "a", n: 1 }, { code: "b", n: 2 }], keyField: "code" })
    .createGeoJoinData({ id: "joined", geometry: "places", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "regions", geometry: "joined" })
    .createParameter({ id: "on", value: true }).createMarkLabels({ source: "regions", field: "n", format: ".1f" })
    .encodeText({ target: "regions-labels", conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "on" } }, value: { field: "n", format: ".0f" } }], otherwise: { value: "off", format: "auto" } });
  assert.deepEqual(properties(p).map(p => p.text), ["1", "2"]);
  assert.ok(getMarkItems(p, { target: "regions-labels" }).every(item => item.rows.some(row => row.data === "table")));
  assert.deepEqual(properties(p.editParameter({ target: "on", value: false })).map(p => p.text), ["off", "off"]);
  const q = p.reviseData({ source: "table", id: "updated", values: [{ code: "a", n: 5 }, { code: "b", n: 6 }] });
  assert.deepEqual(properties(q).map(p => p.text), ["5", "6"]);
  assert.equal(ops(q.trace.children.at(-1), "rematerializeTextMark").length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(resolveStoredSelection(p.selectMarks({ id: "source-row", target: "regions", rows: { data: "table", indices: [0] } }), "source-row").keys.length, 1);
  const highlighted = p.selectMarks({ id: "first-row", target: "regions-labels", rows: { data: "table", indices: [0] } })
    .highlightMarks({ selection: "first-row", fill: "red", bringToFront: true });
  assert.deepEqual(properties(highlighted).map(item => [item.text, item.fill]), [["2", "#334155"], ["1", "red"]]);
  assert.equal(getMarkItems(highlighted, { target: "regions-labels" })[1].rows[0].index, 0);
  const snapshot = JSON.parse(serializeProgram(q)), state = decodeValue(snapshot.payload);
  state.semanticSpec.resources.find(resource => resource.id === "joined").provenance.sourceRows[0].revision = 0;
  snapshot.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(snapshot)), /source|provenance|revision|inconsistent|stale/i);

});

test("label colors inherit geographic source mappings and collision layout replays after projection edits", () => {
  const p = base(values(feature("a", "Alpha", point(80, 80)), feature("b", "Beta", point(80, 80))))
    .encodeColor({ field: "name", scale: { id: "colors", range: ["red", "blue"] } })
    .createMarkLabels({ field: "name", inheritColor: "fill", layout: { axis: "y", maxDisplacement: 40, leader: {} } });
  assert.deepEqual(properties(p).map(p => p.fill), ["red", "blue"]);
  assert.notEqual(properties(p)[0].y, properties(p)[1].y);
  const q = p.editScale({ id: "colors", range: ["green", "orange"] }).editProjection({ translatePx: [10, 20] });
  assert.deepEqual(properties(q).map(p => p.fill), ["green", "orange"]);
  assert.deepEqual(properties(q).map(p => p.x), [90, 90]);
  assert.equal(properties(q.editProjection({ clipExtentPx: [[0, 0], [1, 1]] })).length, 0);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("explicit Geo source inference remains unique with unrelated table context and scoped composition", () => {
  const p = base().createData({ id: "unrelated", values: [{ name: "Wrong" }] })
    .createMarkLabels({ field: "name", opacity: 0.8, outline: { color: "white", width: 2 } });
  assert.deepEqual(properties(p).map(p => p.text), ["Alpha", "Beta"]);
  assert.ok(properties(p).every(p => p.outline.color === "white" && p.opacity === 0.8));
  const joined = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const q = joined.editTextMark({ target: { childPath: ["left"], id: "regions-labels" }, fill: "red" });
  assert.deepEqual(properties(q.children.left).map(p => p.fill), ["red", "red"]);
  assert.deepEqual(properties(q.children.right).map(p => p.fill), ["#334155", "#334155"]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});


test("prepared fonts and themes retain the native Text owner across geographic source changes", async () => {
  const p = base(values(feature("a", "AB"))).createMarkLabels({ field: "name" });
  const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const expectedHash = createHash("sha256").update(bytes).digest("hex");
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const prepared = await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:labels", expectedHash,
    mimeType: "font/ttf", family: "sans-serif", style: "normal", weight: 400, metricsProviderVersion: "fixture@1" },
    { requestToken: "font", load: () => ({ bytes, mimeType: "font/ttf" }), decode });
  const withFont = p.createFontResource({ prepared, requestToken: "font" });
  const metrics = await prepareTextMetrics(withFont, { id: "exact", fonts: ["font"] }, { requestToken: "metrics", decode,
    measure: ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
      widths: queries.map(({ text, fontSize }) => text.length * .6 * fontSize) }) });
  const exact = withFont.applyTextMetrics({ prepared: metrics, requestToken: "metrics" }), saved = serializeProgram(exact);
  assert.equal(properties(exact)[0].font.contentHash, expectedHash);
  assert.throws(() => exact.editGeometryData({ values: values(feature("a", "ABC")) }), error => error.assetCode === "metrics-required");
  assert.equal(serializeProgram(exact), saved);
  assert.equal(properties(exact.editProjection({ translatePx: [10, 20] }))[0].font.contentHash, expectedHash);
  const themed = p.applyTheme({ theme: { base: "dark", tokens: { fontSize: 20 } } });
  assert.equal(properties(themed)[0].fontSize, 20); assert.equal(properties(themed)[0].fill, "#e2e8f0");
  assert.deepEqual(properties(themed.removeTheme()), properties(p));
});


test("stored geographic Text rejects field, content and inherited-coordinate corruption", () => {
  const p = base().createMarkLabels({ field: "name" }), original = serializeProgram(p);
  for (const patch of [
    { transform: [] }, { encoding: { text: { field: "missing", format: "auto" } } },
    { encoding: { text: { content: "value", format: "auto" } } },
    { conditionals: { dx: { otherwise: { datum: 1 }, conditions: [] } } }
  ]) {
    const snapshot = JSON.parse(original), state = decodeValue(snapshot.payload);
    Object.assign(state.semanticSpec.layers.find(layer => layer.id === "regions-labels"), patch);
    snapshot.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(snapshot)));
  }
  const constant = base().createMarkLabels({ value: "Everywhere" });
  assert.deepEqual(properties(constant).map(item => item.text), ["Everywhere", "Everywhere"]);
  const pending = base().createTextMark({ id: "pending", source: "regions" });
  assert.deepEqual(deserializeProgram(serializeProgram(pending)).graphicSpec, pending.graphicSpec);
  assert.equal(serializeProgram(p), original);
});

test("a visible clipped feature has no label when its semantic centroid is outside the viewport", () => {
  const p = base(values(feature("line", "Route", { type: "LineString", coordinates: [[0, 10], [100, 10]] })), "Line")
    .editProjection({ clipExtentPx: [[0, 0], [20, 20]] }).createMarkLabels({ field: "name" });
  assert.equal(getMarkItems(p, { target: "regions" }).length, 1);
  assert.deepEqual(getMarkItems(p, { target: "regions-labels" }), []);
  const q = p.editProjection({ clipExtentPx: null });
  assert.deepEqual(properties(q).map(item => [item.x, item.y, item.text]), [[50, 10, "Route"]]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});
