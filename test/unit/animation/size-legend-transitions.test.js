import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { normalizeSizeLegendAnimationState, prepareSizeLegendInterpolation, sampleSizeLegendInterpolation } from "../../../src/materialization/animation/sizeLegendState.js";
import { validateAnimationGuides } from "../../../src/animation/guideTracks.js";

const base = (legend = {}, scale = {}) => chart().createCanvas({ width: 700, height: 450, margin: { top: 120, bottom: 120, right: 220, left: 150 } })
  .createData({ id: "rows", values: [{ id: 1, x: 1, y: 1, v: 1 }, { id: 2, x: 100, y: 100, v: 100 }] })
  .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" })
  .encodeSize({ field: "v", scale: { type: "linear", domain: [0, 100], range: [0, 100], ...scale } })
  .createLegend({ channels: ["size"], values: [25, 100], offset: 20, title: "Size", ...legend });
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const entries = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [{ decision, node: frame.scene.nodes[index] }] : []);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const equalOffline = p => { const restored = deserializeAnimation(serializeAnimation(p)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(p, time), sampleTransition(restored, time)); };
const endpoint = p => { const e = projectAnimationEndpoint(p); return { ...e, guides: projectGuideAnimationState(p, e) }; };

test("size legends interpolate native area before radius and retain exact sample correspondence", () => {
  const from = base(), to = from.editCanvas({ width: 800 }).editScale({ id: "size", range: [0, 400] });
  const p = plan(from, to), f = sampleTransition(p, 50), items = entries(f);
  assert.equal(items.length, 5); assert.ok(items.every(item => item.decision.kernel === "guide-geometry"));
  const symbols = items.filter(item => item.node.type === "circle");
  near(symbols[0].node.properties.radius, Math.sqrt(62.5 / Math.PI));
  near(symbols[1].node.properties.radius, Math.sqrt(250 / Math.PI));
  near(symbols[0].node.properties.x, 566);
  assert.notEqual(symbols[1].node.properties.radius, (Math.sqrt(100 / Math.PI) + Math.sqrt(400 / Math.PI)) / 2);
  assert.strictEqual(sampleTransition(p, 0).graphicSpec, from.graphicSpec); equalOffline(p);
});

test("size legend native forward proof retains all edges, multiline labels and explicit alignment", () => {
  for (const position of ["left", "right", "top", "bottom"]) {
    const from = base({ position, title: "A\nB", labels: { align: "right" }, titleStyle: { align: "left" }, rowPadding: 4, titlePadding: 6 });
    const e = endpoint(from); assert.equal(e.guides.filter(x => x?.kind === "size-legend").length, 5);
    assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
    const to = from.editCanvas({ width: 780, height: 480 }).editLegend({ offset: 25, itemGap: 25, rowPadding: 8, titlePadding: 10 });
    assert.ok(entries(sampleTransition(plan(from, to), 50)).every(x => x.decision.kernel === "guide-geometry"), position);
  }
});

test("transformed size legend samples reuse native mapping policies without inverse coordinates", () => {
  for (const scale of [{ type: "log", domain: [1, 100], base: 10 }, { type: "sqrt", domain: [0, 100] }, { type: "pow", domain: [0, 100], exponent: 2 }]) {
    const from = base({}, scale), to = from.editScale({ id: "size", range: [0, 400] });
    const f = sampleTransition(plan(from, to), 50), radius = entries(f).find(x => x.node.type === "circle").node.properties.radius;
    const fraction = scale.type === "log" ? Math.log(25) / Math.log(100) : scale.type === "sqrt" ? .5 : .0625;
    near(radius, Math.sqrt(fraction * 250 / Math.PI)); equalOffline(plan(from, to));
  }
});

test("strict size legend payload rejects geometry mismatch, metric injection and accessors", () => {
  const from = base(), p = plan(from, from.editCanvas({ width: 800 }));
  const payload = exportTransitionPlan(p), index = payload.from.guides.findIndex(x => x?.kind === "size-legend");
  const bad = structuredClone(payload); bad.from.guides[index].layout.mapping.scale.range = [0, 400];
  assert.throws(() => restoreTransitionPlan(bad), /differs/);
  const state = structuredClone(payload.from.guides[index]); state.layout.metrics.measurements.push({ ...state.layout.metrics.measurements[0], text: "unused" });
  assert.throws(() => normalizeSizeLegendAnimationState(state), /query closure/);
  let reads = 0; const hostile = structuredClone(payload.from.guides[index]);
  Object.defineProperty(hostile.layout.config.labels, "fontSize", { enumerable: true, get() { reads++; return 12; } });
  assert.throws(() => normalizeSizeLegendAnimationState(hostile), /accessors/); assert.equal(reads, 0);
  const invalid = structuredClone(payload.from.guides[index]); invalid.identity.value = ["size", ["value", 50]];
  assert.throws(() => normalizeSizeLegendAnimationState(invalid), /identity/);
});

test("size legend changed membership, text, policy and dependent placement remain explicit fallbacks", () => {
  const from = base();
  for (const to of [from.editLegend({ title: "Changed" }), from.editLegend({ position: "left" }), from.editLegend({ labels: { fontSize: 14 } })]) {
    assert.ok(entries(sampleTransition(plan(from, to), 50)).every(x => x.decision.kind === "crossfade"));
  }
  const inserted = sampleTransition(plan(from, from.editLegend({ values: [25, 50, 100] })), 50);
  assert.equal(inserted.decisions.filter(x => x.kind === "enter").length, 2);
  for (const p of [base().editLegend({ values: "auto" }), base({ border: true }) ]) {
    const transition = plan(p, p.editCanvas({ width: 800 }));
    assert.ok(entries(sampleTransition(transition, 50)).every(x => x.decision.reason === "guide-layout")); equalOffline(transition);
  }
  const inferred = base({ offset: undefined }), automatic = plan(inferred, inferred.editCanvas({ width: 800 }));
  assert.ok(entries(sampleTransition(automatic, 50)).every(item => item.decision.kernel === "guide-geometry")); equalOffline(automatic);
  const edited = from.editGraphics({ target: "sizeLegendSymbols", property: "radius", value: 30 });
  assert.ok(entries(sampleTransition(plan(from, edited), 50)).some(x => x.decision.reason === "guide-edited"));
});

test("size legend mutable inputs are normalized independently and invalid numeric work fails closed", () => {
  const from = base(), a = endpoint(from).guides.find(x => x?.kind === "size-legend");
  const input = structuredClone(a), original = normalizeSizeLegendAnimationState(input);
  input.layout.frame.plot.width += 10;
  assert.notDeepEqual(normalizeSizeLegendAnimationState(input), original);
  for (const mutate of [s => s.layout.symbolStrokeWidth = -1, s => s.layout.config.columns = 0,
    s => s.layout.mapping.value = 50, s => s.layout.mapping.scale.type = "band", s => s.layout.config.labels.fontWeight = 101,
    s => s.layout.config.rowPadding = Infinity, s => s.layout.config.sampling.mode = "auto", s => s.layout.config.extra = 1]) {
    const bad = structuredClone(a); mutate(bad); assert.throws(() => normalizeSizeLegendAnimationState(bad));
  }
  assert.throws(() => sampleSizeLegendInterpolation(prepareSizeLegendInterpolation(a, a), 2), /progress/);
});

test("nested size guide identity preserves scoped owners and exact colors", () => {
  const from = base({ title: false }), to = from.editCanvas({ width: 800 });
  const panels = p => hconcat({ id: "panels", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const p = plan(panels(from), panels(to)), items = entries(sampleTransition(p, 50));
  assert.equal(items.length, 8); assert.equal(new Set(items.map(x => x.decision.guideKey)).size, 8); equalOffline(p);
});


test("sampled size circles rebase and restore their exact current native meaning", () => {
  const from = base(), to = from.editCanvas({ width: 800 }).editScale({ id: "size", range: [0, 400] });
  const p = plan(from, to), middle = sampleTransition(p, 45), rebased = plan(middle, to);
  assert.strictEqual(sampleTransition(rebased, 0), middle);
  assert.ok(entries(sampleTransition(rebased, 50)).every(x => x.decision.kernel === "guide-geometry"));
  equalOffline(rebased);
});

test("size label maps keep hidden and hard-break raw values and exact measured fonts", () => {
  const from = base().editLegendBlock({ target: "points", channel: "size", labelMap: [{ value: 25, label: "A\nB" }, { value: 100, label: "" }], symbol: { stroke: "black", strokeWidth: 2 } });
  const e = endpoint(from), states = e.guides.filter(x => x?.kind === "size-legend");
  assert.equal(states.length, 4); assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
  const p = plan(from, from.editCanvas({ width: 800 })), middle = sampleTransition(p, 50);
  assert.equal(entries(middle).filter(x => x.decision.role === "guide-legend-label").length, 1);
  assert.equal(entries(middle).find(x => x.decision.role === "guide-legend-label").node.properties.lines.length, 2);
  equalOffline(p);
  let reads = 0; const hostile = structuredClone(states[0]);
  hostile.layout.config.labels.format = Object.defineProperty({}, "decimals", { enumerable: true, get() { reads++; return 2; } });
  assert.throws(() => normalizeSizeLegendAnimationState(hostile), /format/); assert.equal(reads, 0);
  const changed = structuredClone(states[0]); changed.identity.owner = "other";
  assert.equal(prepareSizeLegendInterpolation(states[0], changed).reason, "guide-policy");
  const reversed = base({}, { reverse: true });
  const reversedMiddle = entries(sampleTransition(plan(base(), reversed), 50));
  assert.ok(reversedMiddle.every(entry => entry.decision.kernel === "guide-geometry"));
  for (const entry of reversedMiddle.filter(entry => entry.node.type === "circle")) assert.ok(Math.abs(entry.node.properties.radius - Math.sqrt(50 / Math.PI)) < 1e-10);
  const descendingDomain = base({}, { domain: [100, 0] });
  assert.equal(entries(sampleTransition(plan(base(), descendingDomain), 50))[0].decision.reason, "scale-direction");
});

test("native midpoint size fit failure returns an explicit layout fade without shrinking the symbol", () => {
  const from = chart().createCanvas({ width: 400, height: 240, margin: { top: 20, bottom: 20, left: 20, right: 80 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark({ id: "m", opacity: 0 })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeSize({ field: "y", scale: { domain: [0, 10], range: [0, Math.PI * 400] } })
    .createLegend({ channels: ["size"], values: [10], offset: 10, title: false, labels: { offset: 0 } })
    .editLegendBlock({ target: "m", channel: "size", labelMap: [{ value: 10, label: "" }] })
    .editCanvas({ margin: { top: 20, bottom: 20, left: 20, right: 50.1 } });
  const to = from.editCanvas({ margin: { top: 20, bottom: 20, left: 20, right: 130.1 } }).editScale({ id: "size", range: [0, Math.PI * 3600] });
  const p = plan(from, to), f = sampleTransition(p, 50);
  assert.equal(entries(f)[0].decision.reason, "guide-layout"); equalOffline(p);
});
