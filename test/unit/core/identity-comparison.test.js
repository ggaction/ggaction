import assert from "node:assert/strict";
import test from "node:test";
import { withoutAllocatedIdentity } from "../../support/identity-equivalence.js";
import { chart } from "../../../src/index.js";

test("meaning comparison normalizes allocated geometry namespaces while retaining feature identity and source changes", () => {
  for (const keyed of [false, true]) {
    const create = () => chart().createGeometryData({ id: "shape", format: "geojson", coordinateKind: "planar",
      ...(keyed ? { featureKey: "id" } : {}), values: { type: "FeatureCollection", features: [1, 2].map(id => ({
        type: "Feature", id, properties: { label: String(id) }, geometry: { type: "Point", coordinates: [id, 0] }
      })) } }).semanticSpec;
    const a = create(), b = create(), saved = structuredClone(b);
    assert.deepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(b));
    for (const mutate of [
      r => { r.result.identity.revision++; }, r => { r.result.identity.rowKeys.reverse(); },
      r => { r.result.identity.rowKeys[0] = "forged"; }, r => { r.result.features[0].properties.label = "different"; },
      r => { r.result.features[0].geometry.coordinates[0]++; }, r => { r.result.source.contentHash = "different"; }
    ]) {
      const changed = structuredClone(b); mutate(changed.resources[0]);
      assert.notDeepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(changed));
    }
    assert.deepEqual(b, saved);
  }
});

function state(namespace) {
  return { datasets: [{ id: "rows", values: [{ x: 1 }], logicalId: namespace, revision: 0,
    keySpec: { mode: "generated" }, rowKeys: [JSON.stringify(["generated", namespace, 0])] }],
  provenance: [{ data: "rows", logicalDataId: namespace, revision: 0, role: "hierarchy", rowKey: JSON.stringify(["generated", namespace, 0]) }] };
}
test("meaning comparison normalizes proven allocated row references without hiding stale lineage", () => {
  const a = state("a"), b = state("b");
  assert.deepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(b));
  for (const patch of [{ revision: 1 }, { logicalDataId: "orphan" }, { rowKey: "missing" }, { data: "absent" }]) {
    const invalid = state("b"); Object.assign(invalid.provenance[0], patch);
    assert.notDeepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(invalid));
  }
  const wrongRow = state("b"); wrongRow.datasets[0].values.push({ x: 2 }); wrongRow.datasets[0].rowKeys.push('["generated","b",1]');
  wrongRow.provenance[0].rowKey = wrongRow.datasets[0].rowKeys[1];
  const corresponding = state("a"); corresponding.datasets[0].values.push({ x: 2 }); corresponding.datasets[0].rowKeys.push('["generated","a",1]');
  assert.notDeepEqual(withoutAllocatedIdentity(corresponding), withoutAllocatedIdentity(wrongRow));
});

test("meaning comparison normalizes proven graph occurrences and retains forged keys and lineage", () => {
  const create = () => chart()
    .createData({ id: "nodes", values: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] })
    .createData({ id: "edges", values: [{ from: "a", to: "b" }, { from: "a", to: "b" }] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", attributes: ["label"] }).semanticSpec;
  const first = create(), second = create(), snapshot = structuredClone(first);
  const resource = value => value.resources.find(item => item.kind === "graph");
  assert.notEqual(resource(first).result.model.edges[0].key, resource(second).result.model.edges[0].key);
  assert.deepEqual(withoutAllocatedIdentity(first), withoutAllocatedIdentity(second));
  for (const mutate of [
    graph => { graph.result.model.edges[0].key = "forged"; },
    graph => { graph.result.model.edges[0].sourceRows = [1]; },
    graph => { graph.result.model.adjacency[0].outgoing[0] = "orphan"; },
    graph => { graph.provenance.sourceRows[0].logicalDataId = "orphan"; },
    graph => { graph.inputs[1].revision += 1; },
    graph => { graph.result.model.nodes[0].attributes.label = "changed"; }
  ]) {
    const changed = structuredClone(second); mutate(resource(changed));
    assert.notDeepEqual(withoutAllocatedIdentity(first), withoutAllocatedIdentity(changed));
  }
  // Arbitrary user strings, even strings shaped exactly like allocated keys,
  // must never be normalized as identity references.
  const userFirst = structuredClone(first), userSecond = structuredClone(second);
  for (const value of [userFirst, userSecond]) {
    const graph = resource(value);
    graph.result.model.nodes[0].attributes.label = graph.result.model.edges[0].key;
  }
  assert.notDeepEqual(withoutAllocatedIdentity(userFirst), withoutAllocatedIdentity(userSecond));
  assert.deepEqual(first, snapshot);
});

test("meaning comparison retains geographic join correspondence and table changes", () => {
  const create = () => chart()
    .createData({ id: "table", values: [{ code: 1, value: 4 }, { code: 2, value: 8 }] })
    .createGeometryData({ id: "shape", format: "geojson", coordinateKind: "planar", values: {
      type: "FeatureCollection", features: [1, 2].map(id => ({ type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates: [id, 0] } }))
    } }).createGeoJoinData({ id: "joined", geometryKey: "id", dataKey: "code" }).semanticSpec;
  const a = create(), b = create(), saved = structuredClone(b);
  assert.deepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(b));
  for (const mutate of [
    r => { r.result.rowMap.reverse(); }, r => { r.result.diagnostics.coverage = 0; },
    r => { r.inputs[1].revision++; }, r => { r.result.identity.rowKeys.reverse(); },
    r => { r.result.identity.revision++; }, r => { r.result.features[0].geometry.coordinates[0]++; }
  ]) {
    const changed = structuredClone(b); mutate(changed.resources.find(r => r.id === "joined"));
    assert.notDeepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(changed));
  }
  const changed = structuredClone(b); changed.datasets[0].values[0].value++;
  assert.notDeepEqual(withoutAllocatedIdentity(a), withoutAllocatedIdentity(changed));
  assert.deepEqual(b, saved);
});
