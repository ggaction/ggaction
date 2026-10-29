import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { inspectProgram, comparePrograms } from "ggaction/inspection";

const feature = id => ({ type: "Feature", id, properties: { code: id }, geometry: { type: "Point", coordinates: [12.6, 55.7] } });
const values = ids => ({ type: "FeatureCollection", features: ids.map(feature) });
const resource = p => p.semanticSpec.resources.find(r => r.kind === "geometry" && r.id === "places");
function program() {
  return chart().createGeometryData({ id: "places", format: "geojson", coordinateKind: "geographic",
    featureKey: ["properties", "code"], values: values([1, "1"]) });
}

export const cases = [
  { id: "geometry/full-basic-identity", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createGeometryData, undefined); assert.equal(basic().editGeometryData, undefined);
    const p = program(), saved = serializeProgram(p), q = p.editGeometryData({ values: values(["1", 1]) });
    assert.deepEqual(resource(q).result.identity.rowKeys, [...resource(p).result.identity.rowKeys].reverse());
    assert.equal(resource(q).revision, 1); assert.equal(serializeProgram(p), saved);
    assert.ok(comparePrograms(p, q).changes.some(change => change.resource.kind === "geometry" && change.operation === "modify"));
    assert.doesNotThrow(() => inspectProgram(q, { target: { kind: "geometry", id: "places" } }));
    assert.equal(q.removeResource({ kind: "geometry", id: "places" }).semanticSpec.resources.length, 0);
  } },
  { id: "geometry/fresh-process-offline", run() {
    const p = program(), saved = serializeProgram(p);
    const script = `import { readFileSync } from 'node:fs'; import { deserializeProgram, serializeProgram } from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};
      const p=deserializeProgram(readFileSync(0,'utf8')); process.stdout.write(serializeProgram(p.editGeometryData({coordinateKind:'planar'})));`;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 30000 });
    const q = deserializeProgram(output);
    assert.equal(resource(q).options.coordinateKind, "planar"); assert.equal(resource(q).revision, 1);
    assert.deepEqual(resource(q).result.identity.rowKeys, resource(p).result.identity.rowKeys);
    assert.equal(serializeProgram(q), output); assert.equal(serializeProgram(p), saved);
  } },
  { id: "geometry/topology-atomic-failure", run() {
    const p = chart().createGeometryData({ id: "places", format: "topojson", coordinateKind: "planar", values: {
      type: "Topology", transform: { scale: [2, 3], translate: [10, 20] },
      arcs: [[[0, 0], [1, 0], [0, 1]]], objects: { region: { type: "LineString", arcs: [0] } }
    } });
    assert.deepEqual(resource(p).result.features[0].geometry.coordinates, [[10, 20], [12, 20], [12, 23]]);
    assert.equal(resource(p).options.topoObject, "region");
    const saved = serializeProgram(p), q = p.editGeometryData({ limits: { maxPositions: 100 } });
    assert.deepEqual(resource(q).result.identity.rowKeys, resource(p).result.identity.rowKeys);
    assert.throws(() => p.editGeometryData({ values: { type: "Topology", arcs: [], objects: { region: { type: "LineString", arcs: [0] } } } }));
    assert.equal(serializeProgram(p), saved);
    assert.deepEqual(resource(deserializeProgram(saved)).result, resource(p).result);
  } }
];
