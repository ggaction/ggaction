import test from "node:test";
import assert from "node:assert/strict";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems, inspectProgram, comparePrograms } from "../../../src/inspection.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { resolveGraphicBounds } from "../../../src/layout/canvas.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";

const source = (codes = ["B", "A", "C"], dx = 0) => ({ type: "FeatureCollection", features: codes.map((code, i) => ({
  type: "Feature", id: code, properties: { code, value: "geometry" }, geometry: { type: "Point", coordinates: [20 + i * 20 + dx, 40] }
})) });
const options = { geometryKey: ["properties", "code"], dataKey: "code" };
const resource = (program, id = "joined") => program.semanticSpec.resources.find(item => item.id === id);
const base = () => chart().createCanvas({ width: 200, height: 200, margin: 0 })
  .createData({ id: "table", values: [{ code: "A", value: 10 }, { code: "B", value: 20 }, { code: "extra", value: 90 }], keyField: "code" })
  .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: source() })
  .createGeoJoinData({ id: "joined", ...options });
const plotted = () => base().createProjection({ id: "map", type: "identity", fit: { width: 100, height: 100 } })
  .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" });

test("joined geometry retains source identity and stores exact typed input correspondence", () => {
  const p = base(), joined = resource(p), regions = resource(p, "regions"), dataset = p.semanticSpec.datasets[0];
  assert.deepEqual(joined.inputs, [{ kind: "geometry", id: "regions", revision: 0 },
    { kind: "data", id: "table", logicalId: dataset.logicalId, revision: 0 }]);
  assert.deepEqual(joined.result.rowMap, [1, 0, null]);
  assert.deepEqual(joined.result.features, regions.result.features);
  assert.deepEqual(joined.result.identity, regions.result.identity);
  assert.deepEqual(joined.result.diagnostics.unmatchedData, [2]);
  assert.equal(joined.result.diagnostics.coverage, 2 / 3);
  assert(joined.provenance.sourceRows.every(row => row.role === "geo-join" && row.data === "table"));
  assert.doesNotThrow(() => inspectProgram(p, { target: { kind: "geometry", id: "joined" } }));
  assert.equal(typeof basic().createGeoJoinData, "undefined"); assert.equal(typeof basic().editGeoJoinData, "undefined");
  assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec, p.semanticSpec);
});

test("join field consumers read table values while source properties and missing features remain intact", () => {
  const p = plotted(), items = getMarkItems(p, { target: "points" });
  assert.deepEqual(items.map(item => item.fields), [{ code: "B", value: 20 }, { code: "A", value: 10 }, {}]);
  assert.deepEqual(items.map(item => item.rows.length), [1, 1, 0]);
  assert.equal(resource(p).result.features[0].properties.value, "geometry");
  const selected = p.selectMarks({ target: "points", id: "high", field: "value", op: "gte", value: 15 });
  assert.deepEqual(resolveStoredSelection(selected, "high").keys, [items[0].key]);
});

test("table revisions rebuild joined and fitted consumers exactly once while preserving original state", () => {
  const p = plotted(), before = serializeProgram(p);
  const oldKeys = getMarkItems(p, { target: "points" }).map(item => item.key);
  const q = p.reviseData({ source: "table", id: "updated", values: [{ code: "C", value: 40 }, { code: "A", value: 30 }] });
  assert.equal(resource(q, "regions").revision, 0);
  for (const id of ["joined", "map"]) assert.equal(resource(q, id).revision, 1);
  assert.equal(resource(q).inputs[1].id, "updated"); assert.equal(resource(q, "map").inputs[0].revision, 1);
  assert.equal(q.semanticSpec.coordinates[0].projection.revision, 1);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.key), oldKeys);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.fields.value), [undefined, 30, 40]);
  assert.equal(serializeProgram(p), before); assert.notEqual(comparePrograms(p, q).equivalence, "equal");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("geometry revision rebuilds transitive join and fit branches with stable feature keys", () => {
  const p = plotted().createGeoJoinData({ id: "second", geometry: "joined", data: "table", ...options })
    .createProjection({ id: "second-map", type: "identity", fit: { geometry: "second", width: 50, height: 50 } });
  const keys = getMarkItems(p, { target: "points" }).map(item => item.key), before = serializeProgram(p);
  const q = p.editGeometryData({ target: "regions", values: source(["C", "A", "B"], 5) });
  for (const id of ["regions", "joined", "second", "map", "second-map"]) assert.equal(resource(q, id).revision, 1);
  assert.deepEqual(resource(q).result.rowMap, [null, 0, 1]);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.key), [...keys].reverse());
  assert.equal(serializeProgram(p), before);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(q)));
});

test("one table revision refreshes multiple joined projections and direct geometry consumers once", () => {
  const p = plotted().createGeoJoinData({ id: "second", geometry: "regions", data: "table", ...options })
    .createProjection({ id: "second-map", type: "identity", fit: { width: 80, height: 80 } })
    .createCoordinate({ id: "other", type: "geo" }).createGeoPointMark({ id: "other-points", geometry: "regions", coordinate: "other" });
  const q = p.reviseData({ source: "table", id: "updated", values: [{ code: "B", value: 2 }] });
  for (const id of ["joined", "second", "map", "second-map"]) assert.equal(resource(q, id).revision, 1);
  assert.equal(resource(q, "regions").revision, 0);
  assert.equal(q.semanticSpec.coordinates.find(item => item.id === "other").projection.revision, 1);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(q)));
});

test("join edits preserve omitted inputs and fail atomically for duplicate or cyclic replacements", () => {
  const p = plotted(), before = serializeProgram(p);
  const q = p.editGeoJoinData({ geometryKey: "id" });
  assert.equal(resource(q).revision, 1); assert.equal(resource(q, "map").revision, 1);
  assert.deepEqual(resource(q).result.rowMap, [1, 0, null]);
  for (const action of [() => p.editGeoJoinData({}), () => p.editGeoJoinData({ dataKey: undefined }),
    () => p.editGeoJoinData({ geometry: "joined" }), () => p.editGeometryData({ target: "joined", values: source() }),
    () => p.createGeoJoinData({ id: "joined", ...options }),
    () => p.reviseData({ source: "table", id: "bad", values: [{ code: "A" }, { code: "A" }] })]) {
    assert.throws(action); assert.equal(serializeProgram(p), before);
  }
  const duplicates = chart().createData({ id: "table", values: [{ code: "A" }, { code: "A" }] })
    .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", values: source() });
  assert.throws(() => duplicates.createGeoJoinData({ id: "joined", ...options }), error =>
    getErrorDetails(error).diagnostics.duplicateDataCount === 1);
});

test("null geometry and missing matches survive joins while live dependencies restrict removal", () => {
  const p = chart().createData({ id: "table", values: [] }).createGeometryData({ id: "null-shape", format: "geojson", coordinateKind: "planar",
    values: { type: "Feature", properties: null, geometry: null } }).createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" });
  assert.equal(resource(p).result.features[0].drawable, false); assert.deepEqual(resource(p).result.rowMap, [null]);
  assert.throws(() => p.removeResource({ kind: "geometry", id: "null-shape" }), /depend|use/i);
  assert.throws(() => p.removeData({ id: "table" }));
  assert.doesNotThrow(() => p.removeResource({ kind: "geometry", id: "joined" }).removeResource({ kind: "geometry", id: "null-shape" }));
});

test("offline restore rejects forged join correspondence, source shape, diagnostics and provenance", () => {
  const p = plotted(), before = serializeProgram(p);
  for (const mutate of [r => { r.result.rowMap[0] = 0; }, r => { r.result.rowMap[0] = -1; }, r => { r.result.rowMap.pop(); },
    r => { r.result.diagnostics.coverage = 1; }, r => { r.result.features[0].properties.code = "forged"; },
    r => { r.result.identity.revision++; }, r => { r.result.identity.extra = true; }, r => { r.result.coordinateKind = "geographic"; },
    r => { r.inputs[1].revision++; }, r => { r.inputs.reverse(); }, r => { r.provenance.sourceRows = []; },
    r => { r.options.dataKey = ["value"]; }, r => { r.options.method = "geo"; }, r => { r.result.extra = true; }]) {
    const envelope = JSON.parse(before), state = decodeValue(envelope.payload);
    mutate(resource({ semanticSpec: state.semanticSpec })); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(p), before);
});

test("topological joins retain shared arc references through offline table revisions", () => {
  const p = chart().createData({ id: "table", values: [{ code: "a", value: 3 }] })
    .createGeometryData({ id: "topology", format: "topojson", coordinateKind: "planar", featureKey: "id", values: {
      type: "Topology", arcs: [[[0, 0], [1, 1], [2, 0]]], objects: { roads: { type: "GeometryCollection", geometries: [
        { type: "LineString", id: "a", arcs: [0], properties: {} }, { type: "LineString", id: "b", arcs: [-1], properties: {} }
      ] } }
    } }).createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" });
  const q = deserializeProgram(serializeProgram(p)).reviseData({ source: "table", id: "next", values: [{ code: "b", value: 5 }] });
  assert.deepEqual(resource(q).result.topology, resource(p, "topology").result.topology);
  assert.deepEqual(resource(q).result.rowMap, [null, 0]);
  assert.deepEqual(resource(q).result.features[1].geometry.coordinates, [[2, 0], [1, 1], [0, 0]]);
  assert.equal(resource(q).revision, 1);
});

test("explicit join replacement adopts the new source identity and exact table without mutating old consumers", () => {
  const p = plotted().createData({ id: "other-table", values: [{ nested: { key: "X" }, value: 42 }] })
    .createGeometryData({ id: "other-regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: source(["X"]) });
  const before = serializeProgram(p), oldKeys = getMarkItems(p, { target: "points" }).map(item => item.key);
  const q = p.editGeoJoinData({ target: "joined", geometry: "other-regions", data: "other-table", geometryKey: "id", dataKey: ["nested", "key"] });
  assert.equal(resource(q).result.identity.logicalId, resource(q, "other-regions").result.identity.logicalId);
  assert.equal(getMarkItems(q, { target: "points" })[0].fields.value, 42);
  assert(!oldKeys.includes(getMarkItems(q, { target: "points" })[0].key));
  assert.equal(serializeProgram(p), before);
});

test("prepared table replacement validates its joined closure before commit and rejects stale receivers", async () => {
  const empty = chart().createCanvas({ width: 200, height: 200, margin: 0 });
  const csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
  const prepared = await prepareDataUpdate(empty, { kind: "create", id: "table", source: {
    kind: "named", name: "measurements", format: "csv", parse: { value: { type: "number" } } } },
  { requestToken: "initial", resolveNamed: async () => csv("code,value\nA,1") });
  const p = empty.applyDataUpdate({ prepared, requestToken: "initial" })
    .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: source() })
    .createGeoJoinData({ id: "joined", ...options }).createProjection({ id: "map", type: "identity", fit: { width: 100, height: 100 } })
    .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" });
  const before = serializeProgram(p);
  const next = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "updated" },
    { requestToken: "next", resolveNamed: async () => csv("code,value\nB,4") });
  const q = p.applyDataUpdate({ prepared: next, requestToken: "next" });
  assert.equal(resource(q).revision, 1); assert.equal(resource(q, "map").revision, 1);
  assert.deepEqual(resource(q).result.rowMap, [0, null, null]);
  assert.throws(() => p.editGeoJoinData({ dataKey: "code" }).applyDataUpdate({ prepared: next, requestToken: "next" }), /stale/);
  const invalid = await prepareDataUpdate(p, { kind: "revise", target: "table", id: "invalid" },
    { requestToken: "invalid", resolveNamed: async () => csv("code,value\nA,1\nA,2") });
  assert.throws(() => p.applyDataUpdate({ prepared: invalid, requestToken: "invalid" }), /unique/);
  assert.equal(serializeProgram(p), before);
});


test("joined projections and viewport-only route siblings advance once in one responsive source revision", () => {
  const rows = [{ code: "A", x: 0, y: 1000 }, { code: "B", x: 1, y: 2000 }];
  const p = chart().createCanvas({ width: 1000, height: 700, margin: 100 })
    .createData({ id: "table", values: rows, keyField: "code" })
    .createData({ id: "nodes", values: [{ code: "A" }, { code: "B" }] })
    .createData({ id: "edges", values: [{ from: "A", to: "B" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "code", source: "from", target: "to" })
    .layoutGraph({ id: "layout", graph: "graph", method: "circular" })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createScatterPlot({ id: "points", data: "table", x: "x", y: "y", guides: false })
    .createYAxis({ title: false }).editCanvas({ responsive: {} }).editYAxisLabels({ fontSize: 32 })
    .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id", values: source(["A", "B"]) })
    .createGeoJoinData({ id: "joined", geometry: "regions", data: "table", ...options })
    .createProjection({ id: "map", type: "identity", fit: { geometry: "joined", width: 1000, height: 700, padding: 200 } })
    .createCoordinate({ id: "geo", type: "geo", projection: "map" })
    .createGeoPointMark({ id: "map-points", geometry: "joined", coordinate: "geo" });
  const saved = serializeProgram(p), routes = resource(p, "routes");
  const q = p.reviseData({ source: "table", id: "updated", values: rows.map(row => ({ ...row, y: row.y * 100000 })) });
  assert.notDeepEqual(resolveGraphicBounds(q), resolveGraphicBounds(p));
  for (const id of ["joined", "map", "routes"]) assert.equal(resource(q, id).revision, resource(p, id).revision + 1);
  assert.equal(resource(q, "graph"), resource(p, "graph")); assert.equal(resource(q, "layout"), resource(p, "layout"));
  assert.deepEqual(resource(q, "routes").inputs, routes.inputs);
  assert.deepEqual(resource(q, "routes").result.viewport, resolveGraphicBounds(q));
  assert.deepEqual(getMarkItems(q, { target: "map-points" }).map(item => item.fields.y), [100000000, 200000000]);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(serializeProgram(p), saved);
});
