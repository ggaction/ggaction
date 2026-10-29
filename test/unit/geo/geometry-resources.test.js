import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { inspectProgram, comparePrograms } from "../../../src/inspection.js";

const feature = (id, x = 0) => ({ type: "Feature", id, properties: { code: id }, geometry: { type: "Point", coordinates: [x, 1] } });
const values = (...ids) => ({ type: "FeatureCollection", features: ids.map(id => feature(id)) });
const create = (input = values("a", "b"), options = {}) => chart().createGeometryData({ id: "places", format: "geojson", coordinateKind: "geographic", values: input, ...options });
const resource = program => program.semanticSpec.resources.find(r => r.id === "places");

test("geometry source creation, exact stored restoration and keyed edit preserve identity and old state", () => {
  const source = values("a", "b"), base = create(source, { featureKey: ["properties", "code"] });
  const snapshot = serializeProgram(base), before = resource(base);
  source.features[0].properties.code = "mutated";
  const restored = deserializeProgram(snapshot), next = restored.editGeometryData({ values: values("b", "a") });
  assert.deepEqual(resource(next).result.identity.rowKeys, [...before.result.identity.rowKeys].reverse());
  assert.equal(resource(next).revision, 1); assert.equal(resource(next).result.identity.logicalId, before.result.identity.logicalId);
  assert.equal(resource(base).revision, 0); assert.equal(resource(base).result.features[0].properties.code, "a");
  assert.equal(serializeProgram(base), snapshot);
  assert.notEqual(comparePrograms(base, next).equivalence, "equal");
  assert.ok(comparePrograms(base, next).changes.some(change => change.resource.kind === "geometry" && change.operation === "modify"));
  assert.doesNotThrow(() => inspectProgram(next, { target: { kind: "geometry", id: "places" } }));
  assert.equal(typeof basic().createGeometryData, "undefined");
});

test("generated geometry keys survive option edits and reset on whole-value replacement", () => {
  const base = create(), keys = resource(base).result.identity.rowKeys;
  const options = base.editGeometryData({ coordinateKind: "planar", limits: { maxFeatures: 10 } });
  assert.deepEqual(resource(options).result.identity.rowKeys, keys);
  const revised = options.editGeometryData({ limits: { maxPositions: 50 } });
  assert.equal(resource(revised).options.limits.maxFeatures, 10);
  assert.deepEqual(resource(revised).result.identity.rowKeys, keys);
  const replaced = revised.editGeometryData({ values: values("a", "b") });
  assert.ok(resource(replaced).result.identity.rowKeys.every(key => !keys.includes(key)));
  assert.equal(resource(replaced).result.identity.nextGeneratedKey, 4);
});

test("TopoJSON stores the inferred object and switching an object allocates new generated identities", () => {
  const point = x => ({ type: "Point", coordinates: [x, 1] });
  const base = create({ type: "Topology", objects: { first: point(1) }, arcs: [] }, { format: "topojson" });
  assert.equal(resource(base).options.topoObject, "first");
  const revised = base.editGeometryData({ values: { type: "Topology", objects: { first: point(2), second: point(3) }, arcs: [] } });
  assert.equal(resource(revised).result.features[0].geometry.coordinates[0], 2);
  const next = revised.editGeometryData({ topoObject: "second" });
  assert.notEqual(resource(next).result.identity.rowKeys[0], resource(revised).result.identity.rowKeys[0]);
  assert.equal(resource(next).result.features[0].geometry.coordinates[0], 3);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(next)));
});

test("geometry errors remain atomic across identity policy, syntax, budgets and incompatible resource kinds", () => {
  const base = create(values("a"), { featureKey: "id" }), serialized = serializeProgram(base);
  for (const patch of [{}, { values: undefined }, { featureKey: "other" }, { values: values("a", "a") },
    { values: { type: "Point", coordinates: [0, 0] } }, { coordinateKind: "unknown" }, { limits: { maxFeatures: 0 } },
    { values: { type: "Feature", id: "a", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1]]] } } }]) {
    assert.throws(() => base.editGeometryData(patch)); assert.equal(serializeProgram(base), serialized);
  }
  assert.throws(() => base.createGeometryData({ id: "places", format: "geojson", coordinateKind: "geographic", values: values("c") }), /already/);
  assert.throws(() => create(values("a"), { featureKey: [] }), /featureKey/);
  assert.throws(() => create(values("a"), { featureKey: [""] }), /featureKey/);
  assert.throws(() => chart().editGeometryData({ values: values("a") }), /explicit geometry/);
  const contour = chart().createContourData({ id: "contour", grid: { width: 2, height: 2, origin: [0, 0], dx: 1, dy: 1, values: [0, 1, 1, 0] }, thresholds: [.5] });
  assert.throws(() => contour.editGeometryData({ target: "contour", values: values("a") }), /geographic source/);
});

test("malformed offline geometry cannot forge source results, feature keys or resource revision", () => {
  const base = create(values("a"), { featureKey: "id" });
  for (const mutate of [r => { r.result.features[0].geometry.coordinates[0] = 9; },
    r => { r.result.source.contentHash = "0".repeat(64); }, r => { r.result.identity.rowKeys[0] = '["scalar",[["string","other"]]]'; },
    r => { r.result.identity.revision++; }, r => { r.options.method = "unknown"; }, r => { r.result.extra = 1; },
    r => { r.result.identity.keySpec = { mode: "generated" }; }, r => { r.inputs = [{ kind: "geometry", id: "places", revision: 0 }]; }]) {
    const envelope = JSON.parse(serializeProgram(base)), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.resources[0]); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(resource(base).result.features[0].geometry.coordinates[0], 0);
  const empty = create({ type: "FeatureCollection", features: [] }).removeResource({ kind: "geometry", id: "places" });
  assert.deepEqual(empty.semanticSpec.resources, []);
});


test("generic geometry writes cannot rebind a contour mark to geographic geometry", () => {
  const contour = chart().createCanvas({ width: 200, height: 200 })
    .createContourData({ id: "places", grid: { origin: [0, 0], width: 2, height: 2, dx: 1, dy: 1, values: [0, 1, 1, 0] }, thresholds: [.5] })
    .createContourMark({ geometry: "places" });
  const replacement = structuredClone(resource(create())); replacement.revision = 1; replacement.result.identity.revision = 1;
  const before = serializeProgram(contour);
  assert.throws(() => contour.editSemantic({ property: "resource[geometry:places]", value: replacement }), /Contour marks require/);
  assert.equal(serializeProgram(contour), before);
});

test("geometry selection skips contour resources and refuses ambiguous eligible sources", () => {
  const sole = create().createContourData({ id: "contour", grid: { origin: [0, 0], width: 2, height: 2, dx: 1, dy: 1, values: [0, 1, 1, 0] }, thresholds: [.5] });
  assert.equal(resource(sole.editGeometryData({ coordinateKind: "planar" })).revision, 1);
  let program = create().createGeometryData({ id: "other", format: "geojson", coordinateKind: "geographic", values: values("c") });
  assert.equal(program.editGeometryData({ coordinateKind: "planar" }).semanticSpec.resources.find(r => r.id === "other").revision, 1);
  program = program.createContourData({ id: "contour", grid: { origin: [0, 0], width: 2, height: 2, dx: 1, dy: 1, values: [0, 1, 1, 0] }, thresholds: [.5] });
  assert.throws(() => program.editGeometryData({ coordinateKind: "planar" }), /explicit geometry/);
  assert.equal(resource(program.editGeometryData({ target: "places", coordinateKind: "planar" })).revision, 1);
});
