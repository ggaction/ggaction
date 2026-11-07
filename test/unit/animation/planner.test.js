import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition } from "../../../src/animation/planner.js";
import { sampleTransition } from "../../../src/animation/sample.js";
import { canvasSceneProgram } from "../../../src/renderers/canvasScene.js";
import { prepareConcreteHitShape } from "../../../src/interaction/hitConcrete.js";
import { hitShape } from "../../../src/grammar/hitShapes.js";
import { createCanvas } from "@napi-rs/canvas";
import { renderTransitionScene } from "../../../src/scene.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { freezeOwned } from "../../../src/core/immutable.js";
import { prepareProgramHitFrame, rebindProgramHitFrame } from "../../../src/interaction/hitProgram.js";

const rows = [{ id: "a", x: 1, y: 20 }, { id: "b", x: 100, y: 80 }];
function points(values = rows, domain = [1, 1000]) {
  return chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values })
    .createPointMark({ id: "points", data: "rows" })
    .encodeX({ field: "x", fieldType: "quantitative", scale: { id: "x", type: "log", domain, nice: false } })
    .encodeY({ field: "y", fieldType: "quantitative", scale: { id: "y", domain: [0, 100], nice: false, zero: false } });
}
const revise = (program, values) => program.reviseData({ source: "rows", id: "revised", values });
const prepare = (from, to, options = {}) => planTransition({ from, to, options: { durationMs: 100, easing: "linear", ...options } });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);

test("native keyed point sampling interpolates meaning before logarithmic mapping", () => {
  const from = points(), to = revise(from, [{ id: "a", x: 100, y: 40 }, { id: "b", x: 1000, y: 60 }]);
  const original = JSON.stringify([from, to]), plan = prepare(from, to);
  assert.deepEqual(plan.tracks.map(t => t.kind), ["semantic-point", "semantic-point"]);
  const frame = sampleTransition(plan, 50), point = frame.scene.nodes[plan.tracks[0].targetIndex];
  close(point.properties.x, 20 + 260 * Math.log(50.5) / Math.log(1000));
  close(point.properties.y, 132);
  const start = plan.from.scene.nodes[plan.tracks[0].sourceIndex], end = plan.to.scene.nodes[plan.tracks[0].targetIndex];
  assert.notEqual(point.properties.x, (start.properties.x + end.properties.x) / 2);
  assert.equal(sampleTransition(plan, 0).scene, plan.from.scene);
  assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
  assert.equal(sampleTransition(plan, 100).scene, plan.to.scene);
  assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
  assert.equal(sampleTransition(plan, -10).scene, plan.from.scene);
  assert.equal(sampleTransition(plan, 200).scene, plan.to.scene);
  assert.deepEqual(sampleTransition(plan, 50), frame);
  assert.ok(Object.isFrozen(frame.scene.nodes[1].properties));
  assert.equal(JSON.stringify([from, to]), original);
  assert.ok(canvasSceneProgram(frame.scene).graphicSpec);
  const hit = prepareConcreteHitShape(point);
  assert.equal(hitShape(hit, { x: point.properties.x, y: point.properties.y }, { slop: 0 }).hit, true);
  assert.equal(hitShape(hit, { x: 1, y: 1 }, { slop: 0 }).hit, false);
});

test("equal endpoint pixels cannot erase different semantic values and domains", () => {
  const from = points([{ id: "a", x: 10, y: 50 }], [1, 100]);
  const to = revise(from, [{ id: "a", x: 1000, y: 50 }]).editScale({ id: "x", domain: [100, 10000] });
  const plan = prepare(from, to), track = plan.tracks[0];
  assert.equal(plan.from.scene.nodes[track.sourceIndex].properties.x, plan.to.scene.nodes[track.targetIndex].properties.x);
  assert.equal(track.kind, "semantic-point");
  const point = sampleTransition(plan, 50).scene.nodes[track.targetIndex];
  close(point.properties.x, 20 + 130 * (Math.log10(505) - 1));
  assert.notEqual(point.properties.x, 150);
});

test("reordering, enter and exit retain typed item correspondence rather than row indices", () => {
  const from = points([{ id: 1, x: 1, y: 10 }, { id: "1", x: 10, y: 20 }, { id: "gone", x: 100, y: 30 }]);
  const to = revise(from, [{ id: "1", x: 100, y: 40 }, { id: 1, x: 10, y: 30 }, { id: "new", x: 1000, y: 50 }]);
  const plan = prepare(from, to);
  assert.deepEqual(plan.tracks.map(t => [t.sourceIndex, t.targetIndex]), [[2, 1], [1, 2]]);
  const frame = sampleTransition(plan, 25), circles = frame.scene.nodes.filter(n => n.type === "circle");
  assert.equal(circles.length, 4);
  assert.equal(circles[2].properties.opacity, .25);
  assert.equal(circles[3].properties.opacity, .75);
  assert.equal(new Set(frame.scene.nodes.map(n => n.key)).size, frame.scene.nodes.length);
  assert.notEqual(plan.tracks[0].key, plan.tracks[1].key);
});

test("nested namespace scopes supply their own semantic values and resolved scales", () => {
  const a = points(), b = revise(a, [{ id: "a", x: 10, y: 30 }, { id: "b", x: 1000, y: 60 }]);
  const compose = program => hconcat({ id: "outer", programs: [
    { id: "left", program: hconcat({ id: "inner", programs: [{ id: "one", program }, { id: "two", program: a }] }) },
    { id: "right", program: a }
  ] });
  const plan = prepare(compose(a), compose(b));
  assert.equal(plan.tracks.length, 6);
  assert.equal(plan.tracks.filter(t => t.kind === "semantic-point").length, 2);
  assert.equal(plan.tracks.filter(t => t.kind === "exact").length, 4);
  assert.equal(new Set(plan.tracks.map(t => t.key)).size, 6);
  const frame = sampleTransition(plan, 50);
  for (const track of plan.tracks) {
    const node = frame.scene.nodes[track.targetIndex];
    assert.equal(node.key, plan.to.scene.nodes[track.targetIndex].key);
    assert.deepEqual(node.offset, plan.to.scene.nodes[track.targetIndex].offset);
  }
});

test("unsupported geometry and appearance retain explicit per-item crossfade reasons", () => {
  const from = points();
  for (const [to, reason] of [[from.editPointMark({ shape: "diamond" }), "primitive-kind"],
    [from.editPointMark({ fill: {type:"pattern",style:"dots",pitch:8} }), "appearance"],
    [from.editScale({ id: "x", clamp: true }), "scale-clamp"]]) {
    const plan = prepare(from, to);
    assert.ok(plan.tracks.every(t => t.kind === "crossfade" && t.reason === reason));
    const frame = sampleTransition(plan, 50);
    for (const track of plan.tracks) {
      const node = frame.scene.nodes[track.targetIndex];
      assert.equal(node.type, "weighted-blend");
      assert.deepEqual(node.properties.sources.map(s => s.weight), [.5, .5]);
    }
    assert.ok(canvasSceneProgram(frame.scene).graphicSpec);
  }
});

test("closed requests and authentic frozen plans reject malformed input without invoking getters", () => {
  const p = points(), old = JSON.stringify(p), plan = prepare(p, p);
  let reads = 0;
  const accessor = { get from() { reads++; return p; }, to: p, options: { durationMs: 1 } };
  assert.throws(() => planTransition(accessor), /accessors/);
  assert.equal(reads, 0);
  for (const options of [{ durationMs: -1 }, { durationMs: NaN }, { durationMs: Infinity }, { durationMs: 1, easing: undefined },
    { durationMs: 1, easing: "unknown" }, { durationMs: 1, extra: true }])
    assert.throws(() => planTransition({ from: p, to: p, options }));
  for (const from of [null, {}, structuredClone(p)]) assert.throws(() => prepare(from, p));
  for (const value of [null, {}, structuredClone(plan), { ...plan, version: 2 }]) assert.throws(() => sampleTransition(value, 50), /authentic/);
  for (const time of [NaN, Infinity, "50"]) assert.throws(() => sampleTransition(plan, time));
  const instant = prepare(p, p, { durationMs: 0 });
  assert.equal(sampleTransition(instant, 0).scene, instant.to.scene);
  assert.equal(sampleTransition(instant, -1).scene, instant.from.scene);
  assert.throws(() => prepare(p._clone({ actionStack: [{ op: "open" }] }), p), /closed/);
  const forged = Object.create(ChartProgram.prototype);
  Object.defineProperty(forged, "graphicSpec", { get() { reads++; return p.graphicSpec; } });
  Object.freeze(forged);
  assert.throws(() => prepare(forged, p), /own program state/);
  const forgedTree = Object.create(ChartProgram.prototype, { ...Object.getOwnPropertyDescriptors(p), children: { value: freezeOwned({ forged }), enumerable: true } });
  Object.freeze(forgedTree);
  assert.throws(() => prepare(forgedTree, p), /own program state/);
  assert.throws(() => prepare(Object.create(ChartProgram.prototype), p), /immutable/);
  assert.equal(reads, 0);
  assert.equal(JSON.stringify(p), old);
});

test("conditional positions and missing rows share the existing final item grain", () => {
  const from = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 2, y: 20 }, { id: "skip", x: null, y: 30 }, { id: "b", x: 8, y: 60 }] })
    .createParameter({ id: "enabled", value: true })
    .createPointMark({ id: "points", missing: "skip" })
    .encodeY({ field: "y", scale: { id: "y", domain: [0, 100] } })
    .encodeX({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "enabled" } },
      value: { field: "x", scale: { id: "x", domain: [0, 10] } } }], otherwise: { datum: 0, scale: { id: "x", domain: [0, 10] } } });
  const to = from.editParameter({ target: "enabled", value: false }), plan = prepare(from, to);
  assert.equal(plan.tracks.length, 2);
  assert.ok(plan.tracks.every(t => t.kind === "semantic-point"));
  assert.deepEqual(plan.tracks.map(t => sampleTransition(plan, 50).scene.nodes[t.targetIndex].properties.x), [46, 124]);
  const filtered = from.filterMarks({ target: "points", field: "x", op: "gte", value: 8 });
  assert.equal(prepare(from, filtered).tracks.length, 1);
});

test("named Canvas backgrounds retain one paint while the native point frame remains hit-testable", () => {
  const from = points(), to = revise(from, [{ id: "a", x: 100, y: 40 }, { id: "b", x: 1000, y: 60 }]);
  const plan = prepare(from, to), sample = sampleTransition(plan, 50);
  assert.equal(plan.frameTracks.length, 1);
  assert.deepEqual(plan.enters, []); assert.deepEqual(plan.exits, []);
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
  renderTransitionScene(sample.scene, context);
  const point = sample.scene.nodes[plan.tracks[0].targetIndex];
  const pixel = [...context.getImageData(Math.round(point.properties.x), Math.round(point.properties.y), 1, 1).data];
  assert.notDeepEqual(pixel.slice(0, 3), [255, 255, 255]); assert.equal(pixel[3], 255);
  const hit = rebindProgramHitFrame(prepareProgramHitFrame(to), sample.scene, 1);
  const entry = hit.entries.find(e => e.nodeKey === point.key);
  assert.ok(entry);
  const recolored = from.editCanvas({ background: "black" }), background = sampleTransition(prepare(from, recolored), 50).scene.nodes[0];
  assert.equal(background.type, "weighted-blend");
  assert.equal(background.properties.sources.length, 2);
  const empty = chart().createCanvas({ width: 100, height: 80, margin: 0, background: "none" });
  const emptyFrame = sampleTransition(prepare(empty, empty), 50);
  assert.ok(emptyFrame.scene.nodes.every(node => node.properties.fill === "none"));
});

test("categorical, computed and primitive-edited points are not mislabeled semantic tracks", () => {
  const categorical = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: "A", y: 20 }, { id: "b", x: "B", y: 80 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x", fieldType: "nominal" }).encodeY({ field: "y" });
  const reordered = revise(categorical, [{ id: "a", x: "B", y: 40 }, { id: "b", x: "A", y: 60 }]);
  assert.ok(prepare(categorical, reordered).tracks.every(t => t.reason === "scale-type"));
  const jittered = categorical.jitterPoints({ target: "points", channel: "x", maxOffset: { pixels: 4 }, seed: "stable" });
  assert.ok(prepare(jittered, categorical).tracks.every(t => t.reason === "computed-point-position"));
  const from = points(), changed = from.editGraphics({ target: "points", property: "x", value: 50 });
  assert.ok(prepare(from, changed).tracks.every(t => t.reason === "edited-position"));
  assert.throws(() => prepare(from, from.editPointMark({ blend: "multiply" })), /backdrop blend/);
});

test("bounded work and unknown topology reject or classify before mutating endpoints", () => {
  const base = points(), graphicSpec = structuredClone(base.graphicSpec);
  graphicSpec.objects.points.items[0].identity.topology = "different";
  const changed = base._clone({ graphicSpec }), plan = prepare(base, changed);
  assert.equal(plan.tracks[0].reason, "topology");
  assert.equal(plan.tracks[1].kind, "exact");
  const huge = chart().createCanvas({ width: 30, height: 30, margin: 0 })
    .createGraphics({ id: "anonymous", type: "circle", length: 5001 })
    .editGraphics({ target: "anonymous", property: "items", value: Array.from({ length: 5001 }, () => ({ type: "circle", properties: { x: 10, y: 10, radius: 2, fill: "red" } })) });
  assert.throws(() => prepare(huge, huge), /Animation endpoint nodes/);
  const original = JSON.stringify(base);
  const accessorOptions = { get durationMs() { throw new Error("must not execute"); } };
  assert.throws(() => planTransition({ from: base, to: base, options: accessorOptions }), /accessors/);
  assert.equal(JSON.stringify(base), original);
  const long = "x".repeat(10_000_001), objects = { ...base.graphicSpec.objects, [long]: { type: "collection", items: [] } };
  assert.throws(() => prepare(base._clone({ graphicSpec: { ...base.graphicSpec, objects } }), base), /Animation preparation work/);
});

test("a finite pair whose intermediate scale collapses uses the typed fallback", () => {
  const from = points([{ id: "a", x: 1, y: 50 }]).editScale({ id: "x", type: "linear", domain: [1, 1 + Number.EPSILON], zero: false });
  const to = from.editScale({ id: "x", domain: [1 - Number.EPSILON / 2, 1] });
  const plan = prepare(from, to);
  assert.equal(plan.tracks[0].kind, "semantic-point");
  const frame = sampleTransition(plan, 50);
  assert.equal(frame.decisions.find(d => d.itemKey).reason, "collapsed-domain");
  assert.equal(frame.scene.nodes[plan.tracks[0].targetIndex].type, "weighted-blend");
});
