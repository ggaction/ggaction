import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";

const base = () => chart().createCanvas({ width: 500, height: 400, margin: 80 })
  .createData({ id: "d", values: [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 10 }], keyField: "id" })
  .createPointMark({ id: "points", data: "d" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const axis = (values = [0, 5, 10]) => base().createXAxis({ ticksAndLabels: { values }, title: false });
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const guides = frame => frame.decisions.flatMap((decision, index) => decision.guideKey === undefined ? []
  : [{ decision, node: frame.scene.nodes[index], key: JSON.parse(decision.guideKey) }]);

test("Basic native guides use the same typed transition and offline owner", () => {
  const base = basicChart().createCanvas().createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark();
  const at = max => base.encodeX({ field: "x", scale: { domain: [0, max], nice: false } })
    .encodeY({ field: "y" }).createVerticalGrid({ values: [5] });
  const prepared = plan(at(10), at(20));
  const frame = sampleTransition(prepared, 50);
  assert.equal(guides(frame).length, 1);
  assert.equal(guides(frame)[0].decision.kernel, "guide-geometry");
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), frame);
});

test("public guide samples interpolate semantic scale before forward mapping and preserve endpoints", () => {
  const from = axis(), to = from.editScale({ id: "x", domain: [0, 20] });
  const prepared = plan(from, to), middle = sampleTransition(prepared, 50);
  assert.strictEqual(sampleTransition(prepared, 0).graphicSpec, from.graphicSpec);
  assert.strictEqual(sampleTransition(prepared, 100).graphicSpec, to.graphicSpec);
  const tick = guides(middle).find(value => value.key[3] === "ticks" && value.key[4] === 5);
  assert.equal(tick.decision.kernel, "guide-geometry");
  near(tick.node.properties.x1, 80 + 340 * 5 / 15);
  assert.notEqual(tick.node.properties.x1, (250 + 165) / 2);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), middle);
});

test("new raw tick values enter while same-value label spelling crossfades under one guide key", () => {
  const from = axis([0, 10]);
  const to = from.editXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { labelMap: [{ value: 10, label: "Maximum" }] } } });
  const middle = sampleTransition(plan(from, to), 50);
  assert.equal(middle.decisions.filter(value => value.kind === "enter").length, 2);
  assert.equal(middle.decisions.filter(value => value.kind === "exit").length, 0);
  const label = guides(middle).find(value => value.key[3] === "labels" && value.key[4] === 10);
  assert.equal(label.decision.kind, "crossfade");
  assert.equal(label.decision.reason, "appearance");
  assert.equal(label.node.type, "weighted-blend");
  assert.equal(label.node.properties.sources.length, 2);
});

test("duplicate raw guide values keep separate enters and exits with explicit ambiguity", () => {
  const from = base().createXAxisTicks({ values: [0, 5, 5] }), to = from.editScale({ id: "x", domain: [0, 20] });
  const middle = sampleTransition(plan(from, to), 50);
  const ambiguous = middle.decisions.filter(value => value.reason === "guide-ambiguity");
  assert.equal(ambiguous.filter(value => value.kind === "enter").length, 2);
  assert.equal(ambiguous.filter(value => value.kind === "exit").length, 2);
  assert.ok(ambiguous.every(value => value.kind === "enter" || value.kind === "exit"));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(from, to))).plan, 50), middle);
});

test("guide meaning survives sampled endpoints, labelled views, repeated rebases and offline restore", () => {
  const from = axis(), to = from.editScale({ id: "x", domain: [0, 20] });
  let frame = sampleTransition(plan(from, to), 25);
  for (let index = 0; index < 30; index++) {
    const next = plan(frame, index % 2 ? from : to);
    assert.strictEqual(sampleTransition(next, 0), frame);
    frame = sampleTransition(next, 50);
    assert.ok(guides(frame).some(value => value.decision.kernel === "guide-geometry"));
    assert.ok(!Object.hasOwn(animationFrameProvenance(frame), "plan"));
  }
  const next = plan(frame, to), labelled = exportAnimationFrames(next, { timesMs: [0, 50, 100] });
  assert.equal(labelled[1].timeMs, 50);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(next)).plan, 50), sampleTransition(next, 50));
  assert.strictEqual(sampleTransition(plan(labelled[0], to), 0), labelled[0]);
  const renamed = from.editXAxisLabels({ labelMap: [{ value: 5, label: "Five" }] });
  const faded = sampleTransition(plan(from, renamed), 50);
  assert.ok(guides(sampleTransition(plan(faded, to), 50)).some(value => value.decision.kind === "crossfade"));
});

test("scoped guides use explicit child namespaces while reordered panels retain each owner", () => {
  const unit = axis([0, 10]);
  const from = hconcat({ id: "panels", programs: [{ id: "left", program: unit }, { id: "right", program: unit }] });
  const to = hconcat({ id: "panels", programs: [{ id: "right", program: unit.editCanvas({ width: 600 }) }, { id: "left", program: unit }] });
  const states = guides(sampleTransition(plan(from, to), 50));
  assert.equal(states.length, 10);
  assert.equal(new Set(states.map(value => value.decision.guideKey)).size, 10);
  assert.deepEqual(new Set(states.map(value => value.key[1][0])), new Set(["panels-left", "panels-right"]));
});

test("polar rules and circles replay native guide values across Canvas resize", () => {
  const from = chart().createCanvas({ width: 500, height: 500, margin: 100 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 10 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r" })
    .createThetaAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createRadialAxis({ angle: 90, ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createGrid({ theta: { values: [0, 5, 10] }, radial: { values: [0, 5, 10] } });
  const prepared = plan(from, from.editCanvas({ width: 600, height: 600 })), middle = sampleTransition(prepared, 50);
  const states = guides(middle);
  assert.equal(states.length, 19);
  assert.ok(states.every(value => value.decision.kernel === "guide-geometry"));
  assert.ok(states.some(value => value.node.type === "path"));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), middle);
});

test("unsupported label policy and edited guide geometry keep explicit fallback through restore", () => {
  const from = axis().editXAxisLabels({ flush: true, maxWidth: 50, wrap: "word" });
  const next = from.editCanvas({ width: 600 });
  const prepared = plan(from, next), middle = sampleTransition(prepared, 50);
  assert.equal(guides(middle).filter(value => value.decision.reason === "guide-layout").length, 3);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), middle);
  const edited = axis().editGraphics({ target: "xAxisTicks", property: "y1", value: 123 });
  assert.equal(guides(sampleTransition(plan(axis(), edited), 50)).filter(value => value.decision.reason === "guide-edited").length, 3);
});

test("strict guide restore rejects unknown versions, wrong cardinality and forged forward mapping", () => {
  const from = axis(), payload = exportTransitionPlan(plan(from, from.editCanvas({ width: 600 })));
  assert.equal(payload.kernels.guide, "native-guide-values@4");
  for (const mutate of [
    value => { value.kernels.guide = "unknown"; },
    value => { value.from.guides.pop(); },
    value => { value.from.guides.find(state => state?.kind === "ticks").mapping.scale.range[1] += 1; },
    value => { value.from.guides[1] = value.from.guides.find(state => state?.kind === "ticks"); }
  ]) {
    const corrupted = structuredClone(payload); mutate(corrupted);
    assert.throws(() => restoreTransitionPlan(corrupted));
  }
  assert.deepEqual(exportTransitionPlan(restoreTransitionPlan(payload)), payload);
});

test("guide color, opacity and stroke width use the shared appearance kernel alongside value mapping", () => {
  const from = axis().editXAxisTicks({ color: "red", lineWidth: 2 }).editGraphics({ target: "xAxisTicks", property: "opacity", value: .25 });
  const to = from.editScale({ id: "x", domain: [0, 20] }).editXAxisTicks({ color: "blue", lineWidth: 6 })
    .editGraphics({ target: "xAxisTicks", property: "opacity", value: .75 });
  const prepared = plan(from, to), frame = sampleTransition(prepared, 50);
  const tick = guides(frame).find(value => value.key[3] === "ticks" && value.key[4] === 5);
  assert.equal(tick.decision.kernel, "guide-geometry");
  near(tick.node.properties.x1, 80 + 340 * 5 / 15);
  near(tick.node.properties.opacity, .5);
  near(tick.node.properties.strokeWidth, 4);
  const channels = tick.node.properties.stroke.match(/[\d.]+/g).map(Number);
  near(channels[0], 187.51603067837462); near(channels[2], 187.51603067837462);
  assert.equal(channels[1], 0); assert.equal(channels[3], 1);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), frame);
});

test("sampled guide decisions cannot impersonate anonymous canvas backgrounds or a different raw value", () => {
  const from = axis(), to = from.editScale({ id: "x", domain: [0, 20] });
  const frame = sampleTransition(plan(from, to), 50), payload = exportTransitionPlan(plan(frame, to));
  const index = payload.from.view.decisions.findIndex(value => value.guideKey !== undefined);
  for (const mutate of [
    value => { value.from.view.decisions[index].guideKey += "wrong"; },
    value => { delete value.from.view.decisions[index].guideKey; value.from.view.decisions[index].owner = undefined; value.from.view.decisions[index].role = "canvas-background"; },
    value => { value.from.guides[index] = { identity: value.from.guides[index].identity, reason: "guide-unavailable" }; },
    value => { value.from.guides = value.from.guides.map(() => null); }
  ]) {
    const corrupted = structuredClone(payload); mutate(corrupted);
    assert.throws(() => restoreTransitionPlan(corrupted));
  }
  assert.deepEqual(exportTransitionPlan(restoreTransitionPlan(payload)), payload);
});
