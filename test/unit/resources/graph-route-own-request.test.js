import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { prepareGraphEdgeRoutes } from "../../../src/graph.js";
import { serializeProgram } from "../../../src/persistence.js";
import { normalizeEdgeRouteRequest } from "../../../src/materialization/graph/routeRequest.js";

const source = () => chart().createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }] })
  .createData({ id: "edges", values: [{ source: "a", target: "b" }] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "source", target: "target" })
  .layoutGraph({ id: "layout", method: "circular" });

test("route creation and edit resolve missing options from own data without evaluating inherited getters", () => {
  const base = source(), routed = base.bundleGraphEdges({ id: "routes", method: "edge-path" });
  const before = [serializeProgram(base), serializeProgram(routed)];
  const request = Object.freeze({ id: "routes", method: "edge-path" });
  const edit = Object.freeze({ options: Object.freeze({ exponent: 3 }) });
  const expected = normalizeEdgeRouteRequest(base, request, false).resolved;
  for (const key of ["graph", "layout", "options", "coordinateSpace", "target", "hierarchy", "hierarchyLayout", "limits", "mapping", "zeroLength"]) {
    let reads = 0;
    const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, key);
    Object.defineProperty(Object.prototype, key, { configurable: true, get() { reads++; throw new Error(`Inherited ${key} read`); } });
    try {
      assert.deepEqual(normalizeEdgeRouteRequest(base, request, false).resolved, expected);
      const next = normalizeEdgeRouteRequest(routed, edit, true).resolved;
      assert.equal(next.revision, 1);
      assert.deepEqual(next.intent.options, { ...expected.intent.options, exponent: 3 });
      assert.equal(reads, 0, key);
    } finally { if (descriptor) Object.defineProperty(Object.prototype, key, descriptor); else delete Object.prototype[key]; }
  }
  const merged = normalizeEdgeRouteRequest(routed, { options: { limits: { maxSamples: 1000 } } }, true).resolved;
  assert.equal(merged.intent.options.limits.maxSamples, 1000);
  assert.equal(merged.intent.options.limits.maxEdges, expected.intent.options.limits.maxEdges);
  for (const args of [{ options: null }, { options: undefined }, { options: { exponent: undefined } }, { options: { exponent: null } }]) assert.throws(() => normalizeEdgeRouteRequest(routed, args, true), /null or undefined/);
  let reads = 0;
  assert.throws(() => normalizeEdgeRouteRequest(routed, { options: { get limits() { reads++; return {}; } } }, true), /accessors/);
  assert.throws(() => normalizeEdgeRouteRequest(routed, { options: { limits: { get maxSamples() { reads++; return 1000; } } } }, true), /accessors/);
  assert.equal(reads, 0);
  assert.deepEqual([serializeProgram(base), serializeProgram(routed)], before);
  assert.deepEqual(edit, { options: { exponent: 3 } });
});


test("public route preparation excludes inherited hierarchy during completion validation", async () => {
  const base = source(), request = { kind: "create", id: "routes", method: "edge-path" };
  const expected = await prepareGraphEdgeRoutes(base, request, { requestToken: "baseline" });
  let reads = 0;
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, "hierarchy");
  Object.defineProperty(Object.prototype, "hierarchy", { configurable: true, get() { reads++; throw new Error("Inherited hierarchy read"); } });
  try {
    const prepared = await prepareGraphEdgeRoutes(base, request, { requestToken: "own" });
    assert.equal(prepared.inputHash, expected.inputHash);
    assert.equal(reads, 0);
  } finally { if (previous) Object.defineProperty(Object.prototype, "hierarchy", previous); else delete Object.prototype.hierarchy; }
});
