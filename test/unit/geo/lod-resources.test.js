import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems, comparePrograms } from "../../../src/inspection.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";

const values = (keys, offset = 0) => ({ type: "FeatureCollection", features: keys.map((id, i) => ({
  type: "Feature", id, properties: { value: i + 1 }, geometry: { type: "Point", coordinates: [i * 10 + offset, 10] }
})) });
const resource = (p, id = "regions") => p.semanticSpec.resources.find(item => item.kind === "geometry" && item.id === id);
const levels = [{ id: "state", geometry: "states" }, { id: "county", geometry: "counties",
  parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }], enterZoom: 4.2, exitZoom: 3.8 }];
const base = () => chart().createCanvas({ width: 100, height: 100, margin: 0 })
  .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(["s"]) })
  .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values(["a", "b"]) });
const plotted = (zoom = 0) => base().createGeoLODData({ id: "regions", levels, zoom })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ id: "geo", type: "geo" })
  .createGeoPointMark({ id: "points", geometry: "regions", coordinate: "geo" });

test("geographic levels retain exact inputs and use asymmetric hysteresis thresholds", () => {
  const p = plotted(), before = serializeProgram(p);
  assert.equal(resource(p).options.activeLevel, "state");
  assert.deepEqual(resource(p).inputs, [{ kind: "geometry", id: "states", revision: 0 }, { kind: "geometry", id: "counties", revision: 0 }]);
  let q = p.editGeoLODData({ zoom: 4.1 }); assert.equal(resource(q).options.activeLevel, "state");
  q = q.editGeoLODData({ zoom: 4.2 }); assert.equal(resource(q).options.activeLevel, "county");
  for (const zoom of [4, 4.1, 3.8, 4]) {
    q = q.editGeoLODData({ zoom }); assert.equal(resource(q).options.activeLevel, "county");
  }
  q = q.editGeoLODData({ zoom: 3.799 }); assert.equal(resource(q).options.activeLevel, "state");
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
  assert.equal(typeof basic().createGeoLODData, "undefined"); assert.equal(typeof basic().editGeoLODData, "undefined");
});

test("county selection keeps its authored key while state is its current representation", () => {
  const p = plotted(5), [a, b] = getMarkItems(p, { target: "points" });
  const selected = p.selectMarks({ target: "points", id: "selected", items: [a.key] });
  const oldSelector = selected.semanticSpec.resources.find(item => item.id === "selected").options;
  const coarse = selected.editGeoLODData({ zoom: 3 }), [state] = getMarkItems(coarse, { target: "points" });
  assert.notEqual(state.key, a.key);
  assert.deepEqual(new Set(state.representationKeys), new Set([state.key, a.key, b.key]));
  assert.deepEqual(resolveStoredSelection(coarse, "selected").keys, [state.key]);
  assert.deepEqual(coarse.semanticSpec.resources.find(item => item.id === "selected").options, oldSelector);
  const fine = coarse.editGeoLODData({ zoom: 5 });
  assert.deepEqual(resolveStoredSelection(fine, "selected").keys, [a.key]);
  assert.deepEqual(getMarkItems(fine, { target: "points" }).map(item => item.key), [a.key, b.key]);
  assert.equal(comparePrograms(selected, fine).equivalence === "equal", false);
});

test("LOD preserves joined field rows and later joins retain original representation correspondence", () => {
  const p = base().createData({ id: "table", values: [{ code: "b", value: 8 }, { code: "a", value: 9 }], keyField: "code" })
    .createGeoJoinData({ id: "joined", geometry: "counties", data: "table", geometryKey: "id", dataKey: "code" })
    .createGeoLODData({ id: "regions", levels: [levels[0], { ...levels[1], geometry: "joined" }], zoom: 5 })
    .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "points" });
  assert.deepEqual(getMarkItems(p).map(item => item.fields.value), [9, 8]);
  assert.deepEqual(getMarkItems(p).map(item => item.rows.length), [1, 1]);
  const q = p.reviseData({ source: "table", id: "updated", values: [{ code: "a", value: 15 }] });
  assert.equal(resource(q, "joined").revision, 1); assert.equal(resource(q).revision, 1);
  assert.deepEqual(getMarkItems(q).map(item => item.fields.value), [15, undefined]);
  const r = q.createGeoJoinData({ id: "outer", geometry: "regions", data: "updated", geometryKey: "id", dataKey: "code" })
    .createGeoPointMark({ id: "outer-points", geometry: "outer" });
  assert.deepEqual(getMarkItems(r, { target: "outer-points" }).map(item => item.representationKeys.length), [2, 2]);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(r)));
});

test("revising an inactive level validates the whole hierarchy before one fitted consumer refresh", () => {
  const p = plotted(0).createProjection({ id: "fit", type: "identity", fit: { geometry: "regions", width: 100, height: 100 } })
    .createCoordinate({ id: "fit-coordinate", type: "geo" }).createGeoPointMark({ id: "fit-points", geometry: "regions" });
  const before = serializeProgram(p);
  assert.throws(() => p.editGeometryData({ target: "counties", values: values(["a", "new"]) }), /parent/i);
  assert.equal(serializeProgram(p), before);
  const q = p.editGeometryData({ target: "counties", values: values(["b", "a"], 20) });
  assert.equal(resource(q).revision, 1);
  assert.equal(q.semanticSpec.resources.find(item => item.id === "fit").revision, 1);
  assert.deepEqual(resource(q).result.features, resource(p).result.features);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(q)));
});

test("LOD edits retain the current level identity and reject invalid or cyclic definitions atomically", () => {
  const p = plotted(5), before = serializeProgram(p);
  const invalid = [() => p.editGeoLODData({}), () => p.editGeoLODData({ zoom: null }),
    () => p.editGeoLODData({ zoom: undefined }), () => p.editGeoLODData({ levels: [levels[0]] }),
    () => p.editGeoLODData({ levels: [{ ...levels[0], geometry: "regions" }, levels[1]] }),
    () => p.createGeoLODData({ id: "regions", levels }), () => p.createGeoLODData({ id: "other", levels: [] }),
    () => p.editGeoLODData({ levels: [levels[0], { ...levels[1], tolerance: .5 }] }),
    () => p.createGeoLODData({ id: "other", levels: [{ id: "one", geometry: undefined }] })];
  for (const run of invalid) { assert.throws(run); assert.equal(serializeProgram(p), before); }
  const q = p.editGeoLODData({ levels: [levels[0], { ...levels[1], enterZoom: 4.5 }] });
  assert.equal(resource(q).options.activeLevel, "county");
  assert.equal(resource(q).result.identity.logicalId, resource(p).result.identity.logicalId);
  assert.throws(() => q.removeResource({ kind: "geometry", id: "counties" }), /depend|use/i);
});

test("LOD restore rejects forged correspondence, active level, options, identity and exact inputs", () => {
  const p = plotted(5), serialized = serializeProgram(p);
  for (const mutate of [r => { r.result.mapping[0].regions[0].representations = []; }, r => { r.options.activeLevel = "state"; },
    r => { r.options.levels[1].input = 0; }, r => { r.result.identity.keySpec.mode = "generated"; },
    r => { r.result.identity.revision++; }, r => { r.result.features[0].geometry.coordinates[0]++; },
    r => { r.inputs[1].revision++; }, r => { r.options.extra = true; }, r => { r.result.extra = true; },
    r => { r.provenance.sourceRows = [{ data: "missing" }]; }, r => { r.result.coordinateKind = "geographic"; }]) {
    const envelope = JSON.parse(serialized), state = decodeValue(envelope.payload);
    mutate(resource({ semanticSpec: state.semanticSpec })); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("null geometry and empty explicit levels preserve logical records without placeholder graphics", () => {
  const p = chart().createGeometryData({ id: "source", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [{ type: "Feature", id: 1, properties: null, geometry: null }] } })
    .createGeoLODData({ id: "regions", levels: [{ id: "one", geometry: "source" }] });
  assert.equal(resource(p).result.features[0].drawable, false);
  assert.equal(resource(p).result.mapping[0].regions.length, 1);
  const q = chart().createGeometryData({ id: "source", format: "geojson", coordinateKind: "planar", featureKey: "id", values: values([]) })
    .createGeoLODData({ id: "regions", levels: [{ id: "one", geometry: "source" }] });
  assert.deepEqual(resource(q).result.features, []); assert.deepEqual(resource(q).result.mapping[0].regions, []);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(q)));
});

test("shared topology simplification preserves source hashes and both polygon boundary consumers", () => {
  const topology = { type: "Topology", arcs: [
    [[1, 1], [0, 1], [0, 0], [1, 0]], [[1, 0], [1.05, .25], [.95, .5], [1, .75], [1, 1]],
    [[1, 0], [2, 0], [2, 1], [1, 1]]
  ], objects: { regions: { type: "GeometryCollection", geometries: [
    { type: "Polygon", id: "left", arcs: [[0, 1]] }, { type: "Polygon", id: "right", arcs: [[2, -2]] }
  ] } } };
  const p = chart().createCanvas({ width: 200, height: 100, margin: 0 }).createGeometryData({ id: "source", format: "topojson",
    coordinateKind: "planar", featureKey: "id", values: topology });
  const hash = resource(p, "source").result.source.contentHash, before = serializeProgram(p);
  const q = p.createGeoLODData({ id: "regions", levels: [{ id: "county", geometry: "source", tolerance: .1 }] })
    .createProjection({ id: "map", type: "identity", fit: { width: 200, height: 100 } })
    .createCoordinate({ type: "geo" }).createGeoShapeMark({ id: "shapes" });
  assert.deepEqual(resource(q).result.topology.arcs[1], [[1, 0], [1, 1]]);
  assert.equal(resource(q).result.diagnostics.simplification.outputPoints, 10);
  assert.equal(getMarkItems(q).length, 2);
  assert.equal(resource(q, "source").result.source.contentHash, hash);
  assert.equal(serializeProgram(p), before);
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(q)));
  const exact = q.editGeoLODData({ levels: [{ id: "county", geometry: "source", tolerance: 0 }] });
  assert.equal(resource(exact).result.topology.arcs[1].length, 5);
  assert.deepEqual(getMarkItems(exact).map(item => item.key), getMarkItems(q).map(item => item.key));
});

test("LOD requires explicit source keys, consistent coordinates and bounded descriptor-safe levels", () => {
  const p = base().createGeometryData({ id: "generated", format: "geojson", coordinateKind: "planar", values: values(["s"]) })
    .createGeometryData({ id: "sphere", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: values(["a", "b"]) });
  const before = serializeProgram(p); let reads = 0;
  const getter = { id: "state", get geometry() { reads++; return "states"; } };
  for (const input of [[getter], Array(129).fill(levels[0]), [{ ...levels[0], geometry: "generated" }],
    [levels[0], { ...levels[1], geometry: "sphere" }], [{ ...levels[0], extra: 1 }],
    [levels[0], { ...levels[1], parents: [{ key: "a", parent: "s" }] }],
    [levels[0], { ...levels[1], parents: [{ key: "a", parent: "s", extra: 1 }, { key: "b", parent: "s" }] }],
    [{ ...levels[0], tolerance: null }], [{ ...levels[0], tolerance: -1 }],
    [levels[0], { ...levels[1], enterZoom: NaN }]]) {
    assert.throws(() => p.createGeoLODData({ id: "regions", levels: input })); assert.equal(serializeProgram(p), before);
  }
  assert.equal(reads, 0);
  assert.throws(() => p.createGeoLODData({ id: "regions", levels, zoom: Infinity }));
  const q = p.createGeoLODData({ id: "regions", levels });
  assert.throws(() => q.createGeoJoinData({ id: "joined-lod", geometry: "regions", data: "none", geometryKey: "id", dataKey: "id" }));
  assert.throws(() => q.createGeoLODData({ id: "nested", levels: [{ id: "one", geometry: "regions" }] }), /nested/);
});


test("coarse selections resolve to every explicit child and highlights replay across scoped detail edits", () => {
  const p = plotted(), [state] = getMarkItems(p);
  const selected = p.selectMarks({ id: "selected", target: "points", items: [state.key] })
    .highlightMarks({ selection: "selected", color: "red", dimOthers: { opacity: .2 } });
  const fine = selected.editGeoLODData({ zoom: 5 });
  assert.deepEqual(resolveStoredSelection(fine, "selected").keys, getMarkItems(fine).map(item => item.key));
  assert.ok(fine.graphicSpec.objects.points.items.every(item => item.properties.fill === "red"));
  const composite = hconcat({ programs: [{ id: "left", program: selected }, { id: "right", program: selected }] });
  const changed = composite.editGeoLODData({ target: { childPath: ["left"], id: "regions" }, zoom: 5 });
  assert.equal(changed.children.right, selected);
  const items = getMarkItems(changed, { target: { childPath: ["left"], id: "points" } });
  const parent = getMarkItems(composite, { target: { childPath: ["left"], id: "points" } })[0].key;
  assert.equal(items.length, 2); assert.ok(items.every(item => item.representationKeys.includes(parent)));
  assert.doesNotThrow(() => deserializeProgram(serializeProgram(changed)));
});
