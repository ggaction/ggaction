import { GRADIENT_STRIP_COUNT } from "../../../src/materialization/guides/legendGradient.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { legendGuideItems } from "../../../src/materialization/guides/legendItems.js";
import { prepareAnimationLegendLanes } from "../../../src/materialization/animation/legendLaneGuides.js";
import { normalizeLegendLaneAnimationState, resolveLegendLaneAnimationGeometry, prepareLegendLaneInterpolation, sampleLegendLaneInterpolation } from "../../../src/materialization/animation/legendLaneState.js";

const source = (position = "right", gradient = false, inferred = false) => {
  let p = chart().createCanvas({ width: 1300, height: 1100, margin: 300 })
    .createData({ values: [{ x: 0, y: 0, g: "A", s: 1 }, { x: 1, y: 1, g: "B", s: 4 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: gradient ? "s" : "g", ...(gradient ? { fieldType: "quantitative" } : {}) })
    .encodeSize({ field: "s", scale: { range: [Math.PI * 16, Math.PI * 64] } });
  return p.createLegend({ channels: ["color"], position, title: "T", ...(inferred ? {} : { offset: 20 }), ...(gradient ? { values: [1, 4], gradient: { length: 80, thickness: 10 } } : {}) })
    .createLegend({ channels: ["size"], position, values: [1, 4], title: "T", ...(inferred ? {} : { offset: 20 }) });
};
function states(program) {
  const layouts = prepareAnimationLegendLanes(program, () => {}), endpoint = projectAnimationEndpoint(program);
  return legendGuideItems(program, () => {}).map(item => {
    const value = item.component === "strip" ? [item.kind, ["segment", item.line, GRADIENT_STRIP_COUNT]] : ["color", "series", "stroke"].includes(item.kind) && item.component === "symbol" ? [item.kind, [...item.value[1], item.part]] : item.value;
    const state = normalizeLegendLaneAnimationState({ identity: { namespaces: [], owner: item.ownerId, component: `legend-${item.component}`, value, line: 0 }, kind: "legend-lane", layout: layouts.get(item.kind) });
    const node = endpoint.scene.nodes.find(node => node.key === item.graphicId);
    return { state, node, graphicId: item.graphicId };
  });
}
function compare(program, actual) {
  const expected = states(program);
  assert.equal(actual.length, expected.length);
  for (const [index, output] of actual.entries()) assert.deepEqual(output, resolveLegendLaneAnimationGeometry(expected[index].state));
}
test("implicit native lane foundation preserves exact original edge geometry", () => {
  for (const position of ["right", "left", "top", "bottom"]) for (const gradient of [false, true]) {
    const p = source(position, gradient), prepared = states(p);
    assert.ok(prepared.length > 0);
    // Compare each prepared component directly with the native materialized
    // graphic, retaining raw value and role correspondence from the native owner.
    for (const { state, graphicId } of prepared) {
      const item = p.graphicSpec.objects[graphicId] ?? Object.values(p.graphicSpec.objects).flatMap(x => x.items ?? []).find(x => x.id === graphicId);
      const output = resolveLegendLaneAnimationGeometry(state);
      assert.ok(item, graphicId);
      for (const [key, value] of Object.entries(output.properties)) assert.deepEqual(value, item.properties[key], `${position}/${gradient}/${graphicId}/${key}`);
    }
  }
});
test("implicit lane foundation resolves size area and current frame at the midpoint", () => {
  for (const position of ["right", "left", "top", "bottom"]) {
    const a = source(position), b = a.editCanvas({ width: 1400, height: 1200 }).editScale({ id: "size", range: [Math.PI * 64, Math.PI * 144] });
    const expected = a.editCanvas({ width: 1350, height: 1150 }).editScale({ id: "size", range: [Math.PI * 40, Math.PI * 104] });
    const from = states(a), to = states(b);
    compare(expected, from.map(({ state }, index) => {
      const plan = prepareLegendLaneInterpolation(state, to[index].state); assert.equal(plan.kind, "guide");
      const sample = sampleLegendLaneInterpolation(plan, .5); assert.equal(sample.kind, "guide");
      return { type: sample.type, properties: sample.properties };
    }));
  }
});

const transition = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const visible = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [{ decision, node: frame.scene.nodes[index] }] : []);
const native = program => visible(sampleTransition(transition(program, program), 50)).map(({ node }) => ({ type: node.type, properties: node.properties }));
function offline(plan) {
  const restored = deserializeAnimation(serializeAnimation(plan)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
}
test("public implicit lanes follow the native four edges with explicit and inferred gaps", () => {
  for (const edge of ["left", "right", "top", "bottom"]) for (const inferred of [false, true]) {
    const from = source(edge, false, inferred), to = from.editCanvas({ width: 1400, height: 1200 });
    const plan = transition(from, to), middle = sampleTransition(plan, 50), items = visible(middle);
    assert.ok(items.length > 0 && items.every(item => item.decision.kernel === "guide-geometry"), edge);
    assert.deepEqual(items.map(({ node }) => ({ type: node.type, properties: node.properties })), native(from.editCanvas({ width: 1350, height: 1150 })));
    offline(plan);
  }
});
test("implicit lane current-frame rebase and nested identity preserve complete dependencies", () => {
  const panels = p => hconcat({ id: "panels", programs: [{ id: "first", program: p }, { id: "second", program: p }] });
  const original = source("right", true), snapshot = JSON.stringify(original), from = panels(original), to = panels(original.editCanvas({ width: 1400 }));
  const plan = transition(from, to), captured = sampleTransition(plan, 50), next = transition(captured, to);
  assert.strictEqual(sampleTransition(next, 0), captured);
  const items = visible(sampleTransition(next, 50));
  assert.ok(items.every(item => item.decision.kernel === "guide-geometry"));
  assert.equal(new Set(items.map(item => item.decision.guideKey)).size, items.length);
  offline(next); assert.equal(JSON.stringify(original), snapshot);
});
test("strict implicit lane restore rejects incomplete or inconsistent siblings and malformed policies", () => {
  const from = source(), payload = exportTransitionPlan(transition(from, from.editCanvas({ width: 1400 })));
  const index = payload.from.guides.findIndex(state => state?.kind === "legend-lane"), state = payload.from.guides[index];
  assert.ok(index >= 0);
  for (const mutate of [s => s.layout.blocks[0].values.config.offset++, s => s.layout.blocks[1].values.mapping.scale.domain[1]++,
    s => s.layout.blocks[1].target = "other", s => s.layout.blocks.reverse()]) {
    const copy = structuredClone(payload); mutate(copy.from.guides[index]); assert.throws(() => restoreTransitionPlan(copy), /differs|group meaning|native component/);
  }
  const missing = structuredClone(payload); missing.from.guides[index] = null; assert.throws(() => restoreTransitionPlan(missing), /complete group/);
  for (const mutate of [s => s.layout.edge = "middle", s => s.layout.allowOverflow = 1, s => s.layout.blocks = [],
    s => s.layout.blocks.push(s.layout.blocks[0]), s => s.layout.blocks[0].values.frame = s.layout.frame,
    s => s.layout.blocks[0].target = "", s => s.layout.blocks[0].kind = "missing", s => s.layout.blocks[0].values.config.position = "left"]) {
    const copy = structuredClone(state); mutate(copy); assert.throws(() => normalizeLegendLaneAnimationState(copy));
  }
  let reads = 0; const accessor = structuredClone(state);
  Object.defineProperty(accessor.layout.blocks[0], "target", { enumerable: true, get() { reads++; return "points"; } });
  assert.throws(() => normalizeLegendLaneAnimationState(accessor), /accessors/); assert.equal(reads, 0);
  assert.throws(() => sampleLegendLaneInterpolation(prepareLegendLaneInterpolation(state, state), 2));
});
test("unsupported lane dependencies and a manually edited sibling keep the entire lane on safe fades", () => {
  const from = source(), moved = from.editGraphics({ target: "sizeLegendTitle", property: "x", value: 900 });
  assert.ok(visible(sampleTransition(transition(from, moved), 50)).every(item => item.decision.kind === "crossfade"));
  offline(transition(from, moved));
  const changed = from.editLegendBlock({ target: "points", channel: "size", title: "Changed" });
  assert.ok(visible(sampleTransition(transition(from, changed), 50)).every(item => item.decision.kind === "crossfade"));
  const unprepared = source("right", false, true).createYAxis({ position: "right" }).editYAxisLabels({ maxWidth: 20 });
  assert.ok(visible(sampleTransition(transition(unprepared, unprepared.editCanvas({ width: 1400 })), 50)).every(item => item.decision.reason === "guide-layout"));
  const badPaint = from.editLegend({ target: "points", channels: ["size"], labels: { color: "currentColor" } });
  const sampled = sampleTransition(transition(from, badPaint), 50);
  assert.ok(visible(sampled).every(item => item.decision.kind === "crossfade"));
  offline(transition(sampled, badPaint));
});

test("implicit lane public size changes use native area and reject stale bound-driving text edits", () => {
  const from = source(), to = from.editScale({ id: "size", range: [Math.PI * 64, Math.PI * 144] });
  const plan = transition(from, to), middle = sampleTransition(plan, 50);
  assert.ok(visible(middle).every(item => item.decision.kernel === "guide-geometry"));
  assert.deepEqual(visible(middle).map(({ node }) => ({ type: node.type, properties: node.properties })),
    native(from.editScale({ id: "size", range: [Math.PI * 40, Math.PI * 104] })));
  offline(plan);
  for (const [property, value] of [["fontSize", 50], ["rotation", 45]]) {
    const edited = from.editGraphics({ target: "sizeLegendTitle", property, value });
    const changed = transition(from, edited);
    assert.ok(visible(sampleTransition(changed, 50)).every(item => item.decision.reason === "guide-edited"));
    offline(changed);
  }
});

test("partial lane and explicit group exits retain identity without losing unrelated scoped guides", () => {
  for (const grouped of [false, true]) {
    const original = grouped ? source().editLegendLayout({ position: "right", offset: 20, blockLayout: "column" }) : source();
    const next = original.editLegend({ target: "points", channels: ["size"], labels: { color: "currentColor" } });
    const panels = child => hconcat({ id: "lanes", programs: [{ id: "changing", program: child }, { id: "stable", program: source() }] });
    const from = panels(original), to = panels(next), captured = sampleTransition(transition(from, to), 50);
    const nextPlan = transition(captured, to), payload = exportTransitionPlan(nextPlan);
    const changing = payload.from.guides.filter(state => state?.identity.namespaces.includes("lanes-changing"));
    const stable = payload.from.guides.filter(state => state?.identity.namespaces.includes("lanes-stable"));
    assert.ok(changing.length > 0 && changing.every(state => state.reason === "guide-unavailable"));
    assert.ok(stable.length > 0 && stable.every(state => state.kind === "legend-lane"));
    assert.strictEqual(sampleTransition(nextPlan, 0), captured);
    offline(nextPlan);
  }
});

test("implicit lane exact font closures agree across blocks and reject mismatched shared resources", () => {
  const state = structuredClone(states(source())[0].state);
  const fonts = [400, 600].map(weight => ({ resource: { kind: "font", id: `f${weight}`, revision: 2 },
    identity: { family: "sans-serif", style: "normal", weight, contentHash: "a".repeat(64), metricsProviderVersion: "literal@1" } }));
  for (const block of state.layout.blocks) block.values.metrics = { ...block.values.metrics, schemaVersion: 2, fonts: structuredClone(fonts) };
  const normalized = normalizeLegendLaneAnimationState(state);
  assert.deepEqual(resolveLegendLaneAnimationGeometry(normalized), resolveLegendLaneAnimationGeometry(states(source())[0].state));
  for (const mutate of [s => s.layout.blocks[1].values.metrics.fonts[0].identity.contentHash = "b".repeat(64),
    s => s.layout.blocks[1].values.metrics.measurements.find(q => q.text === "T").width++,
    s => { s.layout.blocks[1].values.metrics.schemaVersion = 1; delete s.layout.blocks[1].values.metrics.fonts; }]) {
    const changed = structuredClone(state); mutate(changed); assert.throws(() => normalizeLegendLaneAnimationState(changed), /must agree|one native font policy/);
  }
  const missing = structuredClone(state); missing.layout.blocks[0].values.metrics.measurements = [];
  assert.throws(() => normalizeLegendLaneAnimationState(missing), /exact native query closure/);
});
test("implicit lanes preserve native hidden and multiline labels and reject unsupported stored consumers", () => {
  const from = source().editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: "A", label: "First\nline" }, { value: "B", label: "" }] });
  const plan = transition(from, from.editCanvas({ width: 1400 }));
  const frame = sampleTransition(plan, 50);
  assert.ok(visible(frame).every(item => item.decision.kernel === "guide-geometry"));
  assert.ok(visible(frame).some(item => item.node.properties.lines?.length === 2)); offline(plan);
  const original = source();
  const view = patch => ({ semanticSpec: original.semanticSpec, graphicSpec: original.graphicSpec, guideConfigs: original.guideConfigs,
    materializationConfigs: original.materializationConfigs, markConfigs: original.markConfigs, resolvedScales: original.resolvedScales, context: original.context, ...patch });
  const noNative = view({ context: { ...original.context, facetLegendIntrinsic: true } });
  assert.equal(prepareAnimationLegendLanes(noNative, () => {}).size, 0);
  const collected = view({ context: { ...original.context, compositionCollectedLegends: ["color"] } });
  assert.equal(prepareAnimationLegendLanes(collected, () => {}).size, 0);
  const ordinal = view({ resolvedScales: { ...original.resolvedScales, size: { ...original.resolvedScales.size, type: "ordinal" } } });
  assert.equal(prepareAnimationLegendLanes(ordinal, () => {}).size, 0);
  assert.throws(() => prepareAnimationLegendLanes(original, () => { throw new RangeError("Shared work exhausted"); }), /Shared work/);
});

test("stroke gradient lanes retain native stroke widths and explicit continuous sample roles", () => {
  const from = chart().createCanvas({ width: 1300, height: 1100, margin: 300 })
    .createData({ values: [{ x: 0, y: 0, s: 1 }, { x: 1, y: 1, s: 4 }] }).createPointMark({ id: "m", stroke: "black", strokeWidth: 3 })
    .encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeStroke({ field: "s", fieldType: "quantitative" }).encodeSize({ field: "s" })
    .createLegend({ channels: ["stroke"], values: [1, 4], offset: 20 })
    .createLegend({ channels: ["size"], values: [1, 4], offset: 20 });
  const plan = transition(from, from.editCanvas({ width: 1400 })), frame = sampleTransition(plan, 50);
  assert.ok(visible(frame).length > 0 && visible(frame).every(item => item.decision.kernel === "guide-geometry")); offline(plan);
});
