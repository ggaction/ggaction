import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGraphLayout, graphLayoutKernelOptions } from "../../../../src/grammar/graph/layoutOptions.js";
import { createGraphLayoutResource } from "../../../../src/materialization/graph/layoutResource.js";
import { chart } from "../../../../src/index.js";
const graph = () => chart().createData({ id: "nodes", values: [{ id: 1 }, { id: "1" }] })
  .createData({ id: "edges", values: [{ source: 1, target: "1" }] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target" }).semanticSpec.resources[0];

test("graph layout options preserve typed authoring keys and resolve fixed, circular and force intent", () => {
  const input = { positions: [{ key: 1, x: 2, y: 3 }, { key: "1", x: 5, y: 7 }] };
  const fixed = normalizeGraphLayout("fixed", input), kernels = graphLayoutKernelOptions(fixed);
  assert.deepEqual(fixed.options.positions, input.positions);
  assert.notEqual(kernels.positions[0].key, kernels.positions[1].key);
  assert.equal(Object.isFrozen(input.positions), false);
  assert.deepEqual(normalizeGraphLayout("circular").options.center, [0, 0]);
  const force = normalizeGraphLayout("force", { seed: 7, iterations: 0, initialPositions: input.positions, pinned: [{ key: 1, fx: 2, fy: 3 }] });
  assert.equal(force.options.seed, 7); assert.equal(force.options.damping, .9);
  assert.equal(force.options.pinned[0].key, 1);
});

test("graph layout resources store exact input revisions and deterministic coordinates without changing topology", () => {
  const source = graph(), before = JSON.stringify(source);
  const fixed = createGraphLayoutResource({ id: "fixed", graph: source, intent: { method: "fixed", options: { positions: [{ key: 1, x: 2, y: 3 }, { key: "1", x: 5, y: 7 }] } } });
  assert.deepEqual(fixed.result.nodes.map(({ x, y }) => [x, y]), [[2, 3], [5, 7]]);
  assert.deepEqual(fixed.inputs, [{ kind: "graph", id: "graph", revision: 0 }]);
  const circular = createGraphLayoutResource({ id: "circle", graph: source, intent: { method: "circular", options: { radius: 2 } } });
  assert.deepEqual(circular.result.nodes.map(({x,y})=>[Math.round(x),Math.round(y)]), [[0, -2], [0, 2]]);
  const config = { id: "force", graph: source, intent: { method: "force", options: { iterations: 3, pinned: [{ key: 1, fx: 9, fy: 8 }] } } };
  const a = createGraphLayoutResource(config), b = createGraphLayoutResource(config);
  assert.deepEqual(a, b); assert.deepEqual(a.result.nodes[0], { key: source.result.model.nodes[0].key, x: 9, y: 8 });
  assert.equal(a.result.algorithm, "exact-pair-spring@1");
  assert.equal(JSON.stringify(source), before);
});

test("graph layout normalization rejects unknown, missing, nonfinite and duplicate-key options", () => {
  for (const [method, options] of [["unknown", {}], ["fixed", {}], ["fixed", { positions: [{ key: 1, x: 1, y: 2 }, { key: 1, x: 3, y: 4 }] }],
    ["fixed", { positions: [{ key: 1, x: Infinity, y: 0 }] }], ["fixed", { positions: [{ x: 1, y: 2 }] }],
    ["circular", { radius: -1 }], ["circular", { center: [0] }], ["circular", { startAngle: NaN }], ["circular", { radius: undefined }],
    ["force", { damping: 2 }], ["force", { iterations: -1 }], ["force", { unexpected: true }]]) assert.throws(() => normalizeGraphLayout(method, options));
  assert.throws(() => createGraphLayoutResource({ id: "fixed", graph: graph(), intent: { method: "fixed", options: { positions: [{ key: "absent", x: 1, y: 2 }] } } }));
});

test("graph layout defaults never read inherited option getters", () => {
  let calls = 0;
  for (const key of ["center", "radius", "startAngle", "pinned", "initialPositions", "positions"]) {
    Object.defineProperty(Object.prototype, key, { configurable: true, get() { calls++; throw new Error("inherited option"); } });
    try {
      assert.deepEqual(normalizeGraphLayout("circular").options.center, [0, 0]);
      assert.deepEqual(normalizeGraphLayout("force").options.pinned, []);
    } finally { delete Object.prototype[key]; }
  }
  assert.equal(calls, 0);
});
