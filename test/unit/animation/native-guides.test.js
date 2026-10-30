import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { ChartProgram } from "../../../src/ChartProgram.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGuideAnimationState } from "../../../src/materialization/animation/guides.js";
import { guideAnimationKey, guideAnimationMatchesNode, prepareGuideInterpolation, sampleGuideInterpolation } from "../../../src/grammar/animation/guideState.js";
const base = () => chart().createCanvas({ width: 500, height: 400, margin: 80 })
  .createData({ id: "data", values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
  .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const project = program => {
  const endpoint = projectAnimationEndpoint(program);
  return { endpoint, states: projectGuideAnimationState(program, endpoint) };
};

test("native Cartesian guides retain exact typed value correspondence and geometry without trace writes", () => {
  const p = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createYAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false }).createGrid({ horizontal: true, vertical: true });
  const before = serializeProgram(p), { endpoint, states } = project(p);
  const supported = states.filter(Boolean);
  assert.equal(supported.length, 20);
  assert.equal(supported.filter(state => state.kind === "grid").length, 6);
  assert.ok(supported.every(state => state.reason === undefined));
  states.forEach((state, index) => { if (state) assert.ok(guideAnimationMatchesNode(state, endpoint.scene.nodes[index])); });
  assert.equal(new Set(supported.map(state => guideAnimationKey(state.identity))).size, 20);
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(project(deserializeProgram(before)).states, states);
});

test("raw guide values match across tick insertions and label spelling does not alter identity", () => {
  const p = base().createXAxis({ ticksAndLabels: { values: [0, 10] }, title: false });
  const next = p.editXAxis({ ticksAndLabels: { values: [0, 5, 10], labels: { labelMap: [{ value: 10, label: "Maximum" }] } } });
  const a = project(p).states.filter(Boolean), b = project(next).states.filter(Boolean);
  const old = new Set(a.map(state => guideAnimationKey(state.identity)));
  assert.equal(b.filter(state => old.has(guideAnimationKey(state.identity))).length, a.length);
  assert.deepEqual(b.filter(state => !old.has(guideAnimationKey(state.identity))).map(state => state.identity.value), [5, 5]);
});

test("wrapped Cartesian guide labels preserve line roles and suppressed labels stay absent", () => {
  const p = chart().createCanvas({ width: 520, height: 420, margin: { top: 40, right: 40, bottom: 170, left: 60 } })
    .createData({ values: [{ c: "Alpha category label", v: 1 }, { c: "Beta category label", v: 2 }] }).createPointMark()
    .encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "v" })
    .createXAxis({ ticksAndLabels: { labels: { maxWidth: 60, wrap: "word", lineHeight: 14 } }, title: false });
  const states = project(p).states.filter(Boolean), labels = states.filter(state => state.kind === "labels");
  assert.equal(labels.length, 6);
  assert.ok(labels.every(state => state.reason === undefined && state.policy.lineCount === 3));
  assert.equal(new Set(labels.map(state => guideAnimationKey(state.identity))).size, 6);
  const hidden = p.editXAxisLabels({ labelMap: [{ value: "Beta category label", label: "" }] });
  assert.equal(project(hidden).states.filter(state => state?.kind === "labels").length, 3);
});

test("polar axis and grid projection reuse native circles, radius-zero omission and explicit angle", () => {
  const p = chart().createCanvas({ width: 500, height: 500, margin: 100 })
    .createData({ values: [{ a: 0, r: 0 }, { a: 10, r: 10 }] }).createPointMark()
    .encodeTheta({ field: "a" }).encodeR({ field: "r" })
    .createThetaAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createRadialAxis({ angle: 90, ticksAndLabels: { values: [0, 5, 10] }, title: false })
    .createGrid({ theta: { values: [0, 5, 10] }, radial: { values: [0, 5, 10] } });
  const { endpoint, states } = project(p), active = states.filter(Boolean);
  assert.equal(active.length, 19);
  assert.ok(active.every(state => state.reason === undefined));
  assert.deepEqual(active.filter(state => state.kind === "grid" && state.channel === "radius").map(state => state.identity.value), [5, 10]);
  states.forEach((state, index) => { if (state) assert.ok(guideAnimationMatchesNode(state, endpoint.scene.nodes[index])); });
  const resized = p.editCanvas({ width: 600, height: 600 });
  const b = new Map(project(resized).states.filter(Boolean).map(state => [guideAnimationKey(state.identity), state]));
  for (const a of active) assert.equal(sampleGuideInterpolation(prepareGuideInterpolation(a, b.get(guideAnimationKey(a.identity))), .5).kind, "guide");
});

test("nested composition keeps same guide values distinct in exact child namespaces", () => {
  const unit = base().createXAxis({ ticksAndLabels: { values: [0, 10] }, title: false });
  const inner = hconcat({ id: "inside", programs: [{ id: "one", program: unit }, { id: "two", program: unit }] });
  const p = hconcat({ id: "outer", programs: [{ id: "nested", program: inner }, { id: "last", program: unit }] });
  const states = project(p).states.filter(Boolean);
  assert.equal(states.length, 15);
  assert.equal(new Set(states.map(state => guideAnimationKey(state.identity))).size, 15);
  assert.deepEqual(new Set(states.map(state => JSON.stringify(state.identity.namespaces))), new Set(['["outer-nested","inside-one"]','["outer-nested","inside-two"]','["outer-last"]']));
});

test("edited guide geometry and unsupported text layout remain explicit fallbacks", () => {
  const p = base().createXAxis({ ticksAndLabels: { values: [0, 5, 10] }, title: false });
  const edited = p.editGraphics({ target: "xAxisTicks", property: "y1", value: 123 });
  assert.equal(project(edited).states.filter(state => state?.reason === "guide-edited").length, 3);
  const flush = p.editXAxisLabels({ flush: true });
  assert.equal(project(flush).states.filter(state => state?.reason === "guide-layout").length, 3);
  const objects = structuredClone(p.graphicSpec.objects); objects.xAxisLabels.items.pop();
  assert.throws(() => project(new ChartProgram({ ...p, graphicSpec: { ...p.graphicSpec, objects } })), /stale semantic/);
});
