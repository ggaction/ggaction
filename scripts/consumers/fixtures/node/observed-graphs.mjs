import assert from "node:assert/strict";
import { chart, hconcat } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";

export const cases = [{ id: "data/observed-graph-lifecycle", run() {
  const source = chart().createCanvas({ width: 120, height: 100 })
    .createData({ id: "nodes", values: [{ key: 1 }, { key: "1" }] })
    .createData({ id: "edges", keyField: "id", values: [
      { id: "first", from: 1, to: "1", cost: 0 },
      { id: "second", from: 1, to: "1", cost: -2 }
    ] })
    .createGraphData({ id: "network", nodes: "nodes", edges: "edges", nodeKey: "key", source: "from", target: "to", weight: "cost" });
  const graph = program => program.semanticSpec.resources.find(resource => resource.kind === "graph");
  const restored = deserializeProgram(serializeProgram(source));
  assert.deepEqual(graph(restored), graph(source));
  assert.equal(graph(source).result.model.nodes.length, 2);
  assert.deepEqual(graph(source).result.model.edges.map(edge => edge.weight), [0, -2]);
  const revised = restored.reviseData({ source: "edges", id: "reordered", values: [...restored.semanticSpec.datasets.find(data => data.id === "edges").values].reverse() });
  assert.deepEqual(graph(revised).result.model.edges.map(edge => edge.key), graph(source).result.model.edges.map(edge => edge.key).reverse());
  assert.equal(graph(revised).revision, 1);
  const combined = hconcat({ programs: [{ id: "left", program: source }, { id: "right", program: source }] });
  const edited = combined.editGraphData({ target: { childPath: ["left"], id: "network" }, definition: { directed: true } });
  assert.equal(graph(edited.children.left).result.model.directed, true);
  assert.equal(edited.children.right, source);
  assert.equal(basicChart().createGraphData, undefined);
  assert.throws(() => source.editGraphData({ definition: { target: "missing" } }));
  assert.equal(graph(source).revision, 0);
  for (const [method, options] of [
    ["fixed", { positions: [{ key: 1, x: 0, y: 10 }, { key: "1", x: 20, y: 30 }] }],
    ["circular", { radius: 50 }],
    ["force", { iterations: 3, pinned: [{ key: 1, fx: 0, fy: 10 }] }]
  ]) {
    const placed = source.layoutGraph({ id: "layout", method, options });
    const layout = program => program.semanticSpec.resources.find(item => item.kind === "layout");
    const restored = deserializeProgram(serializeProgram(placed));
    assert.deepEqual(layout(restored), layout(placed));
    const updated = restored.editGraphData({ definition: { directed: true } });
    assert.equal(layout(updated).revision, 1);
    assert.equal(layout(updated).inputs[0].revision, 1);
    assert.equal(layout(placed).revision, 0);
  }
  assert.equal(basicChart().layoutGraph, undefined);
} }];
