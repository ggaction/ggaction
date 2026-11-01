import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { prepareGradientLegendLayout, normalizeLegendAnimationState, prepareLegendInterpolation, sampleLegendInterpolation } from "../../../src/materialization/animation/legendState.js";
import { prepareGuideTracks, validateAnimationGuides } from "../../../src/animation/guideTracks.js";
import { ANIMATION_GUIDE_VERSION, normalizeGuideIdentity } from "../../../src/grammar/animation/guideState.js";

const base = (extra = {}) => chart().createCanvas({ width: 700, height: 450, margin: { top: 120, bottom: 120, right: 220, left: 150 } })
  .createData({ id: "rows", values: [{ id: 1, x: 1, y: 1, v: 1 }, { id: 2, x: 100, y: 100, v: 100 }] })
  .createPointMark({ id: "points", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" })
  .encodeColor({ field: "v", fieldType: "quantitative", scale: { type: "log", domain: [1, 100], range: ["red", "blue"] } })
  .createLegend({ channels: ["color"], values: [1, 10, 100], offset: 20, title: "Value", ...extra });
const endpoint = p => { const e = projectAnimationEndpoint(p); return { ...e, guides: projectGuideAnimationState(p, e) }; };
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const guides = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [{ decision, node: frame.scene.nodes[index] }] : []);
const restoredEqual = prepared => {
  const restored = deserializeAnimation(serializeAnimation(prepared)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(prepared, time));
};

test("native exact gradient values use shared log scale meaning and single-block placement", () => {
  const from = base(), to = from.editCanvas({ width: 900 }).editScale({ id: "color", domain: [1, 10000] })
    .editLegend({ gradient: { length: 200, thickness: 20 } });
  const prepared = plan(from, to), frame = sampleTransition(prepared, 50), items = guides(frame);
  assert.equal(items.length, 67); assert.ok(items.every(({ decision }) => decision.kernel === "guide-geometry"));
  const ticks = items.filter(({ decision }) => decision.role === "guide-legend-tick");
  const strips = items.filter(({ decision }) => decision.role === "guide-legend-strip");
  near(strips[0].node.properties.x, 600); near(strips[0].node.properties.y, 152.5);
  near(strips[0].node.properties.width, 16); near(strips[0].node.properties.height, 160 / 60);
  near(ticks[1].node.properties.y1, 152.5 + 160 * 2 / 3);
  assert.notEqual(ticks[1].node.properties.y1, (212.5 + 302.5) / 2);
  assert.strictEqual(sampleTransition(prepared, 0).graphicSpec, from.graphicSpec);
  restoredEqual(prepared);
});

test("native legend forward proof retains all four edges, bottom titles and explicit text alignment", () => {
  for (const position of ["left", "right", "top", "bottom"]) {
    const p = base({ position, title: "A\nB", titlePosition: "bottom", titlePadding: 6, labels: { align: "right" }, titleStyle: { align: "left" } });
    const e = endpoint(p);
    assert.equal(e.guides.filter(state => state?.kind === "legend").length, 67, position);
    assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
    const changed = p.editCanvas({ width: 780, height: 480 }).editLegend({ offset: 25, gradient: { length: 140 }, titlePadding: 10 });
    assert.equal(guides(sampleTransition(plan(p, changed), 50)).filter(x => x.decision.kernel === "guide-geometry").length, 67, position);
  }
});

test("legend colors reuse appearance interpolation and rebase retains exact prepared native meaning", () => {
  const from = base({ title: false }), to = from.editCanvas({ width: 800 }).editScale({ id: "color", range: ["green", "yellow"] });
  const prepared = plan(from, to), middle = sampleTransition(prepared, 45);
  assert.equal(guides(middle).length, 66);
  const rebased = plan(middle, from);
  assert.strictEqual(sampleTransition(rebased, 0), middle);
  assert.ok(guides(sampleTransition(rebased, 50)).every(item => item.decision.kernel === "guide-geometry"));
  restoredEqual(rebased);
});

test("legend semantic sample insertion preserves raw correspondence and scoped owners", () => {
  const from = base(), added = from.editLegend({ values: [1, 5, 10, 100] });
  const frame = sampleTransition(plan(from, added), 50);
  assert.equal(frame.decisions.filter(d => d.kind === "enter").length, 2);
  assert.equal(guides(frame).filter(x => x.decision.kind === "crossfade").length, 67);
  const panels = p => hconcat({ id: "panels", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const nested = plan(panels(from), panels(from.editCanvas({ width: 760 })));
  const keys = guides(sampleTransition(nested, 50)).map(item => item.decision.guideKey);
  assert.equal(keys.length, 134); assert.equal(new Set(keys).size, 134);
  restoredEqual(nested);
});

test("unknown or dependent native layout policies preserve explicit identity and safe fades", () => {
  const from = base();
  for (const p of [base().editLegend({ values: "auto" }), base({ border: { padding: 4 } }), base({ offset: undefined })]) {
    const prepared = plan(p, p.editCanvas({ width: 800 }));
    assert.ok(guides(sampleTransition(prepared, 50)).every(item => item.decision.reason === "guide-layout"));
    restoredEqual(prepared);
  }
  for (const q of [from.editLegend({ title: "Changed" }), from.editLegend({ labels: { fontSize: 14 } }), from.editLegend({ position: "left" })]) {
    assert.ok(guides(sampleTransition(plan(from, q), 50)).some(item => item.decision.kind === "crossfade"));
  }
  const edited = from.editGraphics({ target: "colorGradientTicks", property: "x1", value: 1 });
  assert.ok(guides(sampleTransition(plan(from, edited), 50)).some(item => item.decision.reason === "guide-edited"));
});

test("strict offline legend state rejects changed proof, unknown kernels and nonown layout values", () => {
  const p = base(), prepared = plan(p, p.editCanvas({ width: 800 })), data = exportTransitionPlan(prepared);
  assert.equal(data.kernels.guide, ANIMATION_GUIDE_VERSION);
  const badVersion = structuredClone(data); badVersion.kernels.guide = "native-guide-values@unknown";
  assert.throws(() => restoreTransitionPlan(badVersion), /kernel/);
  const index = data.from.guides.findIndex(state => state?.kind === "legend"), state = data.from.guides[index];
  const corrupt = structuredClone(data); corrupt.from.guides[index].layout.config.offset += 1;
  assert.throws(() => restoreTransitionPlan(corrupt), /differs/);
  const queries = structuredClone(state); queries.layout.metrics.measurements.push({ ...queries.layout.metrics.measurements[0], text: "unused" });
  assert.throws(() => normalizeLegendAnimationState(queries), /query closure/);
  let reads = 0;
  const hostile = structuredClone(state); Object.defineProperty(hostile.layout.config.labels, "fontSize", { enumerable: true, get() { reads++; return 12; } });
  assert.throws(() => normalizeLegendAnimationState(hostile), /accessors/); assert.equal(reads, 0);
  const missing = structuredClone(state); delete missing.layout.config.title;
  assert.throws(() => normalizeLegendAnimationState(missing), /every field/);
  const invalid = structuredClone(state); invalid.identity.value[1] = ["segment", 60, 60];
  assert.throws(() => normalizeLegendAnimationState(invalid), /identity/);
  const bad = structuredClone(state); bad.layout.frame.canvas.width = Infinity;
  assert.throws(() => normalizeLegendAnimationState(bad), /finite/);
  assert.throws(() => sampleLegendInterpolation({ kind: "guide", version: "bad", from: state, to: state }, .5), /Invalid/);
  assert.throws(() => sampleLegendInterpolation(prepareLegendInterpolation(state, state), NaN), /between/);
  assert.throws(() => normalizeGuideIdentity({ ...state.identity, value: ["unknown", ["title"]] }), /family/);
});

test("stroke gradients preserve native width bounds without reading final pixels as scale values", () => {
  let p = chart().createCanvas({ width: 760, height: 460, margin: { top: 100, right: 250, bottom: 100, left: 150 } })
    .createData({ values: [{ x: 0, y: 0, v: 0 }, { x: 10, y: 10, v: 10 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeStroke({ field: "v", fieldType: "quantitative", scale: { domain: [0, 10], range: ["red", "blue"] } })
    .createLegend({ channels: ["stroke"], values: [0, 5, 10], offset: 20 });
  const e = endpoint(p);
  assert.equal(e.guides.filter(state => state?.kind === "legend").length, 67);
  assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
  const q = p.editCanvas({ width: 820 }).editLegend({ gradient: { length: 160 } });
  assert.ok(prepareGuideTracks(e, endpoint(q)).tracks.filter(t => t.guideKey).every(t => t.kind === "semantic-guide"));
  restoredEqual(plan(p, q));
});


test("prepared legend ink retains exact font bindings and only the queries used by native layout", () => {
  const state = endpoint(base()).guides.find(item => item?.kind === "legend"), config = structuredClone(state.layout.config);
  for (const text of [config.labels, config.titleStyle]) text.align = undefined;
  const bindings = [400, 600].map(weight => ({ resource: { kind: "font", id: `font${weight}`, revision: 2 },
    identity: { family: "sans-serif", style: "normal", weight, contentHash: "a".repeat(64), metricsProviderVersion: "literal@1" } }));
  const profile = { schemaVersion: 2, id: "exact", fonts: bindings, measurements: [
    ...["1", "10", "100", "unrelated"].map(text => ({ text, fontFamily: "sans-serif", fontSize: 12, fontWeight: 400, fontStyle: "normal", width: text.length * 7 })),
    { text: "Value", fontFamily: "sans-serif", fontSize: 13, fontWeight: 600, fontStyle: "normal", width: 35 }
  ] };
  const layout = prepareGradientLegendLayout({ config: { ...config, titlePadding: undefined, gradientDirection: undefined }, scale: state.layout.mapping.scale,
    frame: state.layout.frame, profile });
  assert.deepEqual(layout.metrics.fonts, bindings);
  assert.deepEqual(layout.metrics.measurements.map(query => query.text), ["1", "10", "100", "Value"]);
  assert.ok(Object.isFrozen(layout.metrics.fonts[0].identity));
  const missing = { ...profile, measurements: profile.measurements.slice(0, 2) };
  assert.throws(() => prepareGradientLegendLayout({ config, scale: state.layout.mapping.scale, frame: state.layout.frame, profile: missing }), error => error.assetCode === "metrics-required");
  const a = { ...state, layout }, b = structuredClone(a); b.layout.metrics.fonts[0].identity.contentHash = "b".repeat(64);
  assert.equal(prepareLegendInterpolation(a, b).reason, "guide-layout");
});

test("prepared legend closure rejects policy forgery and out-of-domain semantic identities", () => {
  const state = endpoint(base()).guides.find(item => item?.kind === "legend");
  const invalid = [
    value => { value.kind = "other"; },
    value => { value.layout.config.position = "free"; },
    value => { value.layout.config.labels.fontWeight = 0; },
    value => { value.layout.config.sampling.mode = "auto"; },
    value => { value.layout.mapping.scale.range = [0, 10]; },
    value => { value.layout.mapping.value = 10; },
    value => { delete value.layout.mapping.scale.clamp; },
    value => { delete value.layout.metrics.id; },
    value => { value.layout.metrics.schemaVersion = 2; },
    value => { value.identity.component = "legend-tick"; value.identity.value = ["gradient", ["value", 50]]; },
    value => { value.layout.config.gradient.length = 0; },
    value => { value.layout.config.extra = true; }
  ];
  for (const change of invalid) { const value = structuredClone(state); change(value); assert.throws(() => normalizeLegendAnimationState(value)); }
  const other = { ...state, identity: { ...state.identity, owner: "another" } };
  assert.equal(prepareLegendInterpolation(state, other).reason, "guide-policy");
  const clamp = structuredClone(state); clamp.layout.mapping.scale.clamp = true;
  assert.equal(prepareLegendInterpolation(state, clamp).reason, "scale-clamp");
});


test("legend sample normalization does not cache mutable caller layout values", () => {
  const source = endpoint(base()).guides.find(state => state?.kind === "legend");
  const input = structuredClone(prepareLegendInterpolation(source, source));
  input.to = structuredClone(input.to);
  const first = sampleLegendInterpolation(input, .5);
  input.from.layout.config.offset += 10;
  input.to.layout.config.offset += 10;
  const changed = sampleLegendInterpolation(input, .5);
  near(changed.properties.x, first.properties.x + 10);
  assert.equal(first.state.layout.config.offset, source.layout.config.offset);
  const incompatible = structuredClone(input); incompatible.to.layout.config.title = "Other";
  assert.throws(() => sampleLegendInterpolation(incompatible, .5), /query closure|Invalid/);
});


test("temporal gradient legends retain exact epoch values and native formatted labels", () => {
  const start = Date.UTC(2025, 0, 1), day = 86400000;
  const from = chart().createCanvas({ width: 600, height: 400, margin: { top: 80, bottom: 80, left: 60, right: 180 } })
    .createData({ values: [{ x: 1, y: 2, date: "2025-01-01" }, { x: 2, y: 3, date: "2025-01-03" }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: "date", fieldType: "temporal" })
    .createLegend({ channels: ["color"], values: [start, start + day, start + 2 * day], offset: 20, title: false });
  const to = from.editCanvas({ width: 700 }).editLegend({ gradient: { length: 160 } });
  const prepared = plan(from, to), frame = sampleTransition(prepared, 50);
  assert.equal(guides(frame).filter(item => item.decision.kernel === "guide-geometry").length, 66);
  assert.deepEqual(guides(frame).filter(item => item.decision.role === "guide-legend-label").map(item => item.node.properties.text),
    from.graphicSpec.objects.colorGradientLabels.items.map(item => item.properties.text));
  restoredEqual(prepared);
});
