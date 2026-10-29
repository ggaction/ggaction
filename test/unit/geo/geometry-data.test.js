import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGeometryData } from "../../../src/grammar/geo/normalize.js";

const options = { format: "geojson", coordinateKind: "geographic" };
const parse = (values, patch = {}) => normalizeGeometryData(values, { ...options, ...patch });
const point = coordinates => ({ type: "Point", coordinates });
const feature = (geometry, id, properties = {}) => ({ type: "Feature", geometry, properties, ...(id === undefined ? {} : { id }) });
const collection = features => ({ type: "FeatureCollection", features });
const ring = [[0, 0], [8, 0], [8, 8], [0, 0]], hole = [[1, 1], [2, 2], [2, 1], [1, 1]];
const topo = (objects, arcs = [], transform) => ({ type: "Topology", objects, arcs, ...(transform ? { transform } : {}) });
const parseTopo = (source, patch = {}) => parse(source, { format: "topojson", ...patch });

test("GeoJSON preserves all geometry types, holes, islands, null identities and source paths", () => {
  const geometries = [point([180, 90, 123]), { type: "MultiPoint", coordinates: [[0, 0], [1, 1]] },
    { type: "LineString", coordinates: [[179, 0], [-179, 0]] }, { type: "MultiLineString", coordinates: [[[0, 0], [1, 1]]] },
    { type: "Polygon", coordinates: [ring, hole] }, { type: "MultiPolygon", coordinates: [[ring, hole], [ring]] },
    { type: "GeometryCollection", geometries: [point([1, 2]), { type: "GeometryCollection", geometries: [null] }] }, null];
  const source = collection(geometries.map((g, i) => feature(g, i, { name: `feature ${i}` })));
  source.foreign = { original: true };
  const result = parse(source);
  assert.deepEqual(result.features.map(f => f.geometry), geometries);
  assert.deepEqual(result.features.map(f => f.id), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(result.features.map(f => f.drawable), [true, true, true, true, true, true, true, false]);
  assert.deepEqual(result.features[7].sourcePath, ["features", 7]);
  assert.deepEqual(result.source.values, source);
  assert.equal(result.source.kind, "values"); assert.equal(result.source.hashKind, "encoded-values");
  assert.equal(result.features[0].geometry.coordinates[2], 123);
  source.features[0].geometry.coordinates[0] = 0; source.foreign.original = false;
  assert.equal(result.features[0].geometry.coordinates[0], 180); assert.equal(result.source.values.foreign.original, true);
  assert.throws(() => { result.features[0].geometry.coordinates[0] = 0; });
});

test("empty geometry stays nondrawable without repairing malformed nonempty lines or rings", () => {
  for (const type of ["MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"]) {
    assert.equal(parse({ type, coordinates: [] }).features[0].drawable, false);
  }
  for (const geometry of [null, { type: "GeometryCollection", geometries: [] },
    { type: "MultiLineString", coordinates: [[]] }, { type: "MultiPolygon", coordinates: [[]] }]) {
    assert.equal(parse(geometry).features[0].drawable, false);
  }
  assert.equal(parse(feature(null, "missing", null)).features[0].properties, null);
  assert.deepEqual(parse(collection([])).features, []);
  for (const coordinates of [[], [[0, 0], [1, 0], [0, 0]], [[0, 0], [1, 0], [1, 1], [0, 1]]]) {
    assert.throws(() => parse({ type: "Polygon", coordinates: [coordinates] }), /rings/);
  }
  assert.throws(() => parse({ type: "LineString", coordinates: [[0, 0]] }), /lines/);
  assert.throws(() => parse({ type: "LineString", coordinates: [[0, 0], [1, 1, 2]] }), /dimensions/);
});

test("feature IDs are typed, unique and independent of the source hash", () => {
  const source = collection([feature(null, 1), feature(null, "1"), feature(point([-0, 0]))]);
  const first = parse(source), second = parse(structuredClone(source));
  assert.equal(first.source.contentHash, second.source.contentHash);
  source.features[2].geometry.coordinates[0] = 0;
  assert.notEqual(first.source.contentHash, parse(source).source.contentHash);
  for (const ids of [[1, 1], [0, -0], ["a", "a"]]) assert.throws(() => parse(collection(ids.map(id => feature(null, id)))), /Duplicate/);
  for (const id of [true, null, {}, []]) assert.throws(() => parse(feature(null, id)), /IDs/);
});

test("quantized topology decodes deltas before transform, keeps z and stitches shared reversed arcs", () => {
  const source = topo({ land: { type: "GeometryCollection", geometries: [
    { type: "LineString", id: "forward", arcs: [0, 1], properties: { region: 1 } },
    { type: "LineString", id: "reverse", arcs: [-2, -1] },
    { type: "Point", coordinates: [2, 3, 9] }, { type: "MultiPoint", coordinates: [[1, 2], [2, 1]] },
    { type: null, id: "missing", properties: null }
  ] } }, [[[0, 0, 5], [1, 0, 6]], [[1, 0, 6], [0, 1, 7]]], { scale: [2, 3], translate: [10, 20] });
  const result = parseTopo(source);
  assert.deepEqual(result.topology.arcs, [[[10, 20, 5], [12, 20, 6]], [[12, 20, 6], [12, 23, 7]]]);
  assert.deepEqual(result.features[0].geometry.coordinates, [[10, 20, 5], [12, 20, 6], [12, 23, 7]]);
  assert.deepEqual(result.features[1].geometry.coordinates, [[12, 23, 7], [12, 20, 6], [10, 20, 5]]);
  assert.deepEqual(result.features[2].geometry.coordinates, [14, 29, 9]);
  assert.deepEqual(result.features[3].geometry.coordinates, [[12, 26], [14, 23]]);
  assert.deepEqual(result.features[0].sourcePath, ["objects", "land", "geometries", 0]);
  assert.equal(result.features[4].drawable, false);
  assert.deepEqual(result.topology.references.geometries[1].arcs, [-2, -1]);
});

test("unquantized topology keeps absolute positions and expands polygon holes and nested collections", () => {
  const source = topo({ land: { type: "GeometryCollection", geometries: [
    { type: "Polygon", arcs: [[0], [1]] }, { type: "MultiPolygon", arcs: [[[0], [1]], [[0]]] },
    { type: "MultiLineString", arcs: [[2], [-3]] }, { type: "GeometryCollection", geometries: [point([2, 3])] }
  ] } }, [ring, hole, [[10, 10], [11, 12]]]);
  const result = parseTopo(source);
  assert.deepEqual(result.features[0].geometry.coordinates, [ring, hole]);
  assert.deepEqual(result.features[1].geometry.coordinates, [[ring, hole], [ring]]);
  assert.deepEqual(result.features[2].geometry.coordinates, [[[10, 10], [11, 12]], [[11, 12], [10, 10]]]);
  assert.deepEqual(result.features[3].geometry.geometries, [point([2, 3])]);
  assert.equal(Object.hasOwn(result.topology, "transform"), false);
  const explicit = parseTopo(topo({ a: point([1, 1]), b: point([2, 2]) }), { topoObject: "b" });
  assert.deepEqual(explicit.features[0].geometry.coordinates, [2, 2]);
  assert.deepEqual(explicit.features[0].sourcePath, ["objects", "b"]);
});

test("topology rejects ambiguous objects, invalid transforms, arc references and disconnected junctions", () => {
  assert.throws(() => parseTopo(topo({})), /explicit object/);
  const many = topo({ a: point([0, 0]), b: point([1, 1]) });
  assert.throws(() => parseTopo(many), /explicit object/);
  assert.throws(() => parseTopo(many, { topoObject: "missing" }), /Unknown/);
  for (const ref of [0.5, 2 ** 31, -(2 ** 31) - 1, 20]) {
    assert.throws(() => parseTopo(topo({ line: { type: "LineString", arcs: [ref] } }, [[[0, 0], [1, 1]]])), /arc/);
  }
  assert.throws(() => parseTopo(topo({ line: { type: "LineString", arcs: [0, 1] } }, [[[0, 0], [1, 1]], [[2, 2], [3, 3]]])), /junction/);
  assert.throws(() => parseTopo(topo({ point: point([0, 0]) }, [[[0, 0]]])), /two positions/);
  for (const transform of [{ scale: [1], translate: [0, 0] }, { scale: [1, 1], translate: [] }]) {
    assert.throws(() => parseTopo(topo({ a: point([0, 0]) }, [], transform)), /two finite/);
  }
  assert.throws(() => parseTopo(topo({ a: point([0.2, 0]) }, [], { scale: [1, 1], translate: [0, 0] })), /integers/);
  assert.throws(() => parseTopo(topo({ a: point([2, 0]) }, [], { scale: [Number.MAX_VALUE, 1], translate: [0, 0] })), /finite/);
  assert.throws(() => parseTopo({ type: "Feature" }), /Topology object/);
  assert.throws(() => parseTopo(topo({ a: { type: "Circle" } })), /discriminator/);
});

test("source snapshots reject executable, cyclic, sparse and non-JSON input before getters run", () => {
  let reads = 0; const accessor = { get coordinates() { reads++; return [0, 0]; }, type: "Point" };
  assert.throws(() => parse(accessor), /accessors/); assert.equal(reads, 0);
  const cyclic = {}; cyclic.self = cyclic;
  for (const bad of [cyclic, { type: "Point", coordinates: [, 0] }, new Date(), { x: undefined },
    { x: () => 1 }, { x: 1n }, { x: NaN }, { x: Infinity }, { [Symbol()]: 1 }, Object.defineProperty({}, "hidden", { value: 1 })]) {
    assert.throws(() => parse(bad));
  }
  const shared = { name: "shared" }, alias = collection([feature(null, 1, shared), feature(null, 2, shared)]);
  const result = parse(alias); assert.deepEqual(result.features[0].properties, result.features[1].properties);
  const prototypeName = JSON.parse('{"type":"Feature","geometry":null,"properties":{"__proto__":{"value":3}}}');
  assert.equal(parse(prototypeName).features[0].properties.__proto__.value, 3);
  assert.equal({}.value, undefined);
});

test("geographic and planar coordinates stay separate and every malformed branch fails closed", () => {
  assert.deepEqual(parse(point([1000, 1000]), { coordinateKind: "planar" }).features[0].geometry.coordinates, [1000, 1000]);
  assert.throws(() => parse(point([0, 91])), /latitude/);
  assert.deepEqual(parse(point([720, 0])).features[0].geometry.coordinates, [720, 0]);
  for (const source of [point([1]), point([1, null]), { type: "Circle" }, { type: "Point", coordinates: [0, 0], crs: {} },
    { type: "Feature", geometry: null }, { type: "Feature", properties: {} }, feature(null, 1, []),
    collection([point([0, 0])]), { type: "GeometryCollection", geometries: [false] }]) assert.throws(() => parse(source));
  for (const patch of [{ format: "json" }, { coordinateKind: "unknown" }, { topoObject: "a" }, { unknown: true },
    { limits: { maxPositions: 0 } }, { limits: { maxDepth: 129 } }, { limits: { unknown: 1 } }]) assert.throws(() => parse(null, patch));
});

test("bounded normalization rejects oversized source and expanded topology without changing inputs", () => {
  const source = collection([feature(point([0, 0])), feature(point([1, 1]))]), before = structuredClone(source);
  for (const limits of [{ maxFeatures: 1 }, { maxPositions: 1 }, { maxValues: 2 }, { maxDepth: 2 }]) assert.throws(() => parse(source, { limits }));
  assert.deepEqual(source, before);
  const topology = topo({ line: { type: "LineString", arcs: [0, -1, 0] } }, [[[0, 0], [1, 1]]]);
  assert.throws(() => parseTopo(topology, { limits: { maxPositions: 3 } }), /exceed/);
  assert.throws(() => parseTopo(topo({ a: point([0, 0]) }, [[[0, 0], [1, 1]], [[0, 0], [2, 2]]]), { limits: { maxArcs: 1 } }), /exceed/);
  assert.throws(() => parse(feature(null, "huge", { text: "x".repeat(10_000_001) })), /work/);
});


test("bbox shape and quantized delta accumulation are validated without trusting declared bounds", () => {
  assert.equal(parse({ ...point([1, 2]), bbox: [0, 0, 2, 3] }).features[0].drawable, true);
  assert.throws(() => parse({ ...point([1, 2]), bbox: [0, 1, 2] }), /bbox/);
  assert.throws(() => parse({ ...feature(null), bbox: [0, 1, 2, 3, 4] }), /bbox/);
  assert.throws(() => parse({ ...collection([]), bbox: [0, 1] }), /bbox/);
  assert.throws(() => parseTopo({ ...topo({ a: point([0, 0]) }), bbox: [0, 1] }), /bbox/);
  assert.throws(() => parseTopo(topo({ a: { type: "LineString", arcs: [0] } }, [[[2147483647, 0], [1, 0]]], { scale: [1, 1], translate: [0, 0] })), /32-bit/);
  assert.throws(() => parseTopo(topo({ a: {} })), /discriminator/);
  assert.throws(() => parse({ coordinates: [0, 0] }), /discriminator/);
  const source = topo({ land: { type: "GeometryCollection", geometries: [point([0, 0]), point([1, 1])] } });
  assert.throws(() => parseTopo(source, { limits: { maxFeatures: 1 } }), /exceed/);
});
