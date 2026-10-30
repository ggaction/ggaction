import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { normalizeGuideIdentity, normalizeGuideAnimationState, guideAnimationKey, prepareGuideInterpolation, sampleGuideInterpolation } from "../../../src/grammar/animation/guideState.js";
import { decodeValue } from "../../../src/persistence/codec.js";
import { guideAnchorItems } from "../../../src/materialization/animation/guideAnchors.js";

const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const rows = frame => frame.decisions.flatMap((decision, index) => decision.guideKey === undefined ? []
  : [{ decision, node: frame.scene.nodes[index], key: JSON.parse(decision.guideKey).map((value, index) => index === 4 ? decodeValue(value) : value) }]);
const typed = (frame, component) => rows(frame).filter(value => value.key[3] === component);
const restore = prepared => {
  const restored = deserializeAnimation(serializeAnimation(prepared)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(prepared, time));
};
const base = () => chart().createCanvas({ width: 600, height: 420, margin: 90 })
  .createData({ id: "source", values: [{ x: 1, y: 0 }, { x: 100, y: 10 }] })
  .createPointMark().encodeX({ field: "x", scale: { type: "log", domain: [1, 1000], nice: false } }).encodeY({ field: "y" });
const titles = () => base().createXAxis({ title: { text: "Amount", at: 10, alongOffset: 3, offset: 35 }, ticksAndLabels: false });
const band = (factory = chart, width = 600) => factory().createCanvas({ width, height: 400, margin: 70 })
  .createData({ values: [{ c: 1, v: 1 }, { c: "1", v: 2 }] }).createBarMark()
  .encodeX({ field: "c", fieldType: "nominal", scale: { type: "band", paddingInner: 0, paddingOuter: 0 } })
  .encodeY({ field: "v" }).createGrid({ horizontal: false, vertical: { bandPosition: "boundary", alongOffset: 3 } });
const parallel = () => chart().createCanvas({ width: 600, height: 400, margin: 70 })
  .createData({ values: [{ a: 1, b: 10, c: 100, d: 1000 }, { a: 2, b: 20, c: 200, d: 2000 }] })
  .createParallelCoordinates({ id: "lines", dimensions: ["a", "b", "c", "d"], guides: { legend: false } });

test("public titles map the interpolated semantic value through the native scale", () => {
  const from = titles(), to = from.editXAxisTitle({ at: 100 });
  const prepared = plan(from, to), middle = typed(sampleTransition(prepared, 50), "title");
  assert.equal(middle.length, 1); assert.equal(middle[0].decision.kernel, "guide-geometry");
  near(middle[0].node.properties.x, 93 + 140 * Math.log10(55));
  near(middle[0].node.properties.y, 365);
  assert.strictEqual(sampleTransition(prepared, 0).graphicSpec, from.graphicSpec);
  assert.strictEqual(sampleTransition(prepared, 100).graphicSpec, to.graphicSpec);
  restore(prepared);
  const moved = typed(sampleTransition(plan(from, from.editCanvas({ width: 800 })), 50), "title")[0];
  near(moved.node.properties.x, 93 + 520 / 3);
});

test("title strings, font and inferred clearance preserve explicit appearance or layout fades", () => {
  const from = titles();
  for (const next of [from.editXAxisTitle({ text: "Changed" }), from.editXAxisTitle({ fontSize: 18 })]) {
    const prepared = plan(from, next), item = typed(sampleTransition(prepared, 50), "title")[0];
    assert.equal(item.decision.kind, "crossfade"); assert.equal(item.decision.reason, "appearance"); restore(prepared);
  }
  for (const p of [base().createXAxis(), base().createXAxis({ title: { text: "Amount", offset: { from: "labels", gap: 12 } } })]) {
    const prepared = plan(p, p.editCanvas({ width: 800 }));
    assert.equal(typed(sampleTransition(prepared, 50), "title")[0].decision.reason, "guide-layout"); restore(prepared);
  }
  assert.equal(typed(sampleTransition(plan(from, from.editXAxisTitle({ align: "left" })), 50), "title")[0].decision.reason, "guide-layout");
});

test("polar titles use shortest angular meaning and native inside outside placement", () => {
  const from = chart().createCanvas({ width: 600, height: 600, margin: 120 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 10 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r" })
    .createThetaAxis({ title: { text: "Angle" }, ticksAndLabels: false })
    .createRadialAxis({ angle: 350, title: { text: "Radius", position: "outside", align: "left" }, ticksAndLabels: false });
  const prepared = plan(from, from.editRadialAxis({ angle: 10 })), result = typed(sampleTransition(prepared, 50), "title");
  assert.equal(result.length, 2);
  const radial = result.find(value => value.key[2] === "radius");
  assert.equal(radial.decision.kernel, "guide-geometry");
  near(radial.node.properties.x, 300); assert.ok(radial.node.properties.y < 120); restore(prepared);
});

test("band edge membership uses typed values and supports Basic resize, subsets and nested namespaces", () => {
  const from = band(basicChart), to = band(basicChart, 800), prepared = plan(from, to);
  const middle = typed(sampleTransition(prepared, 50), "boundary");
  assert.equal(middle.length, 3); assert.ok(middle.every(value => value.decision.kernel === "guide-geometry"));
  assert.deepEqual(middle.map(value => value.node.properties.x1), [73, 353, 633]);
  assert.equal(middle[1].key[4].length, 2); restore(prepared);
  const full = band(), subset = full.editVerticalGrid({ values: ["1"] });
  const changed = sampleTransition(plan(full, subset), 50).decisions.map(decision => ({ decision }));
  assert.equal(changed.filter(value => value.decision.kind === "exit").length, 2);
  assert.equal(changed.filter(value => value.decision.kind === "enter").length, 1);
  const panel = p => hconcat({ id: "panels", programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  const nested = plan(panel(full), panel(full.editCanvas({ width: 800 })));
  const keys = typed(sampleTransition(nested, 50), "boundary").map(value => value.decision.guideKey);
  assert.equal(keys.length, 6); assert.equal(new Set(keys).size, 6); restore(nested);
});

test("Parallel fields retain correspondence across reordered field slots and removed dimensions", () => {
  const from = parallel(), to = from.encodeParallelCoordinates({ target: "lines", dimensions: ["d", "a", "c"] });
  const prepared = plan(from, to), middle = sampleTransition(prepared, 50);
  const titles = typed(middle, "parallel-title"), a = titles.find(value => value.key[4].field === "a");
  assert.equal(a.decision.kernel, "guide-geometry");
  // width / (interpolated field count - 1) * interpolated field index.
  near(a.node.properties.x, 70 + 460 / 2.5 * .5);
  assert.ok(middle.decisions.some(value => value.kind === "exit"));
  assert.ok(["parallel-line", "parallel-ticks", "parallel-labels"].every(component => typed(middle, component).some(value => value.decision.kernel === "guide-geometry")));
  restore(prepared);
  const changed = from.editParallelAxis({ target: "lines", field: "a", title: { text: "A new label" } });
  assert.equal(typed(sampleTransition(plan(from, changed), 50), "parallel-title").find(value => value.key[4].field === "a").decision.reason, "appearance");
});

test("guide anchor meaning stays flat through repeated sampled-frame rebase and labelled frame export", () => {
  for (const from of [titles(), band(), parallel()]) {
    const to = from.editCanvas({ width: 800 });
    let frame = sampleTransition(plan(from, to), 40);
    for (let i = 0; i < 12; i++) {
      const prepared = plan(frame, i % 2 ? from : to);
      assert.strictEqual(sampleTransition(prepared, 0), frame);
      frame = sampleTransition(prepared, 50);
      assert.ok(rows(frame).some(value => value.decision.kernel === "guide-geometry"));
    }
    const prepared = plan(frame, to); restore(prepared);
    const exported = exportAnimationFrames(prepared, { timesMs: [0, 50, 100] });
    assert.strictEqual(sampleTransition(plan(exported[1], to), 0), exported[1]);
  }
});

test("guide anchor strict restore rejects versions and forged field membership or geometry before sampling", () => {
  for (const from of [titles(), band(), parallel()]) {
    const prepared = plan(from, from.editCanvas({ width: 800 })), original = exportTransitionPlan(prepared);
    assert.equal(original.kernels.guide, "native-guide-values@4");
    for (const change of [
      state => { state.anchor.frame.y += 1; },
      state => { state.identity.component = "grid"; },
      state => { state.anchor.extra = true; }
    ]) {
      const payload = structuredClone(original), state = payload.from.guides.find(value => value?.kind === "anchor");
      change(state); assert.throws(() => restoreTransitionPlan(payload));
    }
    const legacy = structuredClone(original); legacy.kernels.guide = "native-guide-values@1";
    assert.throws(() => restoreTransitionPlan(legacy), /kernel/);
  }
  const from = parallel(), payload = structuredClone(exportTransitionPlan(plan(from, from.editCanvas({ width: 800 }))));
  payload.from.guides.find(value => value?.anchor?.kind === "parallel").identity.value.field = "wrong";
  assert.throws(() => restoreTransitionPlan(payload), /identity/);
});

test("guide anchor identity normalization is closed, typed, descriptor-safe and canonical", () => {
  const identity = (component, value) => ({ namespaces: [], owner: "owner", component, value, line: 0 });
  const values = [identity("parallel-labels", { field: "a", value: 1 }), identity("parallel-labels", { field: "a", value: "1" }),
    identity("parallel-labels", { field: "b", value: 1 }), identity("parallel-labels", { field: "a", value: -0 }), identity("parallel-labels", { field: "a", value: 0 })];
  assert.equal(new Set(values.map(guideAnimationKey)).size, values.length);
  assert.equal(guideAnimationKey(values[0]), guideAnimationKey(identity("parallel-labels", { value: 1, field: "a" })));
  const members = [{ value: "1", edge: "start" }, { value: 1, edge: "end" }];
  assert.equal(guideAnimationKey(identity("boundary", members)), guideAnimationKey(identity("boundary", [...members].reverse())));
  for (const value of [identity("parallel-line", { field: "", value: null }), identity("parallel-title", { field: "a", value: 0 }),
    identity("parallel-labels", { field: "a", value: null }), identity("grid", null), identity("title", "text")]) assert.throws(() => normalizeGuideIdentity(value));
  let reads = 0;
  const hostile = { field: "a", get value() { reads++; return 1; } };
  assert.throws(() => normalizeGuideIdentity(identity("parallel-ticks", hostile)), /accessors/); assert.equal(reads, 0);
  let work = 0; guideAnchorItems(parallel(), amount => { work += amount; }); assert.ok(work > 100);
  assert.throws(() => guideAnchorItems(titles(), () => { throw new Error("shared budget"); }), /shared budget/);
  const p = titles(), entry = guideAnchorItems(p)[0];
  const state = normalizeGuideAnimationState({ identity: identity("title", null), kind: "anchor", anchor: entry.anchor });
  const other = { ...state, anchor: { ...state.anchor, policy: { ...state.anchor.policy, align: "left" } } };
  assert.equal(prepareGuideInterpolation(state, other).reason, "guide-layout");
  const overflowing = { ...state, anchor: { ...state.anchor, frame: { ...state.anchor.frame, y: Number.MAX_VALUE, height: Number.MAX_VALUE } } };
  assert.equal(sampleGuideInterpolation(prepareGuideInterpolation(state, overflowing), 1).reason, "nonfinite-guide");
});
