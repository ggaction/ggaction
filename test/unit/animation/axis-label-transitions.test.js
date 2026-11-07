import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { validateAnimationGuides } from "../../../src/animation/guideTracks.js";
import { prepareAxisAnimationLayout, normalizeAxisLabelAnimationState, prepareAxisLabelInterpolation, sampleAxisLabelInterpolation } from "../../../src/materialization/animation/axisLabelState.js";

const base = () => chart().createCanvas({ width: 500, height: 400, margin: 80 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const project = p => { const e = projectAnimationEndpoint(p); return { ...e, guides: projectGuideAnimationState(p, e) }; };
const labels = frame => frame.decisions.flatMap((decision, index) => decision.role === "guide-labels" ? [{ decision, node: frame.scene.nodes[index] }] : []);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const roundtrip = p => { const restored = deserializeAnimation(serializeAnimation(p)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(p, time)); };

function literal() {
  const config = { position: "bottom", offset: 7, alongOffset: 3, fontFamily: "Fixture", fontSize: 10, fontWeight: "normal",
    rotation: 0, flush: true, format: "auto", overlap: "error" };
  const profile = { schemaVersion: 1, id: "literal", measurements: [["0", 20], ["10", 40]].map(([text, width]) =>
    ({ text, width, fontFamily: "Fixture", fontSize: 10, fontWeight: 400, fontStyle: "normal" })) };
  const layout = prepareAxisAnimationLayout({ values: [0, 10], scale: { type: "linear", domain: [0, 10], range: [20, 120], clamp: false },
    config, channel: "x", frame: { x: 20, y: 30, width: 100, height: 80 }, canvas: { width: 200, height: 200 }, profile, edgeAligned: false });
  return { identity: { namespaces: [], owner: "x", component: "labels", value: 0, line: 0 }, kind: "label-layout", layout };
}

test("prepared axis flush replays raw mapping and measured widths instead of endpoint pixel interpolation", () => {
  const a = literal(), b = structuredClone(a);
  b.layout.mapping.scale.domain = [0, 20]; b.layout.mapping.scale.range = [40, 180];
  b.layout.frame = { x: 40, y: 30, width: 140, height: 80 }; b.layout.config.offset = 11;
  const copy = structuredClone(a), prepared = prepareAxisLabelInterpolation(a, b);
  const first = sampleAxisLabelInterpolation(prepared, .5);
  near(first.properties.x, 43); near(first.properties.y, 119);
  const second = sampleAxisLabelInterpolation(prepareAxisLabelInterpolation({ ...a, identity: { ...a.identity, value: 10 } }, { ...b, identity: { ...b.identity, value: 10 } }), .5);
  near(second.properties.x, 113); // 30 + (10 / 15) * 120 + alongOffset 3
  assert.notEqual(second.properties.x, (103 + 113) / 2);
  assert.deepEqual(a, copy); assert.ok(Object.isFrozen(first.state.layout.metrics));
});

test("public flush labels preserve raw keys, current-frame meaning and strict offline equality", () => {
  const from = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { flush: true } }, title: false });
  const before = serializeProgram(from), to = from.editCanvas({ width: 640 }).editXAxisLabels({ alongOffset: 3, offset: 12 });
  const p = plan(from, to), middle = sampleTransition(p, 45);
  assert.equal(labels(middle).length, 3); assert.ok(labels(middle).every(x => x.decision.kernel === "guide-geometry"));
  const e = project(from); assert.equal(e.guides.filter(s => s?.kind === "label-layout").length, 3);
  assert.deepEqual(validateAnimationGuides(e.guides, e), e.guides);
  roundtrip(p); const rebased = plan(middle, from); assert.strictEqual(sampleTransition(rebased, 0), middle); roundtrip(rebased);
  assert.equal(serializeProgram(from), before);
});

test("fixed rotations and edge-aligned frames retain native text placement on all four sides", () => {
  for (const channel of ["x", "y"]) for (const position of channel === "x" ? ["bottom", "top"] : ["left", "right"]) {
    const p = base()[channel === "x" ? "createXAxis" : "createYAxis"]({ position,
      ticksAndLabels: { values: [0, 10], labels: { rotation: { value: 35, unit: "degrees" } } }, title: false });
    const frame = sampleTransition(plan(p, p.editCanvas({ width: 620, height: 460 })), 50);
    assert.equal(labels(frame).length, 2); assert.ok(labels(frame).every(x => x.decision.kernel === "guide-geometry"));
    for (const item of labels(frame)) near(item.node.properties.rotation, 35 * Math.PI / 180);
    roundtrip(plan(p, p.editCanvas({ width: 620, height: 460 })));
  }
  const p = chart().createCanvas({ plot: { width: 300, height: 200 }, margin: 80 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
    .createYAxis({ ticksAndLabels: { values: [0, 10] }, title: false });
  assert.ok(project(p).guides.filter(s => s?.identity.component === "labels").every(s => s.kind === "label-layout"));
  assert.ok(labels(sampleTransition(plan(p, p.editCanvas({ plot: { width: 400, height: 240 } })), 50)).every(x => x.decision.kernel === "guide-geometry"));
});

test("hard-break and hidden labels retain semantic line identity in scoped layouts", () => {
  const p = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { flush: true,
    labelMap: [{ value: 0, label: "Low\nstart" }, { value: 5, label: "" }, { value: 10, label: "High" }] } }, title: false });
  const nested = p => hconcat({ id: "outer", programs: [{ id: "one", program: p }, { id: "two", program: p }] });
  const prepared = plan(nested(p), nested(p.editCanvas({ width: 600 })));
  const items = labels(sampleTransition(prepared, 50)); assert.equal(items.length, 6);
  assert.equal(new Set(items.map(x => x.decision.guideKey)).size, 6);
  assert.deepEqual(items.map(x => x.node.properties.text), ["Low", "start", "High", "Low", "start", "High"]);
  roundtrip(prepared);
});

test("layout changes retain explicit fade policy while unresolved wrapping remains unsupported", () => {
  const p = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { flush: true } }, title: false });
  for (const q of [p.editXAxisLabels({ fontSize: 14 }), p.editXAxisLabels({ labelMap: [{ value: 10, label: "Maximum" }] }),
    p.editXAxisLabels({ flushThreshold: 3 }), p.editXAxis({ ticksAndLabels: { values: [0, 10] } })]) {
    assert.ok(labels(sampleTransition(plan(p, q), 50)).some(x => x.decision.kind === "crossfade")); roundtrip(plan(p, q));
  }
  const wrapped = p.editXAxisLabels({ maxWidth: 50, wrap: "word" });
  assert.ok(project(wrapped).guides.filter(s => s?.identity.component === "labels").every(s => s.reason === "guide-layout"));
  const edited = p.editGraphics({ target: "xAxisLabels", property: "x", value: 100 });
  assert.ok(labels(sampleTransition(plan(p, edited), 50)).every(x => x.decision.reason === "guide-edited"));
});

test("strict axis state rejects corrupted geometry, nonown policy and extra metric queries without execution", () => {
  const p = base().createXAxisLabels({ values: [0, 10], flush: true }), data = exportTransitionPlan(plan(p, p.editCanvas({ width: 600 })));
  const index = data.from.guides.findIndex(s => s?.kind === "label-layout"), state = data.from.guides[index];
  const corrupt = structuredClone(data); corrupt.from.guides[index].layout.config.offset += 1;
  assert.throws(() => restoreTransitionPlan(corrupt), /differs/);
  const extra = structuredClone(state); extra.layout.metrics.measurements.push({ ...extra.layout.metrics.measurements[0], text: "unused" });
  assert.throws(() => normalizeAxisLabelAnimationState(extra), /query closure/);
  for (const mutate of [s => { delete s.layout.config.offset; }, s => { s.layout.mapping.value = 10; }, s => { s.layout.values[0] = null; },
    s => { s.identity.line = 10; }, s => { s.kind = "other"; }, s => { s.layout.canvas.width = Infinity; }, s => { s.layout.config.position = "free"; },
    s => { s.layout.config.rotation = 1; }, s => { s.layout.config.flushThreshold = -1; }, s => { s.layout.values = [100]; }]) {
    const value = structuredClone(state); mutate(value); assert.throws(() => normalizeAxisLabelAnimationState(value));
  }
  let reads = 0; const hostile = structuredClone(state);
  Object.defineProperty(hostile, "kind", { enumerable: true, get() { reads++; return "label-layout"; } });
  const endpoint = project(p), input = [...endpoint.guides]; input[index] = hostile;
  assert.throws(() => validateAnimationGuides(input, endpoint), /accessors/); assert.equal(reads, 0);
});

test("exact font bindings remain attached to prepared layout and missing metrics cannot be guessed", () => {
  const s = literal(), layout = s.layout;
  const binding = { resource: { kind: "font", id: "face", revision: 2 }, identity: {
    family: "Fixture", style: "normal", weight: 400, contentHash: "a".repeat(64), metricsProviderVersion: "literal@1" } };
  const profile = { schemaVersion: 2, id: "bound", fonts: [binding], measurements: layout.metrics.measurements };
  const args = { values: layout.values, scale: layout.mapping.scale, config: { ...layout.config, flushThreshold: undefined, align: undefined },
    channel: layout.channel, frame: layout.frame, canvas: layout.canvas, edgeAligned: layout.edgeAligned, profile };
  const prepared = prepareAxisAnimationLayout(args); assert.deepEqual(prepared.metrics.fonts, [binding]);
  assert.throws(() => prepareAxisAnimationLayout({ ...args, profile: { ...profile, measurements: [] } }), e => e.assetCode === "metrics-required");
  const other = structuredClone({ ...s, layout: prepared }); other.layout.metrics.fonts[0].resource.revision++;
  assert.equal(prepareAxisLabelInterpolation({ ...s, layout: prepared }, other).reason, "guide-layout");
});

test("axis layout policy and work boundaries reject impossible retained state before sampling", () => {
  const a = literal();
  const mutations = [s => { s.layout.frame.width = -1; }, s => { s.layout.config.fontSize = 0; },
    s => { s.layout.config.offset = -1; }, s => { s.layout.channel = "theta"; }, s => { s.layout.values = []; },
    s => { delete s.layout.mapping.scale.type; }, s => { s.layout.values = [20]; s.layout.mapping.value = 20; },
    s => { s.layout.config.align = "unknown"; }, s => { s.layout.config.fontWeight = 450; },
    s => { s.layout.config.overlap = "unknown"; }, s => { s.layout.config.labelMap = [{ value: 0, label: "unused" }]; },
    s => { s.layout.frame.height = 300; }, s => { s.layout.mapping.scale.range = [20, 30]; },
    s => { s.layout.mapping.scale.range = [20, 45]; s.layout.config.flush = false; },
    s => { s.layout.config.labelMap = Array(3200).fill({ value: 0, label: "A" }); }];
  for (const mutate of mutations) { const s = structuredClone(a); mutate(s); assert.throws(() => normalizeAxisLabelAnimationState(s)); }
  const other = { ...a, identity: { ...a.identity, owner: "other" } };
  assert.equal(prepareAxisLabelInterpolation(a, other).reason, "guide-policy");
  const clamp = structuredClone(a); clamp.layout.mapping.scale.clamp = true;
  assert.equal(prepareAxisLabelInterpolation(a, clamp).reason, "scale-clamp");
  const prepared = prepareAxisLabelInterpolation(a, a);
  assert.throws(() => sampleAxisLabelInterpolation({ ...prepared, version: "unknown" }, .5), /Invalid/);
  assert.throws(() => sampleAxisLabelInterpolation(prepared, NaN), /between/);
  assert.throws(() => sampleAxisLabelInterpolation({ ...prepared, to: other }, .5), /Invalid/);
});

test("discrete ranges and decimal display policy reuse native mapping with fixed measured text", () => {
  const p = chart().createCanvas({ width: 500, height: 400, margin: 100 })
    .createData({ values: [{ x: "a", y: 0 }, { x: "b", y: 10 }] }).createPointMark()
    .encodeX({ field: "x", fieldType: "nominal", scale: { type: "point" } }).encodeY({ field: "y" })
    .createXAxisLabels({ flush: true, align: "center", flushThreshold: 0 })
    .createYAxisLabels({ values: [0, 10], format: { decimals: 1 }, rotation: .2, overlap: "allow" });
  const q = p.editCanvas({ width: 600, height: 500 }), prepared = plan(p, q);
  assert.equal(labels(sampleTransition(prepared, 50)).filter(x => x.decision.kernel === "guide-geometry").length, 4);
  roundtrip(prepared);
  const changed = q.editScale({ id: "x", domain: ["b", "a"] });
  assert.ok(labels(sampleTransition(plan(q, changed), 50)).some(x => x.decision.reason === "ordinal-domain"));
});

test("axis layout normalization never caches mutable caller values", () => {
  const a = literal(), input = structuredClone(prepareAxisLabelInterpolation(a, a)); input.to = structuredClone(input.to);
  const first = sampleAxisLabelInterpolation(input, .5); input.from.layout.config.offset++; input.to.layout.config.offset++;
  const second = sampleAxisLabelInterpolation(input, .5);
  near(second.properties.y, first.properties.y + 1); assert.equal(first.state.layout.config.offset, 7);
});
