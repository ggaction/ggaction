import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { animationGuideFrame } from "../../support/animation-guide-frame.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { normalizeLegendGroupAnimationState, prepareLegendGroupInterpolation, sampleLegendGroupInterpolation } from "../../../src/materialization/animation/legendGroupState.js";

function base(gradient = false) {
  let p = chart().createCanvas({ width: 1200, height: 900, margin: 250 })
    .createData({ values: [{ x: 0, y: 0, g: "A", s: 1 }, { x: 1, y: 1, g: "B", s: 4 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: gradient ? "s" : "g", ...(gradient ? { fieldType: "quantitative" } : {}) })
    .encodeSize({ field: "s", scale: { range: [Math.PI * 16, Math.PI * 64] } });
  p = p.createLegend({ channels: ["color"], title: "T", offset: 20, ...(gradient ? { values: [1, 4], gradient: { length: 80, thickness: 10 } } : {}) })
    .createLegend({ channels: ["size"], values: [1, 4], title: "T", offset: 20 });
  return p;
}
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const guides = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-")
  ? [{ decision, type: frame.scene.nodes[index].type, properties: frame.scene.nodes[index].properties }] : []);
const nativeGuides = p => guides(sampleTransition(plan(p, p), 50)).map(({ type, properties }) => ({ type, properties }));
function assertNativeMidpoint(from, to, native) {
  const transition = plan(from, to), middle = sampleTransition(transition, 50), items = guides(middle);
  assert.ok(items.length > 0 && items.every(item => item.decision.kernel === "guide-geometry"));
  assert.deepEqual(items.map(({ type, properties }) => ({ type, properties })), nativeGuides(native));
  return transition;
}
function offline(transition) {
  const restored = deserializeAnimation(serializeAnimation(transition)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(transition, time));
}

test("grouped categorical and size blocks reuse exact native row, column and edge placement", () => {
  const original = base(), snapshot = JSON.stringify(original);
  for (const position of ["left", "right", "top", "bottom"]) for (const blockLayout of ["row", "column"]) {
    const from = original.editLegendLayout({ position, blockLayout, offset: 20 });
    const to = from.editCanvas({ width: 1300, height: 1000 }).editLegendLayout({ offset: 40 });
    const expected = from.editCanvas({ width: 1250, height: 950 }).editLegendLayout({ offset: 30 });
    const transition = assertNativeMidpoint(from, to, expected);
    if (position === "right" && blockLayout === "column") offline(transition);
  }
  assert.equal(JSON.stringify(original), snapshot);
});

test("grouped corners and plot-relative origins preserve native anchors without pixel interpolation", () => {
  for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    const from = base().editLegendLayout({ position, blockLayout: "row", offset: 8 });
    const to = from.editCanvas({ width: 1300, height: 1000 }).editLegendLayout({ offset: 20 });
    assertNativeMidpoint(from, to, from.editCanvas({ width: 1250, height: 950 }).editLegendLayout({ offset: 14 }));
  }
  const from = base().editLegendLayout({ at: { x: 10, y: 20 }, blockLayout: "column" });
  const to = from.editLegendLayout({ at: { x: 110, y: 120 } });
  offline(assertNativeMidpoint(from, to, from.editLegendLayout({ at: { x: 60, y: 70 } })));
});

test("grouped gradient and size share native metric bounds and area mapping at each frame", () => {
  const from = base(true).editLegendLayout({ position: "bottom", blockLayout: "row", offset: 20 });
  const to = from.editCanvas({ width: 1300 }).editScale({ id: "size", range: [Math.PI * 64, Math.PI * 144] });
  const native = from.editCanvas({ width: 1250 }).editScale({ id: "size", range: [Math.PI * 40, Math.PI * 104] });
  offline(assertNativeMidpoint(from, to, native));
});

test("native group wrapping resolves the current width and retains raw values across row changes", () => {
  const original = base().editCanvas({ height: 1100, margin: { top: 200, bottom: 350, left: 200, right: 200 } }).applyTextMetrics({ profile: { schemaVersion: 1, id: "title-width", measurements: [
    { text: "T", fontFamily: "sans-serif", fontSize: 13, fontWeight: 600, width: 150 }
  ] } });
  const from = original.editLegendLayout({ position: "bottom", blockLayout: "wrap", align: "left", offset: 20 }).editCanvas({ width: 620 });
  const to = from.editCanvas({ width: 1000 }), transition = plan(from, to);
  for (const time of [25, 50, 75]) {
    const sampled = guides(sampleTransition(transition, time)), expected = nativeGuides(from.editCanvas({ width: 620 + 380 * time / 100 }));
    assert.ok(sampled.every(item => item.decision.kernel === "guide-geometry"));
    assert.deepEqual(sampled.map(({ type, properties }) => ({ type, properties })), expected);
  }
  assert.notDeepEqual(guides(sampleTransition(transition, 25)).map(x => x.properties.y), guides(sampleTransition(transition, 75)).map(x => x.properties.y));
  offline(transition);
});

test("group current-frame rebase and nested namespaces retain all dependent block meaning", () => {
  const source = base().editLegendLayout({ position: "right", blockLayout: "column", offset: 20 });
  const panels = p => hconcat({ id: "panels", programs: [{ id: "first", program: p }, { id: "second", program: p }] });
  const from = panels(source), to = panels(source.editCanvas({ width: 1300 })), first = plan(from, to);
  const middle = sampleTransition(first, 50), rebased = plan(middle, to);
  assert.strictEqual(sampleTransition(rebased, 0), middle);
  const entries = guides(sampleTransition(rebased, 50));
  assert.equal(new Set(entries.map(item => item.decision.guideKey)).size, entries.length);
  assert.ok(entries.every(item => item.decision.kernel === "guide-geometry"));
  offline(rebased);
});

test("group closed state rejects corrupted origin, sibling meaning, extra fields and accessors", () => {
  const source = base().editLegendLayout({ position: "right", blockLayout: "column", offset: 20 });
  const payload = exportTransitionPlan(plan(source, source.editCanvas({ width: 1300 })));
  const index = payload.from.guides.findIndex(x => x?.kind === "legend-group"), original = payload.from.guides[index];
  for (const mutate of [s => s.layout.group.placement.offset++, s => s.layout.blocks[0].values.config.itemGap++]) {
    const copy = structuredClone(payload); mutate(copy.from.guides[index]); assert.throws(() => restoreTransitionPlan(copy), /differs/);
  }
  for (const mutate of [s => s.layout.blocks[0].values.frame = s.layout.frame, s => s.layout.blocks.push(s.layout.blocks[0]),
    s => s.layout.group.inferredOffset = true, s => s.layout.group.placement.extra = 1, s => s.layout.allowOverflow = 1,
    s => s.layout.blocks[0].values.config.offset = 1, s => s.layout.blocks[0].kind = "missing"]) {
    const copy = structuredClone(original); mutate(copy); assert.throws(() => normalizeLegendGroupAnimationState(copy));
  }
  // An unchanged first block must not accept a different dependent size scale
  // merely because that component's own current coordinates still match.
  const inconsistent = structuredClone(payload);
  inconsistent.from.guides[index].layout.blocks[1].values.mapping.scale.domain[1] += 1;
  assert.throws(() => restoreTransitionPlan(inconsistent), /group meaning|differs/);
  const incomplete = structuredClone(payload); incomplete.from.guides[index] = null;
  assert.throws(() => restoreTransitionPlan(incomplete), /complete group/);
  let reads = 0;
  for (const inject of [s => Object.defineProperty(s.layout.group.placement, "offset", { enumerable: true, get() { reads++; return 20; } }),
    s => Object.defineProperty(s.layout.blocks[0].values.config, "itemGap", { enumerable: true, get() { reads++; return 20; } })]) {
    const copy = structuredClone(original); inject(copy); assert.throws(() => normalizeLegendGroupAnimationState(copy), /accessors/);
  }
  assert.equal(reads, 0);
  const copy = structuredClone(original), normalized = normalizeLegendGroupAnimationState(copy); copy.layout.group.placement.offset++;
  assert.notDeepEqual(normalizeLegendGroupAnimationState(copy), normalized);
  assert.throws(() => sampleLegendGroupInterpolation(prepareLegendGroupInterpolation(original, original), -1));
});

test("dependent group policy changes and unsupported siblings remain explicit complete fallbacks", () => {
  const source = base().editLegendLayout({ position: "right", blockLayout: "column", offset: 20 });
  for (const to of [source.editLegendLayout({ blockLayout: "row" }), source.editLegendLayout({ position: "left" }),
    source.editLegendBlock({ target: "points", channel: "size", title: "Changed" })]) {
    assert.ok(guides(sampleTransition(plan(source, to), 50)).every(item => item.decision.kind === "crossfade"));
  }
  const unsupported = source.encodeOpacity({ field: "s" }).createLegend({ channels: ["opacity"], values: [1, 4], title: "Opacity" });
  const transition = plan(unsupported, unsupported.editCanvas({ width: 1300 }));
  assert.ok(guides(sampleTransition(transition, 50)).every(item => item.decision.reason === "guide-layout"));
  offline(transition);
});


test("group packing has literal occupied-box gaps and area-derived circle radii", () => {
  const { frame } = animationGuideFrame("grouped-legend"), entries = guides(frame);
  assert.equal(entries.length, 2);
  const rect = entries.find(entry => entry.type === "rect").properties;
  const circle = entries.find(entry => entry.type === "circle").properties;
  assert.deepEqual({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }, { x: 210, y: 40, width: 20, height: 20 });
  assert.ok(Math.abs(circle.radius - Math.sqrt(500)) < 1e-12);
  assert.ok(Math.abs(circle.x - circle.radius - 210) < 1e-12);
  assert.ok(Math.abs(circle.y - circle.radius - 84) < 1e-12);
  assert.equal(Math.round(circle.y - circle.radius - (rect.y + rect.height)), 24);
});


test("editing one dependent legend component keeps every sibling on the explicit edited fallback", () => {
  const source = base().editLegendLayout({ position: "right", blockLayout: "column", offset: 20 });
  const edited = source.editGraphics({ target: "sizeLegendTitle", property: "x", value: 1150 });
  const transition = plan(source, edited), entries = guides(sampleTransition(transition, 50));
  assert.ok(entries.length > 0 && entries.every(entry => entry.decision.reason === "guide-edited"));
  offline(transition);
});


test("group midpoint fit failures preserve the native area-derived symbol instead of shrinking it", () => {
  const from = chart().createCanvas({ width: 400, height: 240, margin: { top: 20, bottom: 20, left: 20, right: 80 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark({ id: "m", opacity: 0 })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeSize({ field: "y", scale: { domain: [0, 10], range: [0, Math.PI * 400] } })
    .createLegend({ channels: ["size"], values: [10], offset: 10, title: false, labels: { offset: 0 } })
    .editLegendBlock({ target: "m", channel: "size", labelMap: [{ value: 10, label: "" }] })
    .editLegendLayout({ target: "m", position: "right", blockLayout: "column", offset: 10 })
    .editCanvas({ margin: { top: 20, bottom: 20, left: 20, right: 50.1 } });
  const to = from.editCanvas({ margin: { top: 20, bottom: 20, left: 20, right: 130.1 } }).editScale({ id: "size", range: [0, Math.PI * 3600] });
  const transition = plan(from, to), middle = guides(sampleTransition(transition, 50));
  assert.ok(middle.length > 0 && middle.every(item => item.decision.reason === "guide-layout"));
  assert.throws(() => from.editCanvas({ margin: { top: 20, bottom: 20, left: 20, right: 90.1 } })
    .editScale({ id: "size", range: [0, Math.PI * 2000] }), /Legend group requires more Canvas space/);
  offline(transition);
});

test("group interpolation rejects foreign versions, incompatible roles and malformed prepared plans", () => {
  const source = base().editLegendLayout({ position: "right", blockLayout: "column", offset: 20 });
  const states = exportTransitionPlan(plan(source, source)).from.guides.filter(state => state?.kind === "legend-group");
  const prepared = prepareLegendGroupInterpolation(states[0], states[0]);
  assert.throws(() => sampleLegendGroupInterpolation({ ...prepared, version: "unknown" }, 0.5), /Invalid prepared/);
  assert.throws(() => sampleLegendGroupInterpolation({ ...prepared, kind: "other" }, 0.5), /Invalid prepared/);
  assert.throws(() => sampleLegendGroupInterpolation({ ...prepared, to: states[1] }, 0.5), /Invalid prepared/);
  assert.deepEqual(prepareLegendGroupInterpolation(states[0], states[1]), { kind: "crossfade", reason: "guide-policy" });
  const changed = structuredClone(states[0]); changed.layout.blocks = [];
  assert.throws(() => normalizeLegendGroupAnimationState(changed), /bounded native blocks/);
  delete changed.layout.blocks;
  assert.throws(() => normalizeLegendGroupAnimationState(changed), /requires every field/);
});
