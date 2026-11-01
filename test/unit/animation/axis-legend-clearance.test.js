import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { prepareAnimationLegendLanes } from "../../../src/materialization/animation/legendLaneGuides.js";
import { resolveLegendLaneClearanceEntries } from "../../../src/materialization/animation/legendLaneState.js";
import { resolveGuideCollisionBlocks, effectiveLegendOffsetConfig } from "../../../src/materialization/guides/resources.js";
import { resolveAxisLaneClearance } from "../../../src/materialization/guides/axisClearance.js";
import { legendGuideItems } from "../../../src/materialization/guides/legendItems.js";
import { GRADIENT_STRIP_COUNT } from "../../../src/materialization/guides/legendGradient.js";

function source(position, count, gradient = false) {
  let p = chart().createCanvas({ width: 1400, height: 1200, margin: 350 })
    .createData({ values: [{ x: 0, y: 0, g: "A", s: 1 }, { x: 1, y: 1, g: "B", s: 4 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .encodeColor({ field: gradient ? "s" : "g", ...(gradient ? { fieldType: "quantitative" } : {}) })
    .encodeSize({ field: "s", scale: { range: [Math.PI * 16, Math.PI * 64] } })
    .createLegend({ channels: ["color"], position, title: "Legend", ...(gradient ? { values: [1, 4], gradient: { length: 80, thickness: 10 } } : {}) });
  if (count === 2) p = p.createLegend({ channels: ["size"], position, values: [1, 4], title: "Legend" });
  return ["top", "bottom"].includes(position) ? p.createXAxis({ position }) : p.createYAxis({ position });
}
function input(program, edge) {
  // Only the standalone state owner is under test. Exclude actual axis blocks
  // from admission so the same native family layouts can be passed explicitly.
  const view = Object.create(program);
  Object.defineProperty(view, "guideConfigs", { value: { ...program.guideConfigs, axis: {} } });
  const layout = prepareAnimationLegendLanes(view, () => {}).values().next().value;
  const blocks = resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs, undefined, program.materializationConfigs.textMetrics).filter(block => block.kind === "axis");
  return { layout, clearance: resolveAxisLaneClearance(edge, layout.frame.plot, blocks), offsets: layout.blocks.filter(block => effectiveLegendOffsetConfig(program, block.kind, program.guideConfigs.legend[block.kind]).inferredOffset === true).map(block => ({ kind: block.kind, owner: block.kind === "size" && program.guideConfigs.legend.size.inheritPosition !== false ? layout.blocks[0].kind : block.kind })) };
}
function assertNative(program, entries) {
  const items = legendGuideItems(program, () => {});
  assert.equal(entries.length, items.length);
  for (const item of items) {
    const sample = item.component === "strip" ? ["segment", item.line, GRADIENT_STRIP_COUNT]
      : ["color", "series", "stroke"].includes(item.kind) && item.component === "symbol" ? [...item.value[1], item.part] : item.value[1];
    const entry = entries.find(value => value.family === item.kind && value.component === `legend-${item.component}` && JSON.stringify(value.sample) === JSON.stringify(sample));
    assert.ok(entry, `${item.kind}/${item.component}/${sample}`);
    const object = program.graphicSpec.objects[item.graphicId] ?? Object.values(program.graphicSpec.objects).flatMap(value => value.items ?? []).find(value => value.id === item.graphicId);
    for (const [key, value] of Object.entries(entry.properties)) assert.deepEqual(value, object.properties[key], `${item.graphicId}.${key}`);
  }
}
test("current native axis ink places single and combined legend lanes on all four edges", () => {
  for (const edge of ["left", "right", "top", "bottom"]) for (const count of [1, 2]) for (const gradient of [false, true]) {
    const program = source(edge, count, gradient), { layout, ...clearance } = input(program, edge);
    assert.ok(clearance.clearance > 0);
    const snapshot = JSON.stringify(layout);
    try { assertNative(program, resolveLegendLaneClearanceEntries(layout, clearance)); } catch (error) { error.message = `${edge}/${count}/${gradient}: ${error.message}`; throw error; }
    assert.equal(JSON.stringify(layout), snapshot);
  }
});
test("axis lane clearance uses current ink rather than accumulating an endpoint offset", () => {
  for (const edge of ["left", "right", "top", "bottom"]) {
    const original = source(edge, 2), channel = ["top", "bottom"].includes(edge) ? "X" : "Y";
    const changed = original[`edit${channel}AxisLabels`]({ offset: 30, fontSize: 20 });
    const before = input(original, edge), after = input(changed, edge);
    assert.ok(after.clearance > before.clearance);
    assertNative(changed, resolveLegendLaneClearanceEntries(before.layout, { clearance: after.clearance, offsets: before.offsets }));
    assertNative(original, resolveLegendLaneClearanceEntries(before.layout, { clearance: before.clearance, offsets: before.offsets }));
  }
});
test("current clearance input rejects malformed or unrelated inference without reading accessors", () => {
  const prepared = input(source("right", 2), "right"), { layout, ...valid } = prepared;
  for (const changed of [{ ...valid, clearance: -1 }, { ...valid, clearance: Infinity }, { ...valid, offsets: [] },
    { ...valid, offsets: [{ kind: "missing", owner: "color" }] }, { ...valid, offsets: [{ kind: "color", owner: "missing" }] },
    { ...valid, offsets: [{ kind: "color", owner: "color" }, { kind: "color", owner: "color" }] }, { ...valid, extra: true }]) {
    assert.throws(() => resolveLegendLaneClearanceEntries(layout, changed));
  }
  let reads = 0;
  const invalid = { ...valid }; Object.defineProperty(invalid, "clearance", { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => resolveLegendLaneClearanceEntries(layout, invalid), /accessors/); assert.equal(reads, 0);
});

import { hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { resolveSceneNodeOccupiedBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { guideAnimationKey } from "../../../src/grammar/animation/guideState.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { normalizeLegendAxisLaneState, legendAxisReferenceKeys, resolveLegendAxisLaneEntries,
  resolveLegendAxisLaneGeometry, legendAxisLaneMatchesNode, prepareLegendAxisLaneInterpolation,
  sampleLegendAxisLaneInterpolation } from "../../../src/materialization/animation/legendAxisLaneState.js";
const transition = (from, to, options = {}) => planTransition({ from, to, options: { durationMs: 100, easing: "linear", ...options } });
const legends = frame => frame.decisions.flatMap((decision, index) => decision.role?.startsWith("guide-legend-") ? [{ decision, node: frame.scene.nodes[index] }] : []);
function offline(plan) {
  const restored = deserializeAnimation(serializeAnimation(plan)).plan;
  for (const time of [0, 25, 50, 75, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
}
test("public inferred lanes remeasure their current native Cartesian labels and titles", () => {
  for (const edge of ["left", "right", "top", "bottom"]) {
    const from = source(edge, 2), channel = ["top", "bottom"].includes(edge) ? "X" : "Y";
    const to = from.editCanvas({ width: 1500, height: 1300 })[`edit${channel}AxisLabels`]({ offset: 32 });
    const expected = from.editCanvas({ width: 1450, height: 1250 })[`edit${channel}AxisLabels`]({ offset: (from.guideConfigs.axis[channel.toLowerCase()].labels.offset + 32) / 2 });
    const plan = transition(from, to), current = sampleTransition(plan, 50), entries = legends(current);
    assert.ok(entries.length > 0 && entries.every(entry => entry.decision.kernel === "guide-geometry"), edge);
    const actualGeometry = entries.map(entry => ({ type: entry.node.type, properties: entry.node.properties }));
    const native = legends(sampleTransition(transition(expected, expected), 50)).map(entry => ({ type: entry.node.type, properties: entry.node.properties }));
    assert.deepEqual(actualGeometry, native, edge); offline(plan);
    const rebased = transition(current, to); assert.strictEqual(sampleTransition(rebased, 0), current); offline(rebased);
  }
});
test("lane clearance reads the axis owner clock and actual timeline stroke independently", () => {
  const from = source("right", 1).removeYAxis().createYAxis({ position: "right", ticksAndLabels: false, title: false });
  const to = from.editCanvas({ width: 1600 }), ordinary = transition(from, to), reference = sampleTransition(ordinary, 50);
  const axis = reference.decisions.find(item => item.role === "guide-line"), legend = legends(reference)[0].decision;
  const retime = (ownerKey, value) => ({ target: { ownerKey }, property: "geometry", kernel: "native-progress", keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value }, { timeMs: 100, value: 1 }] });
  const plan = transition(from, to, { tracks: [retime(axis.ownerKey, .75), retime(legend.ownerKey, .25),
    { target: { guideKey: axis.guideKey }, property: "strokeWidth", kernel: "number", keyframes: [{ timeMs: 0, value: 1 }, { timeMs: 50, value: 20 }, { timeMs: 100, value: 1 }] }] });
  const current = sampleTransition(plan, 50), actualAxis = current.scene.nodes[current.decisions.findIndex(item => item.guideKey === axis.guideKey)];
  assert.equal(actualAxis.properties.x1, 1200); assert.equal(actualAxis.properties.strokeWidth, 20);
  assert.ok(legends(current).every(item => item.decision.kernel === "guide-geometry"));
  const bounds = legends(current).map(item => resolveSceneNodeOccupiedBounds(item.node));
  assert.equal(Math.min(...bounds.map(bounds => bounds.left)), 1218);
  offline(plan); offline(transition(current, to));
});
test("nested inferred lane dependencies keep native scoped identity and offline complete proof", () => {
  const a = source("right", 1), panels = p => hconcat({ id: "pair", programs: [{ id: "fixed", program: a }, { id: "moving", program: p }] });
  const from = panels(a), to = panels(a.editCanvas({ width: 1600 })), plan = transition(from, to), current = sampleTransition(plan, 50);
  assert.ok(legends(current).every(item => item.decision.kernel === "guide-geometry"));
  assert.equal(new Set(legends(current).map(item => item.decision.guideKey)).size, legends(current).length);
  offline(plan); offline(transition(current, to));
  const original = exportTransitionPlan(plan), index = original.from.guides.findIndex(state => state?.kind === "legend-axis-lane");
  assert.ok(index >= 0); assert.equal(original.kernels.guide, "native-guide-values@13");
  for (const mutate of [state => state.axes.pop(), state => state.axes.push(state.axes[0]), state => state.axes[0] = "missing", state => state.offsets[0].owner = "missing"]) {
    const copy = structuredClone(original); mutate(copy.from.guides[index]); assert.throws(() => restoreTransitionPlan(copy));
  }
  const old = structuredClone(original); old.kernels.guide = "native-guide-values@10"; assert.throws(() => restoreTransitionPlan(old), /kernel/);
});


test("axis entry, exit, unsupported ink and manual style edits never become inferred endpoint pixels", () => {
  const from = source("right", 1), noAxis = from.removeYAxis();
  for (const [a, b] of [[from, noAxis], [noAxis, from]]) {
    const plan = transition(a, b), middle = sampleTransition(plan, 50);
    assert.ok(legends(middle).every(item => item.decision.kind === "crossfade"));
    offline(plan); offline(transition(middle, b));
  }
  const edited = from.editGraphics({ target: "yAxisTitle", property: "fontSize", value: 30 });
  const plan = transition(from, edited);
  assert.ok(legends(sampleTransition(plan, 50)).every(item => item.decision.kind === "crossfade")); offline(plan);
  const unsupported = from.editYAxisLabels({ maxWidth: 20 });
  assert.ok(legends(sampleTransition(transition(from, unsupported), 50)).every(item => item.decision.kind === "crossfade"));
  const otherEdge = from.createXAxis({ position: "bottom", title: false }).editXAxisLabels({ maxWidth: 20 });
  const separate = transition(otherEdge, otherEdge.editCanvas({ width: 1500 }));
  assert.ok(legends(sampleTransition(separate, 50)).every(item => item.decision.kernel === "guide-geometry")); offline(separate);
});
test("scene occupied bounds reuse actual stroke, offset, rectangular and path clips", () => {
  const node = { type: "rect", properties: { x: 10, y: 20, width: 30, height: 40, fill: "red", stroke: "black", strokeWidth: 4 },
    offset: [100, 200], clip: [0, 0, 1000, 1000], clips: [] };
  assert.deepEqual(resolveSceneNodeOccupiedBounds(node), { left: 108, right: 142, top: 218, bottom: 262 });
  assert.deepEqual(resolveSceneNodeOccupiedBounds({ ...node, clips: [[120, 230, 10, 15]] }), { left: 120, right: 130, top: 230, bottom: 245 });
  assert.equal(resolveSceneNodeOccupiedBounds({ ...node, clip: [0, 0, 50, 50] }), undefined);
  const path = { type: "path", commands: [{ op: "M", x: 120, y: 230 }, { op: "L", x: 130, y: 230 }, { op: "L", x: 130, y: 245 }, { op: "L", x: 120, y: 245 }, { op: "Z" }] };
  assert.deepEqual(resolveSceneNodeOccupiedBounds({ ...node, clips: [path] }), { left: 120, right: 130, top: 230, bottom: 245 });
  assert.deepEqual(node.offset, [100, 200]); assert.equal(node.clips.length, 0);
});

test("inferred lanes retain exact ink for fixed-offset and absent Cartesian titles", () => {
  for (const edge of ["left", "right", "top", "bottom"]) for (const title of [false, true]) {
    const channel = ["top", "bottom"].includes(edge) ? "X" : "Y";
    let from = source(edge, 1);
    from = title ? from[`edit${channel}AxisTitle`]({ offset: 70 }) : from[`edit${channel}Axis`]({ title: false });
    const offset = from.guideConfigs.axis[channel.toLowerCase()].labels.offset;
    let to = from.editCanvas({ width: 1500 })[`edit${channel}AxisLabels`]({ offset: offset + 20 });
    let expected = from.editCanvas({ width: 1450 })[`edit${channel}AxisLabels`]({ offset: offset + 10 });
    if (title) { to = to[`edit${channel}AxisTitle`]({ offset: 90 }); expected = expected[`edit${channel}AxisTitle`]({ offset: 80 }); }
    const plan = transition(from, to), current = sampleTransition(plan, 50);
    assert.ok(legends(current).every(entry => entry.decision.kernel === "guide-geometry"));
    assert.deepEqual(legends(current).map(entry => entry.node.properties), legends(sampleTransition(transition(expected, expected), 50)).map(entry => entry.node.properties));
    offline(plan); offline(transition(current, to));
  }
});

test("nested independently timed scopes use current offsets and clipped axis ink", () => {
  const local = source("right", 1).removeYAxis().createYAxis({ position: "right", ticksAndLabels: false, title: false });
  const panels = p => hconcat({ id: "pair", programs: [{ id: "leading", program: p }, { id: "dependent", program: p }] });
  const from = panels(local), to = panels(local.editCanvas({ width: 1600 }));
  const reference = sampleTransition(transition(from, to), 50);
  const index = reference.decisions.findIndex((item, i) => item.role === "guide-line" && reference.scene.nodes[i].offset[0] > 0);
  const axis = reference.decisions[index];
  const scoped = legends(reference).filter(item => item.node.offset[0] > 0), owner = scoped[0].decision.ownerKey;
  const retime = (ownerKey, value) => ({ target: { ownerKey }, property: "geometry", kernel: "native-progress", keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value }, { timeMs: 100, value: 1 }] });
  const plan = transition(from, to, { tracks: [retime(axis.ownerKey, .75), retime(owner, .25),
    { target: { guideKey: axis.guideKey }, property: "strokeWidth", kernel: "number", keyframes: [{ timeMs: 0, value: 1 }, { timeMs: 50, value: 20 }, { timeMs: 100, value: 1 }] }] });
  const current = sampleTransition(plan, 50), axisNode = current.scene.nodes[current.decisions.findIndex(item => item.guideKey === axis.guideKey)];
  const currentLegends = legends(current).filter(item => item.decision.ownerKey === owner);
  assert.notEqual(axisNode.offset[0], currentLegends[0].node.offset[0]);
  assert.equal(Math.min(...currentLegends.map(item => resolveSceneNodeOccupiedBounds(item.node).left)), resolveSceneNodeOccupiedBounds(axisNode).right + 8);
  assert.ok(currentLegends.every(item => item.decision.kernel === "guide-geometry"));
  offline(plan); offline(transition(current, to));
});

test("axis-dependent lane state rejects incomplete, foreign and edited native ink proofs", () => {
  const program = source("right", 1), plan = transition(program, program), payload = exportTransitionPlan(plan);
  const values = payload.from.guides, index = values.findIndex(state => state?.kind === "legend-axis-lane");
  const state = values[index], node = plan.from.scene.nodes[index];
  const dependencies = values.flatMap((axis, i) => axis && state.axes.includes(guideAnimationKey(axis.identity)) ? [{ state: axis, node: plan.from.scene.nodes[i] }] : []);
  const owned = cloneAndFreeze(dependencies);
  assert.strictEqual(resolveLegendAxisLaneEntries(state, owned, node), resolveLegendAxisLaneEntries(state, owned, node));
  assert.deepEqual(resolveLegendAxisLaneEntries(state, dependencies, node), resolveLegendAxisLaneEntries(state, owned, node));
  assert.ok(legendAxisLaneMatchesNode(state, node, dependencies));
  assert.equal(legendAxisLaneMatchesNode(state, { ...node, type: "circle" }, dependencies), false);
  assert.equal(legendAxisLaneMatchesNode(state, { ...node, properties: { ...node.properties, x: -1 } }, dependencies), false);
  for (const axes of [[], [""], [1], [...state.axes].reverse(), [...state.axes, state.axes[0]]]) {
    assert.throws(() => normalizeLegendAxisLaneState({ ...state, axes }));
  }
  assert.throws(() => normalizeLegendAxisLaneState({ ...state, kind: "foreign" }));
  const missing = { ...state }; delete missing.offsets; assert.throws(() => normalizeLegendAxisLaneState(missing));
  let reads = 0; const getter = { ...state };
  Object.defineProperty(getter, "axes", { enumerable: true, get() { reads++; return []; } });
  assert.throws(() => normalizeLegendAxisLaneState(getter), /accessors/); assert.equal(reads, 0);
  assert.throws(() => resolveLegendAxisLaneEntries(state, dependencies.slice(1), node), /complete/);
  assert.throws(() => resolveLegendAxisLaneEntries(state, [...dependencies, dependencies[0]], node), /unambiguous/);
  for (const change of [entry => ({ ...entry, state: { ...entry.state, reason: "guide-edited" } }),
    entry => ({ ...entry, node: { ...entry.node, type: "weighted-blend" } })]) {
    assert.throws(() => resolveLegendAxisLaneEntries(state, dependencies.map((entry, i) => i === 0 ? change(entry) : entry), node));
  }
  const textIndex = dependencies.findIndex(entry => entry.node.type === "text");
  const noMetrics = dependencies.map((entry, i) => i !== textIndex ? entry : { ...entry, state: { ...entry.state, layout: { ...entry.state.layout, metrics: undefined } } });
  assert.throws(() => resolveLegendAxisLaneEntries(state, noMetrics, node), /metrics/);
  assert.equal(legendAxisReferenceKeys(noMetrics.map(entry => entry.state), state.identity.namespaces, "right"), undefined);
  assert.equal(legendAxisReferenceKeys([...dependencies.map(entry => entry.state), dependencies[0].state], state.identity.namespaces, "right"), undefined);
  const pair = prepareLegendAxisLaneInterpolation(state, state);
  assert.deepEqual(prepareLegendAxisLaneInterpolation(state, { ...state, axes: [...state.axes, "zz"].sort() }), { kind: "crossfade", reason: "guide-layout" });
  assert.throws(() => sampleLegendAxisLaneInterpolation({ ...pair, version: "old" }, .5, dependencies, node));
  const clipped = dependencies.map(entry => ({ ...entry, node: { ...entry.node, clip: [0, 0, 1, 1] } }));
  assert.ok(resolveLegendAxisLaneEntries(state, clipped, node).length > 0);
  const resolved = resolveLegendAxisLaneGeometry(state, dependencies, node);
  assert.equal(resolved.type, node.type);
  for (const [key, value] of Object.entries(resolved.properties)) assert.deepEqual(value, node.properties[key]);
});

test("axis lanes preserve inherited size gaps and mixed explicit offsets", () => {
  for (const edge of ["right", "left", "top", "bottom"]) {
    let from = source(edge, 1).createLegend({ channels: ["size"], values: [1, 4], title: "Legend" });
    for (const explicit of [false, true]) {
      if (explicit) from = from.editLegend({ channel: "size", offset: 25 });
      const to = from.editCanvas({ width: 1500 });
      const native = from.editCanvas({ width: 1450 });
      const plan = transition(from, to), current = sampleTransition(plan, 50);
      assert.ok(legends(current).every(entry => entry.decision.kernel === "guide-geometry"));
      assert.deepEqual(legends(current).map(entry => entry.node.properties), legends(sampleTransition(transition(native, native), 50)).map(entry => entry.node.properties));
      offline(plan);
    }
  }
  const explicit = source("right", 1).editLegend({ channel: "color", offset: 120 })
    .createLegend({ channels: ["size"], values: [1, 4], title: "Legend" });
  const explicitPlan = transition(explicit, explicit.editCanvas({ width: 1500 }));
  assert.ok(legends(sampleTransition(explicitPlan, 50)).every(entry => entry.decision.kernel === "guide-geometry"));
  offline(explicitPlan);
});

test("independently timed axis ink that exceeds the current lane canvas fades atomically", () => {
  const from = chart().createCanvas({ width: 900, height: 700, margin: 200 })
    .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "B" }] })
    .createPointMark({ id: "m" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" })
    .createLegend({ channels: ["color"], title: "Native axis clearance" }).createYAxis({ position: "right", title: false, ticksAndLabels: false });
  const to = from.editCanvas({ width: 1100 }), reference = sampleTransition(transition(from, to), 50);
  const axis = reference.decisions.find(item => item.role === "guide-line"), owner = legends(reference)[0].decision.ownerKey;
  const retime = (ownerKey, value) => ({ target: { ownerKey }, property: "geometry", kernel: "native-progress", keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value }, { timeMs: 100, value: 1 }] });
  const plan = transition(from, to, { tracks: [retime(axis.ownerKey, .75), retime(owner, .25),
    { target: { guideKey: axis.guideKey }, property: "strokeWidth", kernel: "number", keyframes: [{ timeMs: 0, value: 1 }, { timeMs: 50, value: 20 }, { timeMs: 100, value: 1 }] }] });
  const current = sampleTransition(plan, 50);
  assert.ok(legends(current).every(entry => entry.decision.kind === "crossfade" && entry.decision.reason === "guide-layout"));
  offline(plan); offline(transition(current, to));
});
