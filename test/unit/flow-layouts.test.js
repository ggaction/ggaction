import test from "node:test";
import assert from "node:assert/strict";
import { createGraphModel } from "../../src/grammar/graph/model.js";
import { normalizeObservedGraph } from "../../src/grammar/graph/normalize.js";
import { summarizeFlow } from "../../src/grammar/flow/model.js";
import { layoutFlow } from "../../src/grammar/flow/layout.js";

function graph(keys, edges, selfLoops = false) {
  return createGraphModel(keys.map(key => ({ key, attributes: {}, sourceRows: [] })),
    edges.map(([key, sourceKey, targetKey, weight]) => ({ key, sourceKey, targetKey, weight,
      directed: true, origin: "observed", ruleId: null, sourceRows: [] })), { directed: true, selfLoops });
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("flow totals preserve terminals, internal imbalance and zero edges", () => {
  const model = graph(["a", "b", "c", "isolated"], [["ab", "a", "b", 3], ["bc", "b", "c", 2], ["ac", "a", "c", 0]]);
  assert.deepEqual(summarizeFlow(model).nodes, [
    { key: "a", incoming: 0, outgoing: 3, throughput: 3, imbalance: -3 },
    { key: "b", incoming: 3, outgoing: 2, throughput: 3, imbalance: 1 },
    { key: "c", incoming: 2, outgoing: 0, throughput: 2, imbalance: 2 },
    { key: "isolated", incoming: 0, outgoing: 0, throughput: 0, imbalance: 0 }
  ]);
  assert.throws(() => summarizeFlow(model, { balance: "strict" }), /conservation/);
  assert.equal(model.edges.length, 3);
});

test("strict flow accepts source and sink and ordinary floating point sums", () => {
  const model = graph(["a", "b", "c"], [["ab1", "a", "b", .1], ["ab2", "a", "b", .2], ["bc", "b", "c", .3]]);
  close(summarizeFlow(model, { balance: "strict" }).nodes[1].throughput, .3);
  assert.throws(() => summarizeFlow(graph(["a", "b"], [["e", "a", "b", -1]])), /nonnegative/);
  assert.throws(() => summarizeFlow(graph(["a", "b"], [["e1", "a", "b", 1e308], ["e2", "a", "b", 1e308]])), /finite/);
});

test("a literal three-column flow has one common thickness scale", () => {
  const model = graph(["a", "b", "c"], [["ab", "a", "b", 4], ["bc", "b", "c", 4]]);
  const result = layoutFlow(model, "dag", { width: 100, height: 80, nodeWidth: 10, nodePadding: 0, iterations: 0 });
  assert.equal(result.scale, 20);
  assert.deepEqual(result.nodes.map(({ key, x, y, width, height, rank }) => ({ key, x, y, width, height, rank })), [
    { key: "a", x: 0, y: 0, width: 10, height: 80, rank: 0 },
    { key: "b", x: 45, y: 0, width: 10, height: 80, rank: 1 },
    { key: "c", x: 90, y: 0, width: 10, height: 80, rank: 2 }
  ]);
  assert.deepEqual(result.edges.map(edge => edge.thickness), [80, 80]);
  assert.deepEqual(result.edges.map(edge => [edge.source, edge.target]), [
    [{ x: 10, y: 40 }, { x: 45, y: 40 }], [{ x: 55, y: 40 }, { x: 90, y: 40 }]
  ]);
});

test("branching columns share capacity and attachment intervals stay inside nodes", () => {
  const model = graph(["a", "b", "c"], [["ab", "a", "b", 3], ["ac", "a", "c", 1]]);
  const result = layoutFlow(model, "dag", { width: 100, height: 80, nodeWidth: 10, nodePadding: 8, iterations: 0 });
  assert.equal(result.scale, 18);
  assert.deepEqual(result.nodes.map(node => [node.y, node.height]), [[4, 72], [0, 54], [62, 18]]);
  assert.deepEqual(result.edges.map(edge => [edge.thickness, edge.source.y, edge.target.y]), [[54, 31, 27], [18, 67, 71]]);
  for (const edge of result.edges) for (const role of ["source", "target"]) {
    const node = result.nodes.find(node => node.key === edge[`${role}Key`]);
    assert.ok(edge[role].y - edge.thickness / 2 >= node.y - 1e-9);
    assert.ok(edge[role].y + edge.thickness / 2 <= node.y + node.height + 1e-9);
  }
});

test("dag rejects every cycle including zero flows and self loops", () => {
  assert.throws(() => layoutFlow(graph(["a", "b"], [["ab", "a", "b", 0], ["ba", "b", "a", 0]]), "dag"), /cycle/);
  assert.throws(() => layoutFlow(graph(["a"], [["aa", "a", "a", 0]], true), "dag"), /cycle/);
});

test("cyclic routing retains all SCC, parallel and self-loop edges with disjoint lanes", () => {
  const model = graph(["a", "b", "c"], [["ab", "a", "b", 2], ["ba", "b", "a", 2], ["bc", "b", "c", 1], ["aa", "a", "a", 0]], true);
  const result = layoutFlow(model, "cyclic", { width: 100, height: 100, nodeWidth: 10, nodePadding: 10, iterations: 0 });
  assert.equal(result.scale, 18);
  assert.deepEqual(result.components.map(component => component.keys), [["a", "b"], ["c"]]);
  assert.deepEqual(result.nodes.map(node => node.rank), [0, 0, 1]);
  assert.deepEqual(result.edges.map(edge => [edge.key, edge.route, edge.thickness]), [["ab", "feedback", 36], ["ba", "feedback", 36], ["bc", "forward", 18], ["aa", "loop", 0]]);
  assert.ok(result.bounds.top < 0 && result.bounds.bottom > 100);
  const lanes = result.edges.filter(edge => edge.lane !== null);
  assert.equal(new Set(lanes.map(edge => `${edge.lane.side}:${edge.lane.index}`)).size, 3);
  assert.deepEqual(layoutFlow(model, "cyclic", { width: 100, height: 100, nodeWidth: 10, nodePadding: 10, iterations: 0 }), result);
});

test("empty and all-zero flows produce finite results without deleting semantic items", () => {
  const empty = layoutFlow(graph([], []), "dag");
  assert.equal(empty.scale, 0); assert.deepEqual(empty.nodes, []); assert.deepEqual(empty.edges, []);
  const zero = layoutFlow(graph(["a", "b", "c"], [["ab", "a", "b", 0]]), "dag");
  assert.equal(zero.nodes.length, 3); assert.equal(zero.edges.length, 1); assert.equal(zero.scale, 0);
  assert.ok(zero.nodes.every(node => [node.x, node.y, node.width, node.height].every(Number.isFinite)));
  assert.throws(() => layoutFlow(graph(["a", "b"], []), "dag", { height: 1, nodePadding: 2 }), /padding/);
});

test("orientation transposes the same layout without changing flow values or order", () => {
  const model = graph(["a", "b", "c"], [["ab", "a", "b", 3], ["ac", "a", "c", 1]]);
  const horizontal = layoutFlow(model, "dag", { width: 100, height: 80 });
  const vertical = layoutFlow(model, "dag", { width: 80, height: 100, orientation: "vertical" });
  assert.equal(vertical.scale, horizontal.scale);
  assert.deepEqual(vertical.nodes.map(node => [node.x, node.y, node.width, node.height]), horizontal.nodes.map(node => [node.y, node.x, node.height, node.width]));
  assert.deepEqual(vertical.edges.map(edge => [edge.source.x, edge.source.y]), horizontal.edges.map(edge => [edge.source.y, edge.source.x]));
});

test("fixed iteration relaxation stays deterministic, bounded and nonoverlapping", () => {
  const model = graph(["a", "b", "c", "d", "e"], [["ae", "a", "e", 1], ["bc", "b", "c", 3], ["cd", "c", "d", 3], ["de", "d", "e", 2]]);
  for (const align of ["left", "right", "center", "justify"]) for (const order of ["input", "barycentric"]) {
    const options = { width: 200, height: 100, nodeWidth: 12, nodePadding: 3, align, order, iterations: 20 };
    const result = layoutFlow(model, "dag", options);
    assert.deepEqual(result, layoutFlow(model, "dag", options));
    for (const column of result.columns) {
      const nodes = column.keys.map(key => result.nodes.find(node => node.key === key));
      assert.ok(nodes.every(node => node.y >= -1e-9 && node.y + node.height <= 100 + 1e-9));
      nodes.slice(1).forEach((node, index) => assert.ok(node.y >= nodes[index].y + nodes[index].height + 3 - 1e-9));
    }
  }
});

test("flow boundaries reject malformed descriptors and impossible budgets without changing input", () => {
  const model = graph(["a", "b"], [["ab", "a", "b", 1]]), before = JSON.stringify(model);
  let called = false;
  const options = { get width() { called = true; return 100; } };
  assert.throws(() => layoutFlow(model, "dag", options), /accessors/);
  assert.equal(called, false);
  for (const invalid of [{ unknown: 1 }, { iterations: 1001 }, { width: 0 }, { nodeWidth: 601 }, { nodePadding: -1 }, { laneGap: Infinity }, { orientation: "diagonal" }, { order: "key" }, { align: "auto" }, { maxNodes: 1 }, { height: undefined }]) {
    assert.throws(() => layoutFlow(model, "dag", invalid));
  }
  assert.throws(() => layoutFlow(model, "unknown"));
  assert.equal(JSON.stringify(model), before);
});

test("explicit typed node order preserves distinct numeric, string and tuple keys", () => {
  const model = normalizeObservedGraph([{ key: 1 }, { key: "1" }, { key: [1, "1"] }], [], { directed: true });
  const order = [[1, "1"], "1", 1];
  const result = layoutFlow(model, "dag", { order });
  assert.deepEqual(result.columns[0].keys, [model.nodes[2].key, model.nodes[1].key, model.nodes[0].key]);
  assert.throws(() => layoutFlow(model, "dag", { order: [1, 1, "1"] }), /unique/);
  assert.throws(() => layoutFlow(model, "dag", { order: [1, "1"] }), /every graph node/);
  assert.throws(() => layoutFlow(model, "dag", { order: [1, "1", false] }), /every graph node/);
  assert.deepEqual(order, [[1, "1"], "1", 1]);
});

test("long chains use bounded iterative topology and iteration work is charged", () => {
  const keys = Array.from({ length: 5000 }, (_, index) => `n${index}`);
  const model = graph(keys, keys.slice(1).map((key, index) => [`e${index}`, keys[index], key, 1]));
  const result = layoutFlow(model, "dag", { iterations: 0 });
  assert.equal(result.nodes.length, 5000); assert.equal(result.nodes[4999].rank, 4999);
  assert.throws(() => layoutFlow(model, "dag", { iterations: 1000 }), error => error.message.includes("10000000"));
  assert.throws(() => summarizeFlow(createGraphModel([], [], { directed: false, selfLoops: false })), /directed/);
  assert.throws(() => summarizeFlow(model, { balance: "auto" }), /balance/);
  assert.throws(() => layoutFlow(graph(["a", "b"], [["e", "a", "b", Number.MIN_VALUE]]), "dag", { height: Number.MAX_VALUE }), /finite/);
});
