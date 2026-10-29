import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { inspectProgram, comparePrograms } from "../../../src/inspection.js";
import { PROJECTION_DESCRIPTORS } from "../../../src/grammar/geo/projectionOptions.js";
import { resolveGraphicBounds } from "../../../src/layout/canvas.js";

const line = (x = 10, y = 20) => ({ type: "LineString", coordinates: [[0, 0], [x, y]] });
const source = (kind = "planar", values = line()) => chart().createGeometryData({ id: "shape", format: "geojson", coordinateKind: kind, values });
const stored = (program, id = "map") => program.semanticSpec.resources.find(resource => resource.id === id);
const fitted = () => source().createProjection({ id: "map", type: "identity", fit: { width: 100, height: 100 } });

test("all fifteen named projections store native definitions without callback state or graphics", () => {
  for (const { type } of PROJECTION_DESCRIPTORS) {
    const program = chart().createProjection({ id: "map", type }), resource = stored(program);
    assert.equal(resource.kind, "projection"); assert.equal(resource.options.type, type);
    assert.deepEqual(resource.result, {}); assert.deepEqual(resource.inputs, []);
    assert.deepEqual(program.graphicSpec.order, []);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec);
  }
  assert.equal(typeof basic().createProjection, "undefined"); assert.equal(typeof basic().editProjection, "undefined");
});

test("explicit fit stores an exact geometry ref and independent literal bounds", () => {
  const request = { width: 100, height: 100 }, program = source().createProjection({ id: "map", type: "identity", fit: request });
  request.width = 1;
  assert.deepEqual(stored(program).result, { scalePx: 5, translatePx: [25, 0], bounds: [25, 0, 75, 100] });
  assert.deepEqual(stored(program).inputs, [{ kind: "geometry", id: "shape", revision: 0 }]);
  assert.equal(Object.hasOwn(stored(program).options, "scalePx"), false);
  assert.equal(Object.hasOwn(stored(program).options.fit, "geometry"), false);
  assert.ok(Object.isFrozen(stored(program).result.translatePx));
  assert.doesNotThrow(() => inspectProgram(program, { target: { kind: "projection", id: "map" } }));
});

test("geometry edits revise every fitted projection once and preserve unrelated projections", () => {
  const base = fitted().createProjection({ id: "small", type: "identity", fit: { geometry: "shape", width: 50, height: 50 } })
    .createProjection({ id: "free", type: "mercator" }), before = serializeProgram(base);
  const next = base.editGeometryData({ target: "shape", values: line(20, 20) });
  for (const id of ["shape", "map", "small"]) assert.equal(stored(next, id).revision, 1);
  assert.equal(stored(next, "free"), stored(base, "free"));
  assert.deepEqual(stored(next).result.bounds, [0, 0, 100, 100]);
  assert.deepEqual(stored(next, "small").result.bounds, [0, 0, 50, 50]);
  assert.equal(stored(next).inputs[0].revision, 1);
  assert.equal(serializeProgram(base), before);
  assert.notEqual(comparePrograms(base, next).equivalence, "equal");
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(next)));
});

test("failed fit and incompatible geometry revisions reject the entire closure atomically", () => {
  const base = fitted().createProjection({ id: "free", type: "mercator" }), before = serializeProgram(base);
  for (const patch of [{ coordinateKind: "geographic" }, { values: { type: "GeometryCollection", geometries: [] } },
    { values: { type: "Point", coordinates: [Number.MAX_VALUE, Number.MAX_VALUE] } }]) {
    assert.throws(() => base.editGeometryData({ target: "shape", ...patch }));
    assert.equal(serializeProgram(base), before);
  }
  assert.throws(() => base.editProjection({ target: "map", type: "mercator" }), /incompatible/);
  assert.equal(serializeProgram(base), before);
});

test("shape edits retain fit while explicit transforms detach its geometry dependency", () => {
  const base = fitted(), reflected = base.editProjection({ reflectX: true });
  assert.deepEqual(stored(reflected).result.translatePx, [75, 0]);
  const explicit = reflected.editProjection({ scalePx: 2 });
  assert.deepEqual(stored(explicit).inputs, []); assert.deepEqual(stored(explicit).result, {});
  assert.equal(stored(explicit).options.scalePx, 2); assert.deepEqual(stored(explicit).options.translatePx, [75, 0]);
  assert.equal(Object.hasOwn(stored(explicit).options, "fit"), false);
  const removed = explicit.removeResource({ kind: "geometry", id: "shape" });
  assert.equal(stored(removed).revision, 2);
  const changedType = removed.editProjection({ type: "orthographic", rotateDeg: [20, 0] });
  assert.equal(stored(changedType).options.scalePx, 150); assert.equal(stored(changedType).options.reflectX, false);
  assert.deepEqual(stored(changedType).options.rotateDeg, [20, 0, 0]);
});

test("point-only fit uses an explicit pointScale or the current transform", () => {
  const base = source("planar", { type: "Point", coordinates: [10, 20] })
    .createProjection({ id: "map", type: "identity", scalePx: 4 });
  const inherited = base.editProjection({ fit: { width: 100, height: 100 } });
  assert.equal(stored(inherited).result.scalePx, 4); assert.deepEqual(stored(inherited).result.translatePx, [10, -30]);
  const explicit = inherited.editProjection({ fit: { width: 100, height: 100, pointScale: 2 } });
  assert.equal(stored(explicit).result.scalePx, 2); assert.deepEqual(stored(explicit).result.bounds, [50, 50, 50, 50]);
});

test("fitted geometry can be rebound explicitly without retaining the old source", () => {
  const base = fitted().createGeometryData({ id: "other", format: "geojson", coordinateKind: "planar", values: line(20, 20) });
  const next = base.editProjection({ fit: { geometry: "other", width: 100, height: 100, padding: 10 } });
  assert.deepEqual(stored(next).inputs, [{ kind: "geometry", id: "other", revision: 0 }]);
  assert.deepEqual(stored(next).result.bounds, [10, 10, 90, 90]);
  assert.doesNotThrow(() => next.removeResource({ kind: "geometry", id: "shape" }));
  assert.throws(() => next.removeResource({ kind: "geometry", id: "other" }), /depend|refer|use/);
  assert.throws(() => next.removeResource({ kind: "geometry", id: "other", cascade: true }), /dependent/);
  const removed = next.removeResource({ kind: "projection", id: "map" }).removeResource({ kind: "geometry", id: "other" });
  assert.equal(stored(removed), undefined); assert.ok(stored(removed, "shape"));
});

test("projection resolution honors explicit and current resources and rejects genuine ambiguity", () => {
  const one = chart().createProjection({ id: "one", type: "mercator" });
  assert.equal(stored(one._withContext({ currentResources: {} }).editProjection({ scalePx: 10 }), "one").revision, 1);
  const two = one.createProjection({ id: "two", type: "orthographic" });
  assert.equal(stored(two.editProjection({ scalePx: 20 }), "two").revision, 1);
  assert.equal(stored(two.editProjection({ target: "one", scalePx: 20 }), "one").revision, 1);
  assert.throws(() => two._withContext({ currentResources: {} }).editProjection({ scalePx: 20 }), /explicit projection/);
  assert.throws(() => chart().editProjection({ scalePx: 20 }), /explicit projection/);
});

test("projection requests reject conflicts, unsafe descriptors and invalid type-specific parameters", () => {
  const base = source(), before = serializeProgram(base);
  for (const options of [{ type: "identity", rotateDeg: [0, 0] }, { type: "mercator", parallelsDeg: [20, 50] },
    { type: "albers-usa", clipAngleDeg: 90 }, { type: "identity", fit: { width: 100, height: 100 }, scalePx: 2 },
    { type: "identity", fit: { width: 0, height: 100 } }, { type: "identity", fit: { width: 100, height: 100, geometry: undefined } },
    { type: "identity", fit: { width: 100, height: 100, extra: 1 } }, { type: "identity", fit: undefined }]) {
    assert.throws(() => base.createProjection({ id: "bad", ...options })); assert.equal(serializeProgram(base), before);
  }
  let reads = 0;
  assert.throws(() => base.createProjection({ id: "bad", type: "identity", fit: { get width() { reads++; return 100; }, height: 100 } }));
  assert.equal(reads, 0);
  const existing = fitted();
  for (const args of [{}, { scalePx: undefined }, { type: "invalid" }]) assert.throws(() => existing.editProjection(args));
  assert.throws(() => existing.createProjection({ id: "map", type: "identity" }), /already/);
});

test("offline projection restoration rejects forged outputs, shape, source refs and type policy", () => {
  const base = fitted(), before = serializeProgram(base);
  for (const mutate of [r => { r.result.scalePx = 6; }, r => { r.result.translatePx[0] = 0; },
    r => { r.result.bounds[0] = 0; }, r => { r.inputs[0].revision++; }, r => { r.inputs[0].kind = "layout"; },
    r => { r.result.extra = 1; }, r => { r.options.scalePx = 5; }, r => { r.options.fit.width = 200; },
    r => { r.ownership = { mode: "generated", owner: r.inputs[0] }; }, r => { r.provenance.origin = "inferred"; },
    r => { r.result.bounds = [10, 0, -10, 0]; }, r => { r.inputs = []; }]) {
    const envelope = JSON.parse(before), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.resources.find(r => r.kind === "projection")); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(base), before);
});

test("restored projection inputs cannot substitute an existing contour for a geographic source", () => {
  const base = fitted().createContourData({ id: "contour", grid: { origin: [0, 0], width: 2, height: 2, dx: 1, dy: 1, values: [0, 1, 1, 0] }, thresholds: [.5] });
  const envelope = JSON.parse(serializeProgram(base)), state = decodeValue(envelope.payload);
  state.semanticSpec.resources.find(resource => resource.kind === "projection").inputs[0].id = "contour";
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /geographic or planar geometry source/);
});

test("explicit projection fits and responsive graph routes retain independent revision closures", () => {
  const rows = [{ key: "a", x: 0, y: 1000 }, { key: "b", x: 1, y: 2000 }];
  const base = fitted().createCanvas({ width: 1000, height: 700, margin: 100 })
    .createData({ id: "nodes", values: rows, keyField: "key" })
    .createData({ id: "edges", values: [{ source: "a", target: "b" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "source", target: "target" })
    .layoutGraph({ id: "layout", graph: "graph", method: "circular" })
    .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "screen" })
    .createGraphPlot({ id: "network", routes: "routes" })
    .createScatterPlot({ id: "points", data: "nodes", x: "x", y: "y", guides: false })
    .createYAxis({ title: false }).editCanvas({ responsive: {} }).editYAxisLabels({ fontSize: 32 });
  const saved = serializeProgram(base);
  const revised = base.reviseData({ source: "nodes", id: "updated", values: rows.map(row => ({ ...row, y: row.y * 100000 })) });
  assert.notDeepEqual(resolveGraphicBounds(revised), resolveGraphicBounds(base));
  assert.deepEqual(stored(revised, "routes").result.viewport, resolveGraphicBounds(revised));
  assert.equal(stored(revised, "routes").revision, stored(base, "routes").revision + 1);
  assert.equal(stored(revised), stored(base));
  const reshaped = revised.editGeometryData({ target: "shape", values: line(20, 20) });
  assert.equal(stored(reshaped).revision, stored(revised).revision + 1);
  assert.deepEqual(stored(reshaped).result.bounds, [0, 0, 100, 100]);
  assert.equal(stored(reshaped, "routes"), stored(revised, "routes"));
  const resized = reshaped.editCanvas({ width: 1200 });
  assert.equal(stored(resized, "routes").revision, stored(reshaped, "routes").revision + 1);
  assert.deepEqual(stored(resized, "routes").result.viewport, resolveGraphicBounds(resized));
  assert.equal(stored(resized), stored(reshaped));
  assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
  assert.equal(serializeProgram(base), saved);
});
