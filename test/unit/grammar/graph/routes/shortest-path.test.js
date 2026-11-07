import assert from "node:assert/strict";
import test from "node:test";
import { shortestRoutePath } from "../../../../../src/grammar/graph/routes/shortestPath.js";
import { createRouteBudget } from "../../../../../src/grammar/graph/routes/budget.js";
import { getErrorDetails } from "../../../../../src/core/diagnostics.js";
import { enumerateShortestPath } from "../../../../oracles/shortest-path.js";

function adjacency(edges, extra = []) {
  const result = new Map(extra.map(key => [key, []]));
  edges.forEach(([source, target], edge) => {
    if (!result.has(source)) result.set(source, []);
    if (!result.has(target)) result.set(target, []);
    result.get(source).push({ edge, target });
  });
  return result;
}
const run = (edges, costs, source, target, skip = [], budget = createRouteBudget()) =>
  shortestRoutePath(adjacency(edges, [source, target]), costs, skip, source, target, budget);

test("positive weighted paths match independent enumeration, including ties and reordered adjacency", () => {
  const literal = [[0, 1], [1, 4], [0, 2], [2, 3], [3, 4]], costs = [1, 3, 1, 1, 2];
  assert.deepEqual(enumerateShortestPath(literal, costs, 0, 4), { edges: [0, 1], nodes: [0, 1, 4], cost: 4 });
  assert.deepEqual(run(literal, costs, 0, 4), { edges: [0, 1], nodes: [0, 1, 4], cost: 4 });
  for (let seed = 0; seed < 48; seed++) {
    const count = 4 + seed % 3, edges = [], weights = [];
    for (let a = 0; a < count; a++) for (let b = 0; b < count; b++) if (a !== b && (a * 17 + b * 11 + seed) % 4 < 2) {
      edges.push([a, b]); weights.push(1 + (a + b + seed) % 4);
    }
    const skip = weights.map((_, index) => (index + seed) % 11 === 0), graph = adjacency(edges, [0, count - 1]);
    const before = structuredClone(graph), expected = enumerateShortestPath(edges, weights, 0, count - 1, skip);
    assert.deepEqual(shortestRoutePath(graph, weights, skip, 0, count - 1, createRouteBudget()), expected);
    assert.deepEqual(graph, before);
    const reversed = new Map([...graph].map(([key, values]) => [key, values.slice().reverse()]));
    assert.deepEqual(shortestRoutePath(reversed, weights, skip, 0, count - 1, createRouteBudget()), expected);
  }
});

test("long paths allocate one predecessor per state and reconstruct only the successful output", () => {
  const count = 20_000, edges = Array.from({ length: count }, (_, i) => [i, i + 1]), costs = edges.map(() => 1), budget = createRouteBudget();
  const result = run(edges, costs, 0, count, [], budget);
  assert.equal(result.cost, count);
  assert.deepEqual(result.edges, Array.from({ length: count }, (_, i) => i));
  assert.deepEqual(result.nodes, Array.from({ length: count + 1 }, (_, i) => i));
  assert.ok(budget.diagnostics().work < count * 10, "work must grow linearly for a single chain");
  assert.ok(budget.diagnostics().peakSamples < count * 11, "retained states and output must be bounded");
  const disconnectedBudget = createRouteBudget();
  assert.equal(run(edges, costs, 0, count + 1, [], disconnectedBudget), undefined);
  assert.ok(disconnectedBudget.diagnostics().work < budget.diagnostics().work);
});

test("long equal-cost prefixes keep full ordinal tie order, parallel edges and zero cycles", () => {
  const size = 400, edges = Array.from({ length: size }, (_, i) => [i, i + 1]);
  edges.push([size, size + 1], [size, size + 2], [size + 1, size + 3], [size + 2, size + 3]);
  const costs = edges.map(() => 1), expected = [...Array.from({ length: size }, (_, i) => i), size, size + 2];
  assert.deepEqual(run(edges, costs, 0, size + 3).edges, expected);
  assert.deepEqual(run([[0, 1], [0, 1], [1, 0], [1, 2]], [0, 0, 0, 1], 0, 2), { edges: [0, 3], nodes: [0, 1, 2], cost: 1 });
  assert.deepEqual(run([[0, 1]], [1], 0, 0), { edges: [], nodes: [0], cost: 0 });
});

test("retained state, reconstruction, work and cancellation limits reject before returning partial paths", () => {
  for (const maximum of [7, 8, 16]) {
    assert.throws(() => run([[0, 1]], [1], 0, 1, [], createRouteBudget({ maxSamples: maximum })), error => getErrorDetails(error)?.code === "resource-limit");
  }
  const edges = Array.from({ length: 200 }, (_, i) => [i, i + 1]), costs = edges.map(() => 1), controller = new AbortController();
  const native = createRouteBudget({}, controller.signal); let calls = 0;
  const cancellable = { ...native, charge(value) { if (++calls === 100) controller.abort(); native.charge(value); } };
  assert.throws(() => run(edges, costs, 0, 200, [], cancellable), { name: "AbortError" });
  assert.equal(calls, 100);
  const budget = createRouteBudget(); budget.charge(9_999_998);
  assert.throws(() => run([[0, 1]], [1], 0, 1, [], budget), error => getErrorDetails(error)?.actual === 10_000_003);
  assert.deepEqual(edges[0], [0, 1]);
});
