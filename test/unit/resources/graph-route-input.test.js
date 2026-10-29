import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { resolveRouteInput } from "../../../src/materialization/graph/routeInput.js";
import { createRouteJob, computeRouteJob } from "../../../src/grammar/graph/routes/job.js";
import { validateRouteResult } from "../../../src/grammar/graph/routes/result.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";

const resource = (p, kind, id) => p.semanticSpec.resources.find(r => r.kind === kind && r.id === id);
const route = (p, intent = { method: "edge-path" }, hierarchy, hierarchyLayout) => resolveRouteInput(p,
  resource(p, "graph", "graph"), resource(p, "layout", "layout"), intent, hierarchy, hierarchyLayout);
const source = explicit => chart().createData({ id: "nodes", values: [{ key: 10 }, { key: 2 }, { key: "2" }] })
  .createData({ id: "edges", values: [{ id: 10, s: 10, t: "2" }, { id: 2, s: 10, t: 2 }, { id: "2", s: 2, t: "2" }], keyField: "id" })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t", ...(explicit ? { edgeKey: "id" } : {}) })
  .layoutGraph({ id: "layout", method: "circular" });

test("route source adapter preserves original edge order while sorting explicit typed keys and stable occurrence identities", () => {
  const p = source(true), before = serializeProgram(p), input = route(p);
  assert.deepEqual(input.input.order, { nodes: [1, 0, 2], edges: [1, 0, 2] });
  assert.deepEqual(input.inputs, [{ kind: "graph", id: "graph", revision: 0 }, { kind: "layout", id: "layout", revision: 0 }]);
  const job = createRouteJob(input), result = computeRouteJob(job);
  assert.deepEqual(result.result.routes.map(r => r.edgeKey), resource(p, "graph", "graph").result.model.edges.map(e => e.key));
  assert.deepEqual(validateRouteResult(job, result), result);
  assert.equal(serializeProgram(p), before);
  const occurrence = source(false), prior = route(occurrence);
  const revised = occurrence.reviseData({ source: "edges", id: "reordered", values: [...occurrence.semanticSpec.datasets.find(d => d.id === "edges").values].reverse() });
  assert.deepEqual(route(revised).input.order.edges, [...prior.input.order.edges].reverse());
  assert.deepEqual(route(revised).inputs.map(ref => ref.revision), [1, 1]);
});

test("route adapter uses original typed endpoint ordering for inferred edges without decoding their opaque identities", () => {
  const p = chart().createData({ id: "rows", values: [{ id: 10, group: "one" }, { id: 2, group: "one" }, { id: "2", group: "one" }] })
    .createInferredGraphData({ id: "graph", data: "rows", nodeKey: "id", ruleId: "near", rule: "group", options: { fields: ["group"] } })
    .layoutGraph({ id: "layout", method: "circular" });
  const input = route(p), job = createRouteJob(input), result = computeRouteJob(job);
  assert.deepEqual(input.input.order.nodes, [1, 0, 2]);
  assert.deepEqual(new Set(input.input.order.edges), new Set([0, 1, 2]));
  assert.equal(validateRouteResult(job, result).result.routes.length, 3);
});

function hierarchyProgram(method) {
  let p = chart().createData({ id: "tree-data", values: [{ key: "root", parent: null, value: 0 }, { key: "a", parent: "root", value: 1 }, { key: "b", parent: "root", value: 1 }] })
    .createHierarchyData({ id: "hierarchy", data: "tree-data", key: "key", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "tree-layout", method, options: method === "tree"
      ? { nodeSize: [10, 10], siblingGap: 10, depthGap: 20, orientation: "vertical" }
      : { size: [150, 100], padding: 0, method: "slice-dice" } });
  const layout = resource(p, "layout", "tree-layout");
  const positions = ["a", "b"].map(key => { const node = layout.result.nodes.find(node => node.key === encodeRowKey(key));
    return { key, x: method === "tree" ? node.x : node.rect.x0 / 2 + node.rect.x1 / 2, y: method === "tree" ? node.y : node.rect.y0 / 2 + node.rect.y1 / 2 }; });
  return p.createData({ id: "nodes", values: [{ key: "a" }, { key: "b" }] }).createData({ id: "edges", values: [{ s: "a", t: "b" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "key", source: "s", target: "t" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions } });
}

test("hierarchical route anchors reuse tree positions and treemap centers with exact input revisions", () => {
  for (const method of ["tree", "treemap"]) {
    const p = hierarchyProgram(method), hierarchy = resource(p, "hierarchy", "hierarchy"), layout = resource(p, "layout", "tree-layout");
    const input = route(p, { method: "hierarchical", options: { mapping: ["a", "b"].map(key => ({ nodeKey: key, hierarchyKey: key })) } }, hierarchy, layout);
    assert.deepEqual(input.inputs.map(ref => ref.kind), ["graph", "layout", "hierarchy", "layout"]);
    const job = createRouteJob(input), result = computeRouteJob(job);
    assert.equal(validateRouteResult(job, result).result.routes[0].provenance.hierarchyKeys.length, 3);
  }
});

test("route adapter rejects mismatched layout revisions, incompatible hierarchy anchors and unexpected dependencies", () => {
  const p = source(true), graph = resource(p, "graph", "graph"), layout = resource(p, "layout", "layout");
  for (const bad of [{ ...layout, inputs: [] }, { ...layout, inputs: [{ kind: "graph", id: graph.id, revision: 99 }] },
    { ...layout, options: { method: "dag" } }]) assert.throws(() => resolveRouteInput(p, graph, bad, { method: "density" }), /exact graph/);
  assert.throws(() => route(p, { method: "density" }, {}), /Only hierarchical/);
  assert.throws(() => route(p, { method: "hierarchical", options: { mapping: [] } }), /exact hierarchy/);
  const h = hierarchyProgram("tree"), hierarchy = resource(h, "hierarchy", "hierarchy"), tree = resource(h, "layout", "tree-layout");
  const intent = { method: "hierarchical", options: { mapping: ["a", "b"].map(key => ({ nodeKey: key, hierarchyKey: key })) } };
  assert.throws(() => route(h, intent, hierarchy, { ...tree, options: { method: "partition" } }), /anchors/);
  const shifted = { ...tree, result: { ...tree.result, nodes: tree.result.nodes.map(node => ({ ...node, x: node.x + 1 })) } };
  assert.throws(() => createRouteJob(route(h, intent, hierarchy, shifted)), /match graph node/);
});
