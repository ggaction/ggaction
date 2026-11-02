import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { createInteractionSession } from "../../src/interaction.js";
import { planTransition, sampleTransition } from "../../src/animation.js";
import { cloneAndFreeze } from "../../src/core/immutable.js";
import { prepareHitIndex } from "../../src/grammar/hitIndex.js";
import { prepareProgramHitFrame, prepareAnimationHitFrame, rebindProgramHitFrame } from "../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../src/interaction/hitFrame.js";
import { hitFrameSource } from "../../src/interaction/hitFrameSource.js";
import { ownHitScene } from "../../src/interaction/sceneFrame.js";

const large = { maxSceneNodes: 200000, maxWork: 128000000 };
const pointProgram = (count = 2) => chart().createCanvas({ width: 300, height: 200, margin: 20, plotBorder: false })
  .createData({ id: "rows", keyField: "id", values: Array.from({ length: count }, (_, id) => ({ id, x: id + 1, y: id + 1 })) })
  .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } });
const host = () => ({ addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 }) });

test("session preparation defaults are own optional data and never enter program or state", () => {
  const program = pointProgram(), before = JSON.stringify(program);
  let reads = 0;
  Object.defineProperty(Object.prototype, "hitPreparation", { configurable: true, get() { reads++; throw new Error("Inherited access"); } });
  try {
    for (const input of [{}, { hitPreparation: undefined }, { hitPreparation: {} }]) {
      const session = createInteractionSession({ program, bindings: [], ...input });
      assert.equal(session.getState().program, program); assert.ok(!Object.hasOwn(session.getState(), "hitPreparation")); session.destroy();
    }
  } finally { delete Object.prototype.hitPreparation; }
  assert.equal(reads, 0); assert.equal(JSON.stringify(program), before);
  for (const value of [null, false, { maxWork: 0 }, { maxSceneNodes: 200001 }, { maxItems: 200000 }]) {
    assert.throws(() => createInteractionSession({ program, hitPreparation: value }));
  }
  const unsafe = Object.defineProperty({}, "maxWork", { enumerable: true, get() { reads++; return 128000000; } });
  assert.throws(() => createInteractionSession({ program, hitPreparation: unsafe }), /accessors/); assert.equal(reads, 0);
});

test("binding and index preparation retain separate exact work limits", () => {
  const program = pointProgram(), frame = prepareProgramHitFrame(program), work = hitFrameSource(frame).work;
  assert.ok(work > 1);
  assert.deepEqual(prepareProgramHitFrame(program, 0, undefined, { maxWork: work }), frame);
  assert.throws(() => prepareProgramHitFrame(program, 0, undefined, { maxWork: work - 1 }), /preparation work budget/);
  assert.throws(() => prepareHitIndex(frame.scene, frame.entries, { maxWork: 1 }), /work budget/);
  const bridge = createHitFrameBridge(frame, large), before = bridge.getState();
  assert.throws(() => bridge.updateFrame({ ...frame, entries: new Array(100001), version: 1 }), /item budget/);
  assert.equal(bridge.getState(), before); bridge.dispose();
});

test("explicit scene allowance preserves the entry bound and checks every scene on every policy", () => {
  const scene = cloneAndFreeze({ version: 2, nodes: Array.from({ length: 100001 }, (_, i) => ({ key: `n${i}` })) });
  assert.throws(() => prepareHitIndex(scene, []), /item budget/);
  assert.equal(prepareHitIndex(scene, [], { maxSceneNodes: 100001 }).itemCount, 0);
  assert.throws(() => prepareHitIndex(scene, [], { maxSceneNodes: 100000, maxWork: 128000000 }), /item budget/);
  assert.throws(() => prepareHitIndex(scene, new Array(100001), large), /item budget/);
  assert.throws(() => prepareHitIndex(Object.freeze(structuredClone(scene)), [], large), /immutable owned/);
});

test("native child aggregate and raw frame validation use the same session policy", () => {
  const child = pointProgram(), native = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const frame = prepareProgramHitFrame(native, 0, undefined, large);
  assert.ok(frame.scene.nodes.length > prepareProgramHitFrame(child).scene.nodes.length);
  assert.throws(() => prepareProgramHitFrame(native, 0, undefined, { maxSceneNodes: 3 }), /item budget/);
  assert.throws(() => rebindProgramHitFrame(frame, frame.scene, 1, undefined, { maxSceneNodes: 3 }), /node budget/);
  const forged = structuredClone(frame.scene); forged.nodes[0].properties.unrecognized = true;
  assert.throws(() => ownHitScene(Object.freeze(forged), large));
  assert.throws(() => rebindProgramHitFrame({}, frame.scene, 1, undefined, large), /authentic/);
  const bad = structuredClone(frame.scene); bad.nodes[1].key = "unowned";
  assert.throws(() => rebindProgramHitFrame(frame, bad, 1, undefined, large), /identity or topology/);
});

test("failed replacement and command overrides preserve the exact current program and frame", () => {
  const program = pointProgram(1), options = { maxSceneNodes: 3, maxWork: 128000000 };
  const session = createInteractionSession({ program, bindings: [], hitPreparation: options }); options.maxSceneNodes = 200000;
  session.mount(host(), { rootTransform: [2, 0, 0, 2, 7, 11] });
  const before = session.getState();
  assert.throws(() => session.updateProgram(pointProgram(8)), /item budget/);
  assert.equal(session.getState().program, before.program); assert.equal(session.getState().scene, before.scene);
  assert.equal(session.getState().revision, before.revision); assert.deepEqual(session.getState().history, before.history);
  assert.throws(() => session.dispatch({ type: "leave", hitPreparation: large }), /unsupported/);
  assert.throws(() => session.mount(host(), { hitPreparation: large }), /unsupported/);
  session.updateProgram(program.editPointMark({ target: "points", fill: "red" }), { history: "record" });
  session.dispatch({ type: "undo" }); assert.equal(session.getState().program, program);
  session.dispatch({ type: "redo" }); assert.equal(session.getState().history.undoCount, 1);
  session.destroy();
});

test("authentic sampled frames recheck cached native counts and costs without admitting clones", () => {
  const from = pointProgram(), to = from.editCanvas({ width: 400 });
  const sample = sampleTransition(planTransition({ from, to, options: { durationMs: 100 } }), 50);
  const first = prepareAnimationHitFrame(sample, 0, undefined, large);
  assert.throws(() => prepareAnimationHitFrame(sample, 0, undefined, { maxSceneNodes: 1, maxWork: 128000000 }), /item budget/);
  assert.throws(() => prepareAnimationHitFrame(sample, 0, undefined, { maxWork: 2 }), /preparation work budget/);
  assert.throws(() => prepareAnimationHitFrame(Object.freeze(structuredClone(sample)), 0, undefined, large), /authentic/);
  assert.deepEqual(prepareAnimationHitFrame(sample, 0, undefined, large), first);
  const session = createInteractionSession({ program: from, bindings: [], hitPreparation: large });
  session.dispatch({ type: "frame", frame: sample, version: 1, generation: 0 });
  assert.equal(session.getState().animationFrame, sample);
  const state = session.getState(), raw = structuredClone(state.scene); raw.nodes[1].key = "not-a-native-key";
  assert.throws(() => session.dispatch({ type: "frame", scene: raw, version: 2, generation: state.generation }), /identity or topology/);
  assert.equal(session.getState().scene, state.scene); session.destroy();
});
