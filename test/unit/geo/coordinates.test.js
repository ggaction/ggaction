import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { collectResourceReferences } from "../../../src/core/resourceReferences.js";

const projection = () => chart().createProjection({ id: "map", type: "identity" });
const coordinate = program => program.semanticSpec.coordinates.find(value => value.id === "main");

test("Geo coordinates resolve one exact projection and retain native creation semantics", () => {
  const p = projection().createCoordinate({ type: "geo" });
  assert.deepEqual(coordinate(p), { id: "main", type: "geo", projection: { kind: "projection", id: "map", revision: 0 } });
  const q = p.createProjection({ id: "other", type: "mercator" }).createCoordinate({ type: "geo" });
  assert.deepEqual(coordinate(q), coordinate(p));
  assert.throws(() => q.createCoordinate({ type: "geo", projection: "other" }), /editCoordinate/);
  assert.deepEqual(chart().createCoordinate().semanticSpec.coordinates, [{ id: "main", type: "cartesian" }]);
  assert.throws(() => p.createCoordinate({ type: "polar" }), /already exists/);
  assert.throws(() => basic().createCoordinate({ type: "geo" }), /full ChartProgram/);
  assert.equal(typeof basic().editCoordinate, "undefined");
  assert.throws(() => chart().createCoordinate({ type: "geo" }), /projection/);
  const ambiguous = projection().createProjection({ id: "other", type: "mercator" })._withContext({ currentResources: {} });
  assert.throws(() => ambiguous.createCoordinate({ type: "geo" }), /explicit projection/);
  const selected = ambiguous.createCoordinate({ type: "geo", projection: "map" });
  assert.equal(coordinate(selected).projection.id, "map");
});

test("projection and geometry revision closures rebind all coordinates once without changing old state", () => {
  const p = chart().createGeometryData({ id: "shape", format: "geojson", coordinateKind: "planar", values: { type: "LineString", coordinates: [[0, 0], [10, 20]] } })
    .createProjection({ id: "map", type: "identity", fit: { width: 100, height: 100 } })
    .createCoordinate({ type: "geo" }).createCoordinate({ id: "second", type: "geo" });
  const saved = serializeProgram(p);
  const q = p.editGeometryData({ values: { type: "LineString", coordinates: [[0, 0], [20, 20]] } });
  assert.ok(q.semanticSpec.coordinates.every(value => value.projection.revision === 1));
  const r = q.editProjection({ reflectX: true });
  assert.ok(r.semanticSpec.coordinates.every(value => value.projection.revision === 2));
  assert.deepEqual(deserializeProgram(serializeProgram(r)).semanticSpec, r.semanticSpec);
  assert.equal(serializeProgram(p), saved);
  assert.throws(() => p.editGeometryData({ coordinateKind: "geographic" }));
  assert.equal(serializeProgram(p), saved);
});

test("coordinate edits rebind projections and removal follows the actual live ref", () => {
  const p = projection().createCoordinate({ type: "geo" }).createProjection({ id: "other", type: "mercator" });
  const saved = serializeProgram(p);
  assert.throws(() => p.removeResource({ kind: "projection", id: "map", cascade: true }), /coordinate/);
  const refs = collectResourceReferences(p, { kind: "projection", id: "map" });
  assert.ok(refs.some(ref => ref.ownerKind === "coordinate" && ref.ownerId === "main"));
  const q = p.editCoordinate({ target: "main", projection: "other" }).removeResource({ kind: "projection", id: "map" });
  assert.equal(coordinate(q).projection.id, "other");
  assert.throws(() => q.removeResource({ kind: "projection", id: "other" }), /coordinate/);
  const removed = q.removeCoordinate({ id: "main" }).removeResource({ kind: "projection", id: "other" });
  assert.deepEqual(removed.semanticSpec.resources, []);
  assert.equal(serializeProgram(p), saved);
});

test("Geo coordinate requests reject native consumers, mixed policies and unsafe descriptors atomically", () => {
  const p = projection().createCoordinate({ type: "geo" }), saved = serializeProgram(p);
  for (const args of [{ target: "main" }, { target: "main", aspect: "auto" }, { target: "main", projection: "map", polarFrame: "auto" }, { target: "main", projection: "missing" }]) {
    assert.throws(() => p.editCoordinate(args)); assert.equal(serializeProgram(p), saved);
  }
  assert.throws(() => projection().createCoordinate({ type: "geo", projection: undefined }));
  const point = projection().createData({ values: [{ x: 1 }] }).createPointMark({ id: "point" });
  assert.throws(() => point.createCoordinate({ id: "geo", type: "geo", layers: ["point"] }), /geographic marks/);
  assert.throws(() => projection().createCoordinate({ type: "geo", layers: ["missing"] }), /Unknown layer/);
  let reads = 0;
  assert.throws(() => p.editCoordinate({ target: "main", get projection() { reads++; return "map"; } }));
  assert.equal(reads, 0);
});

test("editable restoration rejects forged coordinate shape, stale refs and incompatible native bindings", () => {
  const p = projection().createCoordinate({ type: "geo" });
  for (const mutate of [c => { delete c.projection; }, c => { c.projection.revision++; }, c => { c.projection.kind = "geometry"; },
    c => { c.type = "cartesian"; }, c => { c.aspect = { mode: "frame", ratio: 1 }; }, c => { c.polarFrame = {}; }]) {
    const envelope = JSON.parse(serializeProgram(p)), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.coordinates[0]); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  for (const [property, value] of [["type", "cartesian"], ["aspect", { mode: "frame", ratio: 1 }], ["polarFrame", "auto"], ["projection", { kind: "geometry", id: "map", revision: 0 }]]) {
    assert.throws(() => p.editSemantic({ property: `coordinate[main].${property}`, value }));
  }
  assert.throws(() => chart().editSemantic({ property: "coordinate[bad].projection", value: { kind: "projection", id: "map", revision: 0 } }));
  const native = chart().createCoordinate().editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 1 } });
  assert.throws(() => native.editSemantic({ property: "coordinate[main].type", value: "geo" }));
});

test("primitive coordinate type edits cannot attach native marks to geographic state", () => {
  const p = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  const before = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editSemantic({ property: "coordinate[main].type", value: "geo" }), /geographic marks/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
});
