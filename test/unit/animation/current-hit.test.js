import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { getMarkItems } from "../../../src/inspection.js";
import { planTransition, exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { sampleTransition } from "../../../src/animation/sample.js";
import { registerAnimationPlan, registerAnimationFrame } from "../../../src/animation/frameProvenance.js";
import { captureFrameMeaning } from "../../../src/animation/frameEndpoint.js";
import { prepareAnimationHitFrame, requireAnimationFrameProgram } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { prepareConcreteHitShape } from "../../../src/interaction/hitConcrete.js";
import { hitShape } from "../../../src/grammar/hitShapes.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";

const point = node => ({ x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] });
const program = values => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "rows", keyField: "id", values }).createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } });
function sample(from, to, time) {
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  return sampleTransition(plan, time);
}
function hit(frame, at) {
  const bridge = createHitFrameBridge(prepareAnimationHitFrame(frame));
  try { return bridge.hit(at, { slop: 0 }); } finally { bridge.dispose(); }
}

test("current semantic point geometry retains reordered native identities and exact entering/exiting rows", () => {
  const from = program([{ id: "a", x: 2, y: 5 }, { id: "removed", x: 8, y: 8 }]);
  const to = from.reviseData({ source: "rows", id: "next", values: [{ id: "new", x: 8, y: 2 }, { id: "a", x: 6, y: 5 }] });
  const frame = sample(from, to, 50), circles = frame.scene.nodes.filter(node => node.type === "circle");
  assert.equal(circles.length, 3);
  for (const node of circles) {
    const result = hit(frame, point(node));
    assert.ok(result.target);
    assert.equal(result.candidates.length, 1);
    const expected = node.properties.x < 150 ? getMarkItems(to)[1]
      : node.properties.y > 100 ? getMarkItems(to)[0] : getMarkItems(from)[1];
    assert.equal(result.target.itemKey, expected.key);
    const source = result.target.resourceRefs[0].id === "next" ? to : from;
    const dataset = source.semanticSpec.datasets.find(data => data.id === result.target.resourceRefs[0].id);
    assert.equal(result.target.rowKeys.length, 1);
    assert.ok(dataset.rowKeys.includes(result.target.rowKeys[0]));
  }
  assert.equal(hit(frame, point(sample(from, to, 0).scene.nodes.find(node => node.type === "circle"))).target, null);
  assert.throws(() => prepareAnimationHitFrame(structuredClone(frame)), /authentic/);
});

test("a weighted representation has one semantic hit across its two painted endpoint geometries", () => {
  const from = program([{ id: "a", x: 2, y: 5 }]), to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 8, y: 5 }] }).encodeColor({ value: "red" }).editPointMark({shape:"square"});
  const frame = sample(from, to, 50), weighted = frame.scene.nodes.find(node => node.type === "weighted-blend" && node.properties.sources[0].type === "circle");
  assert.ok(weighted);
  for (const source of weighted.properties.sources) {
    const result = hit(frame, { x: source.properties.x + source.offset[0], y: source.properties.y + source.offset[1] });
    assert.equal(result.candidates.length, 1);
    assert.equal(result.target.itemKey, getMarkItems(to)[0].key);
    assert.equal(result.target.resourceRefs[0].id, "next");
  }
  assert.equal(hit(sample(from, to, 100), point(sample(from, to, 0).scene.nodes.find(node => node.type === "circle"))).target, null);
});

test("nested current-frame hits retain the exact child path and scoped item key", () => {
  const a = program([{ id: "a", x: 2, y: 5 }]), b = a.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 6, y: 5 }] });
  const concat = p => hconcat({ id: "comparison", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const from = concat(a), to = concat(b), frame = sample(from, to, 50);
  const circles = frame.scene.nodes.filter(node => node.type === "circle");
  assert.deepEqual(circles.map(node => hit(frame, point(node)).target.childPath), [["left"], ["right"]]);
});

test("interrupted weighted geometry retains one hit and the current endpoint's native lineage", () => {
  const from = program([{ id: "a", x: 2, y: 5 }]);
  const to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 8, y: 5 }] }).encodeColor({ value: "red" }).editPointMark({shape:"square"});
  const middle = sample(from, to, 50);
  const goal = from.reviseData({ source: "rows", id: "goal", values: [{ id: "a", x: 5, y: 5 }] }).encodeColor({ value: "blue" });
  const frame = sample(middle, goal, 50);
  const weighted = frame.scene.nodes.find(node => node.type === "weighted-blend" && node.properties.sources[0].type === "circle");
  assert.equal(weighted.properties.sources.length, 3);
  for (const source of weighted.properties.sources) {
    const result = hit(frame, { x: source.properties.x + source.offset[0], y: source.properties.y + source.offset[1] });
    assert.equal(result.candidates.length, 1); assert.equal(result.target.resourceRefs[0].id, "goal");
    assert.equal(result.target.itemKey, getMarkItems(goal)[0].key);
  }
});

test("weighted text hit uses each concrete source's own prepared measurement", () => {
  const properties = { x: 10, y: 10, text: "WW", fontSize: 10, fontFamily: "sans-serif", textAlign: "left", textBaseline: "top", fill: "black" };
  const source = x => ({ type: "text", properties: { ...properties, x }, weight: .5, offset: [0, 0], clip: { x: 0, y: 0, width: 300, height: 200 }, clips: [] });
  const node = { type: "weighted-blend", properties: { sources: [source(10), source(100)] }, offset: [0, 0], clip: [0, 0, 300, 200], clips: [] };
  const profile = width => ({ schemaVersion: 1, measurements: [{ text: "WW", fontFamily: "sans-serif", fontSize: 10, fontWeight: 400, fontStyle: "normal", width }] });
  const shape = prepareConcreteHitShape(node, [profile(40), profile(5)]);
  assert.equal(hitShape(shape, { x: 45, y: 15 }, { slop: 0 }).hit, true);
  assert.equal(hitShape(shape, { x: 110, y: 15 }, { slop: 0 }).hit, false);
});

test("native frame admission rejects invalid counters, missing endpoint metadata and corrupt decisions atomically", () => {
  const from = program([{ id: "a", x: 2, y: 5 }]), to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 8, y: 5 }] });
  const frame = sample(from, to, 50);
  assert.throws(() => prepareAnimationHitFrame(frame, -1), /version/);
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  const unbound = sampleTransition(restoreTransitionPlan(exportTransitionPlan(plan)), 50);
  assert.throws(() => prepareAnimationHitFrame(unbound), /native endpoint metadata/);
  const missing = cloneAndFreeze({ ...frame, decisions: [] }); assert.throws(() => captureFrameMeaning(missing, plan, 50), /exact sampled nodes/);
  const altered = structuredClone(frame); altered.decisions[1].targetIndex = 999;
  const invalid = cloneAndFreeze(altered); assert.throws(() => captureFrameMeaning(invalid, plan, 50), /exact endpoint node/);
  const before = JSON.stringify(frame); assert.ok(hit(frame, point(frame.scene.nodes[1])).target); assert.equal(JSON.stringify(frame), before);
});

test("sampled endpoint metadata cannot recurse through a cyclic private association", () => {
  const from = program([{ id: "a", x: 2, y: 5 }]), frame = sample(from, from, 50);
  const plan = cloneAndFreeze({ durationMs: 100 }), cyclic = cloneAndFreeze({ ...frame, progress: .25 });
  assert.throws(() => registerAnimationPlan(plan, { from: cyclic, to: from }), /exact projected endpoint/);
  assert.throws(() => prepareAnimationHitFrame(cyclic), /authentic/);
});
