import test from "node:test";
import assert from "node:assert/strict";
import { chart, prepareDataUpdate, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";

const values = records => ({ type: "FeatureCollection", features: records.map(([id, value], i) => ({
  type: "Feature", id, properties: { value }, geometry: { type: "Point", coordinates: [20 + 20 * i, 40] }
})) });
const base = () => chart().createCanvas({ width: 480, height: 300, margin: { left: 0, right: 160, top: 0, bottom: 0 } })
  .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values([["a", 1], ["b", 4]]) });
const plotted = p => p.createProjection({ id: "map", type: "identity" }).createCoordinate({ id: "geo", type: "geo" }).createGeoPointMark({ id: "points" });
const ops = (node, op) => [...(node.op === op ? [node] : []), ...(node.children ?? []).flatMap(child => ops(child, op))];
const fills = p => p.graphicSpec.objects.points.items.map(item => item.properties.fill);

test("joined missing values require an explicit unknown and preserve unmatched feature geometry", () => {
  const p = plotted(base().createData({ id: "table", values: [{ code: "a", measure: 4 }] })
    .createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" }));
  const before = serializeProgram(p);
  assert.throws(() => p.encodeColor({ field: "measure", fieldType: "quantitative" }), /finite|number/);
  assert.equal(serializeProgram(p), before);
  const q = p.encodeColor({ field: "measure", fieldType: "quantitative", scale: { id: "color", domain: [0, 4], range: ["white", "black"], unknown: "red" } });
  assert.deepEqual(fills(q), ["#000000", "red"]); assert.equal(getMarkItems(q).length, 2);
  const r = q.reviseData({ source: "table", id: "updated", values: [{ code: "b", measure: 4 }] });
  assert.deepEqual(fills(r), ["red", "#000000"]);
  assert.equal(ops(r.trace.children.at(-1), "materializeGeoMark").length, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
});

test("geometry and active LOD changes recompute domains before one shared consumer union", () => {
  const p = base().createGeometryData({ id: "coarse", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values([["state", 8]]) })
    .createGeoLODData({ id: "lod", levels: [{ id: "state", geometry: "coarse" }, { id: "county", geometry: "regions", enterZoom: 4, exitZoom: 3,
      parents: [{ key: "a", parent: "state" }, { key: "b", parent: "state" }] }], zoom: 5 });
  const mapped = plotted(p).encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color", range: ["white", "black"] } })
    .createGeoPointMark({ id: "sibling", geometry: "regions" }).encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color" } });
  const q = mapped.editGeoLODData({ target: "lod", zoom: 2 });
  assert.deepEqual(q.resolvedScales.color.domain, [1, 8]);
  assert.deepEqual(ops(q.trace.children.at(-1), "materializeGeoMark").map(n => n.args.id).sort(), ["points", "sibling"]);
  assert.equal(ops(q.trace.children.at(-1), "rematerializeScale").filter(n => n.args.id === "color").length, 1);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.channels.color), [8]);
  const r = q.editGeometryData({ target: "regions", values: values([["a", 10], ["b", 12]]) });
  assert.deepEqual(r.resolvedScales.color.domain, [8, 12]);
  assert.deepEqual(ops(r.trace.children.at(-1), "materializeGeoMark").map(n => n.args.id).sort(), ["points", "sibling"]);
  assert.deepEqual(deserializeProgram(serializeProgram(r)).graphicSpec, r.graphicSpec);
});

test("geometry rebind and scoped style changes retain the exact field binding and source isolation", () => {
  const p = plotted(base()).encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color", range: ["white", "black"] } })
    .createGeometryData({ id: "other", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values([["c", 10], ["d", 20]]) });
  const q = p.editGeoPointMark({ target: "points", geometry: "other" });
  assert.deepEqual(q.resolvedScales.color.domain, [10, 20]); assert.deepEqual(fills(q), fills(p));
  const both = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: q }] });
  const edited = both.encodeColor({ target: { childPath: ["right"], id: "points" }, value: "red" });
  assert.deepEqual(fills(edited.children.left), fills(p)); assert.deepEqual(fills(edited.children.right), ["red", "red"]);
  assert.equal(edited.children.left.semanticSpec.layers[0].encoding.color.field, "value");
});

test("editable snapshots reject malformed or unresolved geographic mappings", () => {
  const p = plotted(base()).encodeColor({ field: "value", fieldType: "quantitative" });
  for (const mutate of [layer => { layer.encoding.color.field = "missing"; }, layer => { layer.encoding.color.scale = "missing"; },
    layer => { layer.encoding.color.fieldType = "unknown"; }, layer => { layer.encoding.color.aggregate = "sum"; },
    layer => { layer.encoding.size = { field: "value", fieldType: "temporal", scale: "color" }; }, layer => { layer.encoding.x = layer.encoding.color; }]) {
    const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.layers[0]); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("prepared source updates validate joined field mapping before committing the resource union", async () => {
  const empty = base(), csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
  const handle = await prepareDataUpdate(empty, { kind: "create", id: "table", source: { kind: "named", name: "measures", format: "csv", parse: { value: { type: "number" } } } },
    { requestToken: "create", resolveNamed: async () => csv("code,value\na,1\nb,4") });
  const p = plotted(empty.applyDataUpdate({ prepared: handle, requestToken: "create" }).createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" }))
    .encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color", range: ["white", "black"] } });
  const before = serializeProgram(p), trace = p.trace;
  const invalid = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "updated" }, { requestToken: "missing", resolveNamed: async () => csv("code,value\na,10") });
  assert.throws(() => p.applyDataUpdate({ prepared: invalid, requestToken: "missing" }), /finite|number/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  const valid = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "updated" }, { requestToken: "valid", resolveNamed: async () => csv("code,value\na,10\nb,20") });
  const q = p.applyDataUpdate({ prepared: valid, requestToken: "valid" });
  assert.deepEqual(q.resolvedScales.color.domain, [10, 20]); assert.deepEqual(fills(q), fills(p));
  assert.equal(ops(q.trace.children.at(-1), "materializeGeoMark").length, 1);
});


test("restored geographic scale roles and fallbacks are validated without rematerializing", () => {
  const p = plotted(base()).encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color" } });
  for (const mutate of [state => { delete state.resolvedScales.color; },
    state => { state.semanticSpec.layers[0].encoding.color.fieldType = "nominal"; },
    state => { state.semanticSpec.scales[0].unknown = -1; },
    state => { state.semanticSpec.scales[0].type = "linear"; state.resolvedScales.color.type = "linear"; }]) {
    const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
    mutate(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("geometry revisions update ordinary point siblings through their shared color scale once", () => {
  const p = plotted(base()).encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color", range: ["white", "black"] } })
    .createData({ id: "data", values: [{ x: 1, y: 2, value: 5 }, { x: 2, y: 3, value: 12 }] })
    .createCoordinate({ id: "cart", type: "cartesian" }).createPointMark({ id: "native", data: "data" })
    .encodeX({ field: "x", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" })
    .encodeColor({ field: "value", fieldType: "quantitative", scale: { id: "color" } });
  assert.deepEqual(p.resolvedScales.color.domain, [1, 12]);
  const q = p.editGeometryData({ target: "regions", values: values([["a", 20], ["b", 40]]) });
  assert.deepEqual(q.resolvedScales.color.domain, [5, 40]);
  assert.equal(q.graphicSpec.objects.native.items[0].properties.fill, "#ffffff");
  assert.equal(ops(q.trace.children.at(-1), "materializeGeoMark").length, 1);
  assert.equal(ops(q.trace.children.at(-1), "rematerializePointMark").length, 1);
  assert.equal(ops(q.trace.children.at(-1), "rematerializeScale").filter(node => node.args.id === "color").length, 1);
});
