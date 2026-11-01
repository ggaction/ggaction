import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { serializeProgram } from "../../../src/persistence.js";
import { ANIMATION_GUIDE_VERSION } from "../../../src/grammar/animation/guideState.js";

const base = (factory = chart, width = 700, height = 600) => factory().createCanvas({ width, height, margin: 150 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const titles = frame => frame.decisions.flatMap((decision, index) => decision.role !== "guide-title" ? [] : [{ decision, node: frame.scene.nodes[index] }]);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
function equalTitle(frame, native, channel) {
  const item = titles(frame).find(item => JSON.parse(item.decision.guideKey)[2] === channel), expected = native.graphicSpec.objects[`${channel}AxisTitle`];
  assert.equal(item.decision.kernel, "guide-geometry");
  for (const key of ["x", "y", "rotation"]) near(item.node.properties[key] ?? 0, expected.properties[key] ?? 0);
  for (const key of ["text", "lines", "textAlign", "textBaseline", "fontSize", "fontFamily", "fontWeight"]) assert.deepEqual(item.node.properties[key], expected.properties[key]);
}
function roundtrip(prepared) {
  const restored = deserializeAnimation(serializeAnimation(prepared)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(prepared, time));
}

test("public dependent titles replay native measured clearance on four sides and Basic", () => {
  for (const factory of [chart, basic]) for (const channel of ["x", "y"]) for (const position of channel === "x" ? ["top", "bottom"] : ["left", "right"]) {
    for (const offset of [undefined, { from: "labels", gap: 7 }]) {
      const create = channel === "x" ? "createXAxis" : "createYAxis";
      const make = (width = 700, height = 600) => base(factory, width, height)[create]({ position, ticksAndLabels: { values: [0, 10], labels: { rotation: { value: 25, unit: "degrees" }, flush: false } },
        title: { text: "Native title", ...(offset === undefined ? {} : { offset }) } });
      const from = make(), saved = serializeProgram(from), prepared = plan(from, make(800, 700));
      for (const time of [25, 50, 75]) equalTitle(sampleTransition(prepared, time), make(700 + time, 600 + time), channel);
      roundtrip(prepared); assert.equal(serializeProgram(from), saved);
    }
  }
});

test("numeric title anchors and current-frame rebasing preserve label recipe and scale meaning", () => {
  const from = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { flush: true,
    labelMap: [{ value: 0, label: "First\nline" }, { value: 5, label: "" }, { value: 10, label: "Last" }] } },
    title: { text: "Two\nlines", at: 5, offset: { from: "labels", gap: 7 } } });
  const to = from.editXScale({ domain: [0, 20] }), prepared = plan(from, to), middle = sampleTransition(prepared, 50);
  near(titles(middle)[0].node.properties.x, 150 + 400 / 3);
  equalTitle(middle, from.editXScale({ domain: [0, 15] }), "x");
  const rebased = plan(middle, to); assert.strictEqual(sampleTransition(rebased, 0), middle);
  equalTitle(sampleTransition(rebased, 50), from.editXScale({ domain: [0, 17.5] }), "x");
  roundtrip(prepared); roundtrip(rebased);
});

test("theme preferred offsets and absent labels share native read-only resolution", () => {
  let from = base().applyTheme({ theme: { base: "dark", tokens: { axisTitleGap: 42 } } })
    .createXAxis({ ticksAndLabels: false, title: { text: "Amount" } });
  const to = from.applyTheme({ theme: { base: "dark", tokens: { axisTitleGap: 62 } } });
  equalTitle(sampleTransition(plan(from, to), 50), from.applyTheme({ theme: { base: "dark", tokens: { axisTitleGap: 52 } } }), "x");
  roundtrip(plan(from, to));
  from = base().createXAxis({ ticksAndLabels: false, title: { text: "Amount" } });
  roundtrip(plan(from, from.editCanvas({ width: 800 })));
});

test("nested dependent titles keep exact scoped sibling proofs", () => {
  const child = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Value" } });
  const panel = p => hconcat({ id: "panels", programs: [{ id: "a", program: p }, { id: "b", program: p }] });
  const prepared = plan(panel(child), panel(child.editCanvas({ width: 800 })));
  const nodes = titles(sampleTransition(prepared, 50));
  assert.equal(nodes.length, 2); assert.equal(new Set(nodes.map(item => item.decision.guideKey)).size, 2);
  assert.ok(nodes.every(item => item.decision.kernel === "guide-geometry")); roundtrip(prepared);
});

test("strict restore verifies complete title label dependencies and own-field inputs", () => {
  const from = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Value" } });
  const payload = exportTransitionPlan(plan(from, from.editCanvas({ width: 800 })));
  assert.equal(payload.kernels.guide, ANIMATION_GUIDE_VERSION);
  for (const mutate of [
    p => p.from.guides[p.from.guides.findIndex(s => s?.kind === "label-layout")] = null,
    p => p.from.guides.find(s => s?.kind === "title-layout").layout.labels = null,
    p => p.from.guides.find(s => s?.kind === "title-layout").layout.labels.config.overlap = "allow",
    p => p.from.guides.find(s => s?.kind === "title-layout").layout.clearance.preferred += 100,
    p => p.from.guides.find(s => s?.kind === "title-layout").layout.metrics.measurements[0].text = "Unknown",
    p => p.from.guides[p.from.guides.findIndex(s => s?.kind === "label-layout")] = p.from.guides.find(s => s?.kind === "title-layout"),
    p => p.kernels.guide = "native-guide-values@7"
  ]) { const copy = structuredClone(payload); mutate(copy); assert.throws(() => restoreTransitionPlan(copy)); }
  let reads = 0; const copy = structuredClone(payload), title = copy.from.guides.find(s => s?.kind === "title-layout");
  Object.defineProperty(title.layout, "labels", { enumerable: true, get() { reads++; return null; } });
  assert.throws(() => restoreTransitionPlan(copy)); assert.equal(reads, 0);
});

test("edited dependency, changed text and unsafe midpoint keep explicit fades while prepared reflow stays typed", () => {
  const from = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Value" } });
  const edited = from.editGraphics({ target: "xAxisLabels", property: "x", value: [151, 550] });
  for (const [a, b, reason] of [[edited, edited.editCanvas({ width: 800 }), "guide-edited"],
    [from, from.editXAxisTitle({ text: "Changed" }), "appearance"]]) {
    const prepared = plan(a, b); assert.equal(titles(sampleTransition(prepared, 50))[0].decision.reason, reason); roundtrip(prepared);
  }
  const dynamic = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { maxWidth: 50 } }, title: { text: "Value" } });
  assert.equal(titles(sampleTransition(plan(dynamic, dynamic.editCanvas({ width: 800 })), 50))[0].decision.kernel, "guide-geometry");
  const args = alongOffset => ({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "T", at: 5, alongOffset, offset: { from: "labels", gap: 7 } } });
  const a = base().createXAxis(args(-300)), b = base().editXScale({ domain: [0, 100] }).createXAxis(args(-120));
  assert.equal(titles(sampleTransition(plan(a, b), 50))[0].decision.reason, "guide-layout"); roundtrip(plan(a, b));
});

test("title ink dependencies reject edited label fonts and propagate sibling appearance fades", () => {
  const from = base().createXAxis({ ticksAndLabels: { values: [0, 10], labels: { flush: true } }, title: { text: "Value" } });
  for (const [property, value] of [["fontSize", 24], ["fontFamily", "serif"], ["fontWeight", 900], ["fontStyle", "italic"]]) {
    const edited = from.editGraphics({ target: "xAxisLabels", property, value });
    const prepared = plan(edited, from);
    assert.equal(titles(sampleTransition(prepared, 50))[0].decision.reason, "guide-edited"); roundtrip(prepared);
  }
  const to = from.editGraphics({ target: "xAxisLabels", property: "opacity", value: .5 })
    .editGraphics({ target: "xAxisLabels", property: "fill", value: "currentColor" });
  const prepared = plan(from, to), middle = sampleTransition(prepared, 50);
  assert.equal(titles(middle)[0].decision.reason, "guide-layout");
  roundtrip(prepared); roundtrip(plan(middle, from));
});
