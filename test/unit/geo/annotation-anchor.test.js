import assert from "node:assert/strict";
import test from "node:test";
import { geometryCentroid } from "../../../src/grammar/geo/centroid.js";
const planar = value => geometryCentroid(value, { coordinateKind: "planar" });
const geographic = value => geometryCentroid(value, { coordinateKind: "geographic" });
function close(actual, expected, tolerance = 1e-10) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < tolerance, `${actual} !== ${expected}`));
}

test("feature anchors use source coordinates and dimension-weighted planar centroids", () => {
  assert.deepEqual(planar({ type: "Point", coordinates: [2, 3, 99] }), [2, 3]);
  assert.deepEqual(planar({ type: "MultiPoint", coordinates: [[0, 0], [4, 0]] }), [2, 0]);
  close(planar({ type: "LineString", coordinates: [[0, 0], [4, 0], [4, 2]] }), [8 / 3, 1 / 3]);
  const polygon = { type: "Polygon", coordinates: [[[0, 0], [6, 0], [6, 4], [0, 4], [0, 0]], [[1, 1], [1, 3], [3, 3], [3, 1], [1, 1]]] };
  const saved = structuredClone(polygon);
  close(planar(polygon), [3.2, 2]);
  close(planar({ ...polygon, coordinates: polygon.coordinates.map(ring => [...ring].reverse()) }), [3.2, 2]);
  close(planar({ ...polygon, coordinates: [polygon.coordinates[0], [...polygon.coordinates[1]].reverse()] }), [3.2, 2]);
  close(planar({ type: "MultiPolygon", coordinates: [polygon.coordinates] }), [3.2, 2]);
  close(planar({ type: "GeometryCollection", geometries: [polygon, { type: "Point", coordinates: [999, 999] }] }), [3.2, 2]);
  assert.deepEqual(polygon, saved);
});

test("spherical anchors retain dateline and polygon-hole meaning before projection", () => {
  close(geographic({ type: "Point", coordinates: [30, 45] }), [30, 45]);
  const date = geographic({ type: "MultiPoint", coordinates: [[179, 0], [-179, 0]] });
  assert.ok(Math.abs(Math.abs(date[0]) - 180) < 1e-10); close([date[1]], [0]);
  const ring = [[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]];
  const polygon = { type: "Polygon", coordinates: [ring] };
  close(geographic(polygon), [0, 0]);
  close(geographic({ type: "MultiPolygon", coordinates: [[ring]] }), [0, 0]);
  close(geographic({ type: "GeometryCollection", geometries: [null, polygon] }), [0, 0]);
  const withHole = { type: "Polygon", coordinates: [ring, [[-2, -2], [-2, 2], [2, 2], [2, -2], [-2, -2]]] };
  close(geographic(withHole), [0, 0]);
  assert.equal(Object.isFrozen(geographic(polygon)), true);
});

test("empty anchors remain absent while ambiguous, malformed and overflowing sources reject", () => {
  for (const geometry of [null, { type: "Polygon", coordinates: [] }, { type: "GeometryCollection", geometries: [null] }]) assert.equal(planar(geometry), null);
  assert.throws(() => geographic({ type: "MultiPoint", coordinates: [[0, 0], [180, 0]] }), /finite centroid/);
  assert.throws(() => planar({ type: "LineString", coordinates: [[1e308, 1e308], [-1e308, -1e308]] }), /finite centroid/);
  assert.throws(() => planar({ type: "Polygon", coordinates: [[[0, 0], [1e308, 0], [1e308, 1e308], [0, 0]]] }), /finite centroid/);
  assert.throws(() => geometryCentroid(null, {}), /coordinateKind/);
  assert.throws(() => geometryCentroid(null, { coordinateKind: "planar", centroid: "first" }), /Unknown/);
  assert.throws(() => geographic({ type: "Point", coordinates: [0, 91] }), /latitude/);
  let reads = 0; const bad = { get type() { reads++; return "Point"; }, coordinates: [0, 0] };
  assert.throws(() => planar(bad)); assert.equal(reads, 0);
});
