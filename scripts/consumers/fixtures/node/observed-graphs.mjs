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
} }];
