import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { projectGeoLabelEntries } from "../../../src/materialization/animation/geoLabels.js";
import { resolvePreparedSourceTextEntries } from "../../../src/materialization/textGeometry.js";
import { resolveMarkSourceItems } from "../../../src/materialization/selection/policies/index.js";

const point = (id, name, coordinates) => ({ type: "Feature", id, properties: { name }, geometry: { type: "Point", coordinates } });
const collection = features => ({ type: "FeatureCollection", features });
function base(features = [point("a", "Alpha", [40, 60]), point("b", "Beta", [120, 100])], geographic = false, mode = "Point") {
  return chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: geographic ? "geographic" : "planar", featureKey: "id", values: collection(features) })
    .createProjection({ id: "map", type: geographic ? "orthographic" : "identity", ...(geographic ? { scalePx: 100, translatePx: [200, 150] } : {}) })
    .createCoordinate({ id: "geo", type: "geo" })[`createGeo${mode}Mark`]({ id: "regions" });
}
const layer = (program, id = "regions-labels") => program.semanticSpec.layers.find(value => value.id === id);
const entries = (program, id) => projectGeoLabelEntries(program, layer(program, id));
const properties = values => values.map(value => value.graphic.properties);
const ast = root => ({ version: 2, registry: "standard@1", root });

test("source label preparation uses native offsets and exact resource identities without old pixels", () => {
  const program = base().createMarkLabels({ field: "name", dx: 3, dy: -2 });
  const original = serializeProgram(program), prepared = entries(program);
  assert.deepEqual(properties(prepared).map(p => [p.x, p.y, p.text]), [[3, -2, "Alpha"], [3, -2, "Beta"]]);
  assert.deepEqual(prepared.map(p => p.lineage), program.graphicSpec.objects["regions-labels"].items.map(p => p.identity.lineage));
  assert.deepEqual(prepared.map(p => p.key), program.graphicSpec.objects["regions-labels"].items.map(p => p.identity.key));
  assert.ok(prepared.every(value => value.sourceItem.key !== value.key && value.topology === "text"));
  assert.equal(Object.isFrozen(prepared), true); assert.equal(Object.isFrozen(prepared[0].graphic.properties), true);
  assert.equal(serializeProgram(program), original);
  const changedPixels = program.editGraphics({ target: "regions-labels", property: "x", value: [900, 950] });
  assert.deepEqual(entries(changedPixels), prepared);
});

test("projection-hidden source labels retain content while null features remain ineligible", () => {
  const program = base([point("hidden", "Back", [180, 0]), point("shown", "Front", [0, 0]),
    { type: "Feature", id: "empty", properties: { name: "None" }, geometry: null }], true).createMarkLabels({ field: "name" });
  assert.equal(program.graphicSpec.objects["regions-labels"].items.length, 1);
  assert.deepEqual(properties(entries(program)).map(p => p.text), ["Back", "Front"]);
  const clipped = program.editProjection({ clipExtentPx: [[0, 0], [1, 1]] });
  assert.equal(clipped.graphicSpec.objects["regions-labels"].items.length, 0);
  assert.deepEqual(properties(entries(clipped)), properties(entries(program)));
});

test("inline and named native selections select the source grain including hidden features", () => {
  const p = base([point("back", "Back", [180, 0]), point("front", "Front", [0, 0])], true);
  const inline = p.createMarkLabels({ field: "name", select: { field: "name", op: "eq", value: "Back" } });
  assert.deepEqual(properties(entries(inline)).map(p => p.text), ["Back"]);
  const named = p.selectMarks({ id: "chosen", target: "regions", field: "name", op: "eq", value: "Back" })
    .createMarkLabels({ field: "name", selection: "chosen" });
  assert.deepEqual(properties(entries(named)).map(p => p.text), ["Back"]);
  const edited = named.editMarkSelection({ selection: "chosen", field: "name", op: "eq", value: "Front" });
  assert.deepEqual(properties(entries(edited)).map(p => p.text), ["Front"]);
});

test("source inherited mappings and conditional Text keep native first-match and parameter meaning", () => {
  const p = base([point("back", "Back", [180, 0]), point("front", "Front", [0, 0])], true)
    .encodeColor({ field: "name", scale: { id: "colors", range: ["red", "blue"] } })
    .createParameter({ id: "on", value: true }).createMarkLabels({ field: "name", inheritColor: "fill" })
    .encodeText({ target: "regions-labels", conditions: [{ when: ast({ type: "parameter", id: "on" }), value: { field: "name" } }], otherwise: { value: "off" } });
  assert.deepEqual(properties(entries(p)).map(p => [p.text, p.fill]), [["Back", "red"], ["Front", "blue"]]);
  assert.deepEqual(properties(entries(p.editParameter({ target: "on", value: false }))).map(p => p.text), ["off", "off"]);
  const colored = p.encodeColor({ target: "regions-labels", conditions: [{ when: ast({ type: "literal", value: true }), value: { value: "green" } }], otherwise: { value: "orange" } });
  assert.deepEqual(properties(entries(colored)).map(p => p.fill), ["green", "green"]);
});

test("joined source rows and revised keyed order remain authoritative", () => {
  const p = base().removeMark({ target: "regions" }).createData({ id: "table", values: [{ code: "a", n: 1 }, { code: "b", n: 2 }], keyField: "code" })
    .createGeoJoinData({ id: "joined", geometry: "places", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "regions", geometry: "joined" }).createMarkLabels({ field: "n", format: ".1f" });
  const before = entries(p);
  assert.deepEqual(properties(before).map(p => p.text), ["1.0", "2.0"]);
  assert.deepEqual(before.map(p => p.rows[0].index), [0, 1]);
  const q = p.reviseData({ source: "table", id: "updated", values: [{ code: "b", n: 6 }, { code: "a", n: 5 }] });
  const after = entries(q);
  assert.deepEqual(properties(after).map(p => p.text), ["5.0", "6.0"]);
  assert.deepEqual(after.map(p => p.rows[0].index), [1, 0]);
  assert.deepEqual(after.map(p => p.key), before.map(p => p.key));
  assert.ok(after.every(p => p.lineage.resource.revision === 1));
});

test("generated graticule Text uses native axis selection and projection lineage", () => {
  const p = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [200, 150] })
    .createCoordinate({ type: "geo" }).createGraticule({ id: "grid", stepDeg: [30, 30], extentDeg: [[-30, -30], [30, 30]] })
    .createMarkLabels({ field: "value", format: ".0f", select: { field: "axis", op: "eq", value: "longitude" } });
  const prepared = entries(p, "grid-labels");
  assert.deepEqual(properties(prepared).map(p => p.text), ["-30", "0", "30"]);
  assert.ok(prepared.every(p => p.lineage.resource.kind === "projection"));
  assert.deepEqual(prepared.map(p => p.key), p.graphicSpec.objects["grid-labels"].items.map(p => p.identity.key));
});

test("cross-mark conditional membership uses the other owner's native rows and concrete properties", () => {
  const p = base().removeMark({ target: "regions" }).createData({ id: "table", values: [{ code: "a", n: 1 }, { code: "b", n: 2 }], keyField: "code" })
    .createGeoJoinData({ id: "joined", geometry: "places", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "regions", geometry: "joined" }).createGeoPointMark({ id: "other", geometry: "joined" })
    .selectMarks({ id: "raw", target: "other", field: "n", op: "eq", value: 1 })
    .selectMarks({ id: "painted", target: "other", property: "x", op: "gt", value: 100 })
    .createMarkLabels({ source: "regions", field: "n" });
  for (const [selection, expected] of [["raw", ["selected", "2"]], ["painted", ["1", "selected"]]]) {
    const q = p.encodeText({ target: "regions-labels", conditions: [{ when: { selection }, value: { value: "selected" } }], otherwise: { field: "n" } });
    assert.deepEqual(properties(entries(q)).map(p => p.text), expected);
  }
});

test("native placement is prepared relative to its explicit source origin", () => {
  const p = base().createMarkLabels({ field: "name", dx: 3, dy: -2, placement: { anchor: "center" } });
  const expected = p.graphicSpec.objects["regions-labels"].items.map((item, index) => [item.properties.x - [40, 120][index], item.properties.y - [60, 100][index]]);
  assert.deepEqual(properties(entries(p)).map(p => [p.x, p.y]), expected);
  assert.ok(entries(p).every(p => p.placement.sourceX === 0 && p.placement.sourceY === 0));
});

test("pending and empty labels do not invent Text while unrelated layers are rejected", () => {
  const pending = base().createTextMark({ id: "pending", source: "regions" });
  assert.deepEqual(entries(pending, "pending"), []);
  assert.deepEqual(entries(base([point("empty", "", [0, 0])]).createMarkLabels({ field: "name" })), []);
  const p = base().createMarkLabels({ field: "name" });
  assert.throws(() => projectGeoLabelEntries(p, { ...layer(p) }), /exact native/);
  assert.throws(() => projectGeoLabelEntries(p, layer(p, "regions")), /native geographic source/);
});

test("native field overrides and multiline Text are resolved before camera placement", () => {
  const p = base().createMarkLabels({ field: "name" }).editTextMark({ target: "regions-labels",
    textOverrides: [{ match: { fields: { name: "Alpha" } }, occurrence: 0, text: "A\nB" }] });
  const prepared = entries(p), native = p.graphicSpec.objects["regions-labels"].items;
  assert.deepEqual(properties(prepared).map(p => p.text), ["A\nB", "Beta"]);
  assert.deepEqual(properties(prepared)[0].lines, native[0].properties.lines);
  assert.deepEqual(prepared[0].fields, { name: "Alpha" });
});

test("line source stroke mappings and structured fill remain native values", () => {
  const shape = { type: "Feature", id: "line", properties: { name: "Route" }, geometry: { type: "LineString", coordinates: [[20, 30], [80, 30]] } };
  const p = base([shape], false, "Line")
    .encodeColor({ field: "name", scale: { id: "color", range: ["purple"] } })
    .createMarkLabels({ field: "name", inheritColor: "stroke" });
  assert.equal(properties(entries(p))[0].fill, "purple");
  const paint = { type: "linear-gradient", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }] };
  const q = base().createMarkLabels({ field: "name", fill: paint });
  assert.deepEqual(properties(entries(q))[0].fill, paint);
});

test("LOD source labels retain authored aliases and exact current resource revision", () => {
  const p = base().removeMark({ target: "regions" })
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: collection([point("s", "State", [40, 60])]) })
    .createGeoLODData({ id: "lod", zoom: 5, levels: [{ id: "state", geometry: "states" }, { id: "county", geometry: "places", enterZoom: 4, exitZoom: 3,
      parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }] }] })
    .createGeoPointMark({ id: "regions", geometry: "lod" }).createMarkLabels({ field: "name" });
  const before = entries(p), after = entries(p.editGeoLODData({ zoom: 2 }));
  assert.deepEqual(properties(after).map(p => p.text), ["State"]);
  assert.ok(before.every(item => after[0].representationKeys.includes(item.key)));
  assert.deepEqual(after[0].lineage.resource, { kind: "geometry", id: "lod", revision: 1 });
});

test("prepared Text retains real font bytes and exact queries after projection clipping", async () => {
  const p = base([point("a", "AB", [40, 60])]).createMarkLabels({ field: "name" });
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
  const exact = withFont.applyTextMetrics({ prepared: metrics, requestToken: "metrics" });
  const font = properties(entries(exact))[0].font;
  assert.equal(font.contentHash, expectedHash);
  assert.deepEqual(font, exact.graphicSpec.objects["regions-labels"].items[0].properties.font);
  const hidden = exact.editProjection({ clipExtentPx: [[0, 0], [1, 1]] });
  assert.equal(hidden.graphicSpec.objects["regions-labels"].items.length, 0);
  assert.deepEqual(properties(entries(hidden))[0].font, font);
  const unmeasured = hidden.editGeometryData({ values: collection([point("a", "ABC", [40, 60])]) });
  const original = serializeProgram(unmeasured), trace = unmeasured.trace;
  assert.throws(() => entries(unmeasured), error => error.assetCode === "metrics-required");
  const nativeLayer = layer(unmeasured), sourceItems = resolveMarkSourceItems(unmeasured, "regions");
  const definitions = resolvePreparedSourceTextEntries(unmeasured, nativeLayer, unmeasured.markConfigs[nativeLayer.id],
    new Map(sourceItems.map(item => [item.key, { x: 0, y: 0 }])), { resolveMarkItems: () => sourceItems }, { sourceOnly: true });
  assert.equal(definitions.length, 1); assert.equal(definitions[0].graphic, undefined);
  assert.deepEqual(definitions[0].sourceItem.lineage, sourceItems[0].lineage);
  assert.equal(serializeProgram(unmeasured), original); assert.equal(unmeasured.trace, trace);
});

test("private source-anchor preparation rejects malformed maps and preserves native resolver errors", () => {
  const p = base().createMarkLabels({ field: "name" }), text = layer(p), config = p.markConfigs[text.id];
  for (const anchors of [undefined, {}, new Map([[1, { x: 0, y: 0 }]]), new Map([["a", null]]), new Map([["a", { x: NaN, y: 0 }]])]) {
    assert.throws(() => resolvePreparedSourceTextEntries(p, text, config, anchors, {}), /explicit finite anchors/);
  }
  assert.throws(() => resolvePreparedSourceTextEntries(p, { ...text, source: undefined }, config, new Map(), {}), /explicit finite anchors/);
  assert.throws(() => resolvePreparedSourceTextEntries(p, text, config, new Map(), {}, { sourceOnly: null }), /explicit finite anchors/);
  const actual = resolveMarkSourceItems(p, "regions");
  const anchorMap = new Map(actual.map(item => [item.key, { x: 0, y: 0 }]));
  const resolvers = { resolveMarkItems: () => { throw new Error("source proof rejected"); } };
  assert.throws(() => resolvePreparedSourceTextEntries(p, text, config, anchorMap, resolvers), /source proof rejected/);
});
