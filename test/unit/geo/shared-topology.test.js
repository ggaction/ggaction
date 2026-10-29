import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGeometryData } from "../../../src/grammar/geo/normalize.js";
import { simplifySharedTopology } from "../../../src/grammar/geo/simplify.js";
import { expandDecodedTopology } from "../../../src/grammar/geo/topology.js";
import { createGeometryBudget } from "../../../src/grammar/geo/input.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const normalize = (arcs, references, extra = {}) => normalizeGeometryData({ type: "Topology", arcs, objects: { regions: references }, ...extra },
  { format: "topojson", coordinateKind: "planar" }).topology;
const options = { coordinateKind: "planar", tolerance: .1 };
const adjacent = () => normalize([
  [[1, 1], [0, 1], [0, 0], [1, 0]],
  [[1, 0], [1.05, .25], [.95, .5], [1, .75], [1, 1]],
  [[1, 0], [2, 0], [2, 1], [1, 1]]
], { type: "GeometryCollection", geometries: [
  { type: "Polygon", id: "left", properties: { label: "West" }, arcs: [[0, 1]] },
  { type: "Polygon", id: "right", properties: { label: "East" }, arcs: [[2, -2]] }
] });
const lines = arcs => normalize(arcs, { type: "MultiLineString", arcs: arcs.map((_, i) => [i]) });

test("adjacent polygons use one simplified shared arc with exactly reversed boundary coordinates", () => {
  const input = adjacent(), saved = structuredClone(input), result = simplifySharedTopology(input, options);
  assert.deepEqual(result.topology.arcs[1], [[1, 0], [1, 1]]);
  assert.deepEqual(result.keptIndices[1], [0, 4]);
  assert.deepEqual(result.geometries.map(entry => entry.geometry.coordinates), [
    [[[1, 1], [0, 1], [0, 0], [1, 0], [1, 1]]],
    [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]]
  ]);
  assert.equal(result.diagnostics.retainedForTopology, null);
  assert.equal(result.diagnostics.inputPoints, 13); assert.equal(result.diagnostics.outputPoints, 10);
  assert.ok(result.diagnostics.maxDeviation <= .1); assert.ok(result.diagnostics.maxDeviation > .049);
  assert.deepEqual(result.topology.references, input.references); assert.deepEqual(input, saved);
  assert(Object.isFrozen(result.topology.arcs[1][0]));
});

test("zero tolerance preserves every original vertex and unused z value without simplification", () => {
  const input = lines([[[0, 0, 1], [1, 0, 2], [2, 0, 3]]]);
  const zero = simplifySharedTopology(input, { ...options, tolerance: 0 });
  assert.deepEqual(zero.topology, input); assert.deepEqual(zero.keptIndices, [[0, 1, 2]]);
  assert.equal(zero.diagnostics.maxDeviation, 0);
  const simplified = simplifySharedTopology(input, options);
  assert.deepEqual(simplified.topology.arcs, [[[0, 0, 1], [2, 0, 3]]]);
  assert.deepEqual(simplified.geometries[0].geometry.coordinates, [[[0, 0, 1], [2, 0, 3]]]);
});

test("unsafe crossing candidates retain the complete source topology with an explicit reason", () => {
  const input = lines([[[0, 0], [0, 2], [2, 2], [2, 0]], [[1, -1], [1, 1]]]);
  const result = simplifySharedTopology(input, { ...options, tolerance: 2 });
  assert.equal(result.diagnostics.retainedForTopology, "crossing");
  assert.equal(result.diagnostics.maxDeviation, 0); assert.deepEqual(result.topology, input);
  const overlapping = lines([[[0, 0], [1, .1], [2, 0]], [[1, 0], [3, 0]]]);
  assert.equal(simplifySharedTopology(overlapping, { ...options, tolerance: 1 }).diagnostics.retainedForTopology, "crossing");
});

test("ring collapse and a hole escaping its simplified exterior are prevented", () => {
  const closed = normalize([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]], { type: "Polygon", arcs: [[0]] });
  const collapse = simplifySharedTopology(closed, { ...options, tolerance: 10 });
  assert.equal(collapse.diagnostics.retainedForTopology, "ring-collapse"); assert.deepEqual(collapse.topology, closed);
  const input = normalize([
    [[0, 0], [5, -3], [10, 0]], [[10, 0], [5, 10]], [[5, 10], [0, 0]],
    [[4, -1.5], [6, -1.5]], [[6, -1.5], [6, -.5]], [[6, -.5], [4, -.5]], [[4, -.5], [4, -1.5]]
  ], { type: "Polygon", arcs: [[0, 1, 2], [3, 4, 5, 6]] });
  const result = simplifySharedTopology(input, { ...options, tolerance: 3 });
  assert.equal(result.diagnostics.retainedForTopology, "ring-containment"); assert.deepEqual(result.topology, input);
});

test("valid holes, multipolygons, null features and nested collections remain unchanged in meaning", () => {
  const input = normalize([
    [[0, 0], [5, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]],
    [[2, 2], [3, 2]], [[3, 2], [3, 3]], [[3, 3], [2, 3]], [[2, 3], [2, 2]], [[20, 20], [21, 20], [22, 20]]
  ], { type: "GeometryCollection", geometries: [
    { type: "MultiPolygon", arcs: [[[0, 1, 2, 3], [4, 5, 6, 7]]] }, { type: null },
    { type: "GeometryCollection", geometries: [{ type: "LineString", arcs: [8] }] }
  ] });
  const result = simplifySharedTopology(input, options);
  assert.equal(result.diagnostics.retainedForTopology, null);
  assert.equal(result.geometries[0].geometry.coordinates[0][1].length, 5);
  assert.deepEqual(result.geometries[1], { geometry: null, drawable: false });
  assert.deepEqual(result.geometries[2].geometry.geometries[0].coordinates, [[20, 20], [22, 20]]);
});

test("isolated points preserve their original quantization transform while decoded arcs are simplified once", () => {
  const input = normalize([[[0, 0, 9], [1, 0, 8], [1, 0, 7]]], { type: "GeometryCollection", geometries: [
    { type: "LineString", arcs: [0] }, { type: "Point", coordinates: [2, 1] }, { type: "MultiPoint", coordinates: [[0, 2], [2, 3]] }
  ] }, { transform: { scale: [2, 3], translate: [10, 20] } });
  const result = simplifySharedTopology(input, options);
  assert.deepEqual(result.topology.arcs[0], [[10, 20, 9], [14, 20, 7]]);
  assert.deepEqual(result.geometries[1].geometry.coordinates, [14, 23]);
  assert.deepEqual(result.geometries[2].geometry.coordinates, [[10, 26], [14, 29]]);
  assert.deepEqual(result.topology.transform, input.transform); assert.deepEqual(result.topology.references, input.references);
});

test("geographic seam arcs remain exact while other arcs can simplify", () => {
  const input = lines([[[179, 0], [180, .01], [-179, 0]], [[0, 0], [1, .01], [2, 0]]]);
  const result = simplifySharedTopology(input, { coordinateKind: "geographic", tolerance: .1 });
  assert.deepEqual(result.topology.arcs[0], input.arcs[0]); assert.deepEqual(result.keptIndices[0], [0, 1, 2]);
  assert.equal(result.diagnostics.seamArcCount, 1); assert.deepEqual(result.topology.arcs[1], [[0, 0], [2, 0]]);
});

test("empty and zero-length arc geometry remains explicit and no reduction invents geometry", () => {
  const empty = normalize([], { type: "GeometryCollection", geometries: [{ type: null }] });
  const result = simplifySharedTopology(empty, options);
  assert.deepEqual(result.topology.arcs, []); assert.equal(result.diagnostics.outputPoints, 0);
  const repeated = lines([[[0, 0], [0, 0], [0, 0]], [[1, 0], [2, 0], [3, 0]]]);
  assert.deepEqual(simplifySharedTopology(repeated, options).topology.arcs, [[[0, 0], [0, 0]], [[1, 0], [3, 0]]]);
});

test("invalid topology, options, descriptor access and unsafe numeric precision fail before result creation", () => {
  for (const tolerance of [-1, NaN, Infinity, undefined, "1"]) assert.throws(() => simplifySharedTopology(adjacent(), { ...options, tolerance }));
  assert.throws(() => simplifySharedTopology(adjacent(), { ...options, coordinateKind: "screen" }));
  assert.throws(() => simplifySharedTopology(adjacent(), { ...options, preserve: false }));
  for (const mutate of [t => { t.object = 1; }, t => { t.extra = true; }, t => { t.arcs[0] = []; },
    t => { t.references.geometries[0].arcs[0][0] = 99; }, t => { t.arcs[1][0][0] = .5; }]) {
    const input = structuredClone(adjacent()); mutate(input); const saved = structuredClone(input);
    assert.throws(() => simplifySharedTopology(input, options)); assert.deepEqual(input, saved);
  }
  let called = 0; const hostile = Object.defineProperty({}, "arcs", { enumerable: true, get() { called++; return []; } });
  assert.throws(() => simplifySharedTopology(hostile, options), /accessors/); assert.equal(called, 0);
  const extreme = lines([[[0, 0], [1e-300, 0], [1e308, 0]]]);
  assert.throws(() => simplifySharedTopology(extreme, { ...options, tolerance: 1 }), /precision/);
  assert.throws(() => simplifySharedTopology(adjacent(), { ...options, limits: { maxPositions: 2 } }), error => getErrorDetails(error).code === "resource-limit");
  assert.throws(() => expandDecodedTopology({ object: "x", arcs: [], references: {} }, "planar", createGeometryBudget()), /discriminator/);
});
