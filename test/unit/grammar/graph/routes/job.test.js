import assert from "node:assert/strict";
import test from "node:test";
import { normalizeObservedGraph } from "../../../../../src/grammar/graph/normalize.js";
import { normalizeHierarchyNodes } from "../../../../../src/grammar/hierarchy/normalize.js";
import { normalizeRouteIntent } from "../../../../../src/grammar/graph/routes/options.js";
import { createRouteJob, validateRouteJob, computeRouteJob, routeValueHash } from "../../../../../src/grammar/graph/routes/job.js";
import { validateRouteResult } from "../../../../../src/grammar/graph/routes/result.js";

const methods = ["hierarchical", "force-directed", "density", "edge-path"];
function payload(method, { empty = false, zero = false, options = {}, coordinateSpace = "world" } = {}) {
  const keys = empty ? [] : ["a", "b", "c"];
  const model = normalizeObservedGraph(keys.map(key => ({ key })), empty ? [] : [
    { key: 10, sourceKey: "a", targetKey: "c" }, { key: 2, sourceKey: "a", targetKey: "b" }, { key: "2", sourceKey: "b", targetKey: "c" }
  ], { directed: true, selfLoops: true });
  const positions = model.nodes.map((node, i) => ({ key: node.key, x: zero ? -0 : i, y: zero ? 0 : i === 1 ? 1 : 0 }));
  const mapping = keys.map(key => ({ nodeKey: key, hierarchyKey: key }));
  const intent = normalizeRouteIntent(method, { ...(method === "hierarchical" ? { mapping } : {}), ...options }, coordinateSpace);
  const inputs = [{ kind: "graph", id: "graph", revision: 2 }, { kind: "layout", id: "layout", revision: 4 }];
  const result = { inputs, intent, input: { model, positions, order: { nodes: keys, edges: empty ? [] : [10, 2, "2"] }, limits: intent.options.limits } };
  if (method === "hierarchical") {
    const hierarchy = normalizeHierarchyNodes([{ key: "root", parentKey: null, value: 1 }, ...keys.map(key => ({ key, parentKey: "root", value: 1 }))], { forest: false });
    result.inputs.push({ kind: "hierarchy", id: "hierarchy", revision: 1 }, { kind: "layout", id: "tree", revision: 1 });
    result.hierarchy = { model: hierarchy, mapping: model.nodes.map(node => ({ nodeKey: node.key, hierarchyKey: node.key })), positions: hierarchy.nodes.map(node => positions.find(position => position.key === node.key) ?? { key: node.key, x: 1, y: 2 }) };
  }
  return result;
}
const completion = (method, options) => { const job = createRouteJob(payload(method, options)); return { job, envelope: computeRouteJob(job) }; };
function corrupt(job, envelope, mutation, pattern) {
  const copy = structuredClone(envelope); mutation(copy);
  assert.throws(() => validateRouteResult(job, copy), pattern);
}

test("route completion validates all four algorithms and immutable input revision digests without executing a solver on restore", () => {
  for (const method of methods) {
    const { job, envelope } = completion(method), original = structuredClone(envelope);
    assert.deepEqual(validateRouteResult(job, structuredClone(envelope)), envelope);
    assert.deepEqual(envelope, original);
    assert.ok(Object.isFrozen(envelope.result.routes[0].commands[0]));
    assert.equal(envelope.inputHash, job.inputHash);
    assert.equal(envelope.resultHash, routeValueHash(envelope.result));
    assert.deepEqual(computeRouteJob(structuredClone(job)), envelope);
    for (const variant of [{ empty: true }, { zero: true }, ...(method === "hierarchical" ? [{ options: { strength: 0 } }] : [])]) {
      const result = completion(method, variant);
      assert.deepEqual(validateRouteResult(result.job, result.envelope), result.envelope);
    }
  }
});

test("route job digest binds revisions, options, signed-zero anchors, coordinate space and viewport", () => {
  const base = payload("edge-path"), before = structuredClone(base), job = createRouteJob(base);
  for (const change of [value => value.inputs[0].revision++, value => value.input.positions[0].x = -0,
    value => value.intent = normalizeRouteIntent("edge-path", { exponent: 3 })]) {
    const next = structuredClone(base); change(next);
    assert.notEqual(createRouteJob(next).inputHash, job.inputHash);
  }
  const screen = payload("edge-path", { coordinateSpace: "screen" });
  const viewport = { x: 10, y: 20, width: 300, height: 200 };
  const a = createRouteJob(screen, viewport), b = createRouteJob(screen, { ...viewport, width: 301 });
  assert.notEqual(a.inputHash, b.inputHash); assert.notEqual(a.inputHash, job.inputHash);
  base.input.positions[0].x = 55;
  assert.equal(job.input.positions[0].x, before.input.positions[0].x);
  assert.throws(() => computeRouteJob(job, AbortSignal.abort()), /abort/i);
});

test("route intent and job reject ambiguous shapes, invalid keys, getters and forged work envelopes", () => {
  for (const run of [
    () => normalizeRouteIntent("constructor"), () => normalizeRouteIntent("density", {}, "map"),
    () => normalizeRouteIntent("density", { zeroLength: null }), () => normalizeRouteIntent("density", { mapping: [] }),
    () => normalizeRouteIntent("hierarchical", { mapping: [{ nodeKey: "a" }] }),
    () => normalizeRouteIntent("hierarchical", { mapping: [{ nodeKey: "a", hierarchyKey: ["a"] }] }),
    () => normalizeRouteIntent("hierarchical", { mapping: [{ nodeKey: "a", hierarchyKey: "a" }, { nodeKey: "a", hierarchyKey: "b" }] })
  ]) assert.throws(run);
  const good = createRouteJob(payload("edge-path"));
  for (const change of [value => delete value.viewport, value => value.schemaVersion++, value => value.algorithmVersion = "other",
    value => value.inputHash = "0".repeat(64), value => value.callback = 1]) {
    const bad = structuredClone(good); change(bad); assert.throws(() => validateRouteJob(bad));
  }
  for (const change of [value => value.inputs.pop(), value => value.inputs[0].kind = "layout",
    value => value.input.limits = { ...value.input.limits, maxSamples: 100 }, value => value.hierarchy = {}, value => value.input.order.edges = [1, 1, 2]]) {
    const bad = structuredClone(payload("edge-path")); change(bad); assert.throws(() => createRouteJob(bad));
  }
  const duplicate = structuredClone(payload("hierarchical")); duplicate.inputs[3] = duplicate.inputs[1];
  assert.throws(() => createRouteJob(duplicate), /unique resource/);
  const mapping = structuredClone(payload("hierarchical")); mapping.intent.options.mapping.reverse();
  assert.throws(() => createRouteJob(mapping), /mapping disagrees/);
  const missing = payload("hierarchical"); delete missing.hierarchy;
  assert.throws(() => createRouteJob(missing), /hierarchy/);
  assert.throws(() => createRouteJob(payload("edge-path"), {}), /World/);
  assert.throws(() => createRouteJob(payload("edge-path", { coordinateSpace: "screen" }), { x: 0, y: 0, width: -1, height: 5 }), /viewport/);
  let called = 0;
  const bad = payload("hierarchical");
  Object.defineProperty(bad.hierarchy.positions[0], "x", { enumerable: true, get() { called++; return 1; } });
  assert.throws(() => createRouteJob(bad), /accessor/); assert.equal(called, 0);
});

test("stored route completion rejects stale geometry, partial results and malformed descriptors before reading them", () => {
  const { job, envelope } = completion("edge-path");
  for (const change of [value => value.inputHash = "stale", value => value.resultHash = "stale",
    value => value.result.complete = false, value => value.result.routes.pop(), value => value.result.routes.reverse(),
    value => value.result.routes[0].commands[0].x++, value => value.result.routes[0].controlPoints[0].x++,
    value => value.result.routes[0].commands[1].op = "C", value => value.result.routes[0].commands[1].x = Infinity,
    value => value.result.routes[0].commands = [], value => value.result.routes[0].bounds.right++,
    value => value.result.options.exponent = 3, value => value.result.options.extra = 1,
    value => value.result.routes[0].provenance.algorithmVersion = "other", value => value.result.routes[0].provenance.reason = "unknown",
    value => value.result.routes[0].provenance.reason = "zero-length", value => value.result.diagnostics.work = -1,
    value => value.result.routes[0].extra = 1]) corrupt(job, envelope, change);
  let called = 0;
  const bad = structuredClone(envelope);
  Object.defineProperty(bad.result.routes[0].commands[0], "x", { enumerable: true, get() { called++; return 0; } });
  assert.throws(() => validateRouteResult(job, bad), /accessor/); assert.equal(called, 0);
  const zero = completion("edge-path", { zero: true });
  corrupt(zero.job, zero.envelope, value => value.result.routes[0].commands[0].x = 0, /exact node/);
  corrupt(zero.job, zero.envelope, value => {
    value.result.routes[0].commands.splice(1, 0, { op: "L", x: 1, y: 0 });
    value.result.routes[0].bounds.right = 1;
  }, /remain a point/);
});

test("hierarchy provenance validates actual parent paths and spline settings", () => {
  const { job, envelope } = completion("hierarchical");
  for (const change of [value => value.result.routes[0].provenance.hierarchyKeys.reverse(),
    value => value.result.routes[0].provenance.hierarchyKeys.splice(1, 1, job.hierarchy.model.nodes[2].key),
    value => value.result.routes[0].provenance.degree = 1, value => value.result.routes[0].provenance.strength = .5,
    value => value.result.routes[0].provenance.reason = "locked"]) corrupt(job, envelope, change);
});

test("force and density completion validate fixed schedules and bounded method diagnostics", () => {
  for (const method of ["force-directed", "density"]) {
    const { job, envelope } = completion(method);
    corrupt(job, envelope, value => value.result.diagnostics.schedule.pop(), /schedule/);
    corrupt(job, envelope, value => value.result.diagnostics.schedule[0].extra = 1, /exact/);
    if (method === "force-directed") {
      corrupt(job, envelope, value => value.result.diagnostics.schedule[0].step = 1, /cycle/);
      corrupt(job, envelope, value => value.result.routes[0].provenance.compatibilityCount = 99, /count/);
    } else {
      corrupt(job, envelope, value => value.result.diagnostics.schedule[0].bandwidth = 1, /bandwidth/);
      corrupt(job, envelope, value => value.result.diagnostics.schedule[0].fieldCells = 1e9, /cells/);
    }
  }
});

test("edge-path completion validates adjacency, lengths, lock sets and original processing membership", () => {
  const { job, envelope } = completion("edge-path");
  for (const change of [value => value.result.routes[0].provenance.pathEdges.reverse(),
    value => value.result.routes[0].provenance.pathNodes.pop(),
    value => value.result.routes[0].controlPoints[1].y++, value => value.result.routes[0].provenance.originalPathLength++,
    value => value.result.routes[0].provenance.routeLength++, value => value.result.routes[0].provenance.skipped = false,
    value => value.result.routes[1].provenance.locked = false, value => value.result.routes[0].provenance.reason = "below-epsilon",
    value => value.result.diagnostics.processingOrder.pop(), value => value.result.diagnostics.lockedEdges.pop(),
    value => value.result.diagnostics.bundledEdges.push(value.result.diagnostics.bundledEdges[0])]) corrupt(job, envelope, change);
});
