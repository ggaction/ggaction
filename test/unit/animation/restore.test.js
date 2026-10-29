import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, exportTransitionPlan, restoreTransitionPlan, requireTransitionPlan } from "../../../src/animation/planner.js";
import { sampleTransition } from "../../../src/animation/sample.js";

const points = () => chart().createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 20 }, { id: "b", x: 100, y: 80 }] })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { id: "x", type: "log", domain: [1, 1000], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 100], nice: false } });
const prepare = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const copy = value => structuredClone(value);

test("offline point preparation reconstructs correspondence and semantic samples from one payload", () => {
  const from = points(), to = from.reviseData({ source: "rows", id: "updated", values: [
    { id: "b", x: 1000, y: 40 }, { id: "new", x: 10, y: 50 }
  ] });
  const compose = p => hconcat({ id: "outer", programs: [{ id: "left", program: p }, { id: "right", program: from }] });
  for (const [a, b] of [[from, to], [compose(from), compose(to)], [from, from],
    [from, to.editPointMark({ shape: "diamond" })], [from, to.editPointMark({ fill: "red" })],
    [from, to.editGraphics({ target: "points", property: "x", value: 42 })]]) {
    const plan = prepare(a, b), payload = exportTransitionPlan(plan), original = copy(payload);
    assert.deepEqual(Object.keys(payload).sort(), ["durationMs", "easing", "from", "kernels", "kind", "to", "version"]);
    assert.deepEqual(Object.keys(payload.from).sort(), ["graphicSpec", "positions"]);
    assert.ok(Object.isFrozen(payload.from.positions));
    const restored = restoreTransitionPlan(copy(payload));
    assert.equal(requireTransitionPlan(restored), restored);
    for (const time of [-1, 0, 25, 50, 75, 100, 101]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
    assert.deepEqual(exportTransitionPlan(restored), original);
    assert.deepEqual(payload, original);
  }
  assert.throws(() => exportTransitionPlan({}), /authentic/);
});

test("restoration rejects unknown fields, kernels and malformed options before creating an authentic plan", () => {
  const p = points(), payload = exportTransitionPlan(prepare(p, p));
  const changes = [
    v => { v.kind = "other"; }, v => { v.version = 99; }, v => { v.kernels.transition = 2; },
    v => { v.kernels.position = "future"; }, v => { v.kernels.extra = true; }, v => { delete v.kernels.position; },
    v => { v.durationMs = -1; }, v => { v.easing = undefined; }, v => { v.easing = "spring"; },
    v => { v.tracks = []; }, v => { delete v.from; }, v => { v.to.extra = true; },
    v => { v.from.positions.pop(); }, v => { v.from.positions.push(v.from.positions[0]); },
    v => { v.from.positions[0] = undefined; }, v => { v.from.positions[0].reason = "unknown"; },
    v => { v.from.positions[0].extra = true; }, v => { v.from.positions[1] = { reason: "anonymous" }; },
    v => { v.from.positions[0] = { reason: "appearance" }; },
    v => { v.from.positions[1].x.scale.extra = true; }, v => { v.from.positions[1].x.value = Infinity; },
    v => { v.from.positions[1].x.value = undefined; }, v => { delete v.from.positions[1].y; },
    v => { v.from.positions[1].z = {}; }, v => { v.from.graphicSpec.objects.points.items[0].identity.role = "other"; }
  ];
  for (const change of changes) { const value = copy(payload); change(value); assert.throws(() => restoreTransitionPlan(value), change.toString()); }
});

test("semantic values and every unmatched endpoint are validated against native concrete output", () => {
  const from = points(), to = from.reviseData({ source: "rows", id: "new", values: [{ id: "new", x: 30, y: 50 }] });
  const payload = exportTransitionPlan(prepare(from, to));
  for (const mutate of [v => { v.from.positions[1].x.value = 2; }, v => { v.to.positions[1].y.value = 60; },
    v => { v.from.graphicSpec.objects.points.items[0].properties.x += 1; },
    v => { v.from.graphicSpec.objects.points.items[0].identity.lineage.rowKeys = []; },
    v => { v.from.positions[1] = { reason: "anonymous" }; }]) {
    const value = copy(payload); mutate(value); assert.throws(() => restoreTransitionPlan(value));
  }
  const restored = restoreTransitionPlan(copy(payload));
  assert.equal(restored.tracks.length, 0);
  assert.equal(restored.enters.length, 1); assert.equal(restored.exits.length, 2);
});

test("restoration is descriptor safe and bounds cyclic, deep, sparse and amplified input", () => {
  const p = points(), payload = exportTransitionPlan(prepare(p, p));
  let reads = 0;
  const getter = copy(payload); Object.defineProperty(getter.from.positions[1].x.scale, "domain", { enumerable: true, get() { reads++; return [1, 1000]; } });
  assert.throws(() => restoreTransitionPlan(getter), /accessors/); assert.equal(reads, 0);
  const cycle = copy(payload); cycle.from.graphicSpec.objects.loop = cycle;
  assert.throws(() => restoreTransitionPlan(cycle), /nesting/);
  const deep = copy(payload); let cursor = deep;
  for (let i = 0; i < 130; i++) cursor = cursor.extra = {};
  assert.throws(() => restoreTransitionPlan(deep), /nesting/);
  const sparse = copy(payload); delete sparse.from.positions[1];
  assert.throws(() => restoreTransitionPlan(sparse), /dense/);
  const arrayExtra = copy(payload); arrayExtra.from.positions.extra = true;
  assert.throws(() => restoreTransitionPlan(arrayExtra), /extra properties/);
  const nonPlain = copy(payload); nonPlain.from.positions[1] = new Date();
  assert.throws(() => restoreTransitionPlan(nonPlain), /plain object/);
  const functionValue = copy(payload); functionValue.to = () => {};
  assert.throws(() => restoreTransitionPlan(functionValue), /plain data/);
  const huge = copy(payload); huge.extra = "x".repeat(10_000_001);
  assert.throws(() => restoreTransitionPlan(huge), /preparation work/);
  const amplification = copy(payload); let shared = { value: "x".repeat(1000) };
  for (let i = 0; i < 16; i++) shared = [shared, shared];
  amplification.extra = shared; assert.throws(() => restoreTransitionPlan(amplification), /preparation work/);
  assert.deepEqual(exportTransitionPlan(restoreTransitionPlan(copy(payload))), payload);
});

test("graphic corruption and ambiguous retained identity reject atomically", () => {
  const p = points(), payload = exportTransitionPlan(prepare(p, p)), original = copy(payload);
  for (const mutate of [v => { v.from.graphicSpec.order.push("missing"); },
    v => { v.from.graphicSpec.objects.points.items[0].properties.radius = -1; },
    v => { v.from.graphicSpec.objects.points.items[0].identity = v.from.graphicSpec.objects.points.items[1].identity; },
    v => { v.from.graphicSpec.objects.points.extra = 1; }]) {
    const value = copy(payload); mutate(value); assert.throws(() => restoreTransitionPlan(value));
  }
  assert.deepEqual(payload, original);
});
