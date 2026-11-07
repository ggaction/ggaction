import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { cloneAndFreeze, isOwned } from "../../../src/core/immutable.js";

const points = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 2, y: 3 }, { id: "gone", x: 8, y: 7 }] })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { id: "x", domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 10], nice: false } });
const options = explicit => ({ durationMs: 100, easing: "linear", ...(explicit ? { maxEndpointNodes: 40, maxOutputNodes: 20 } : {}) });
const positions = frame => animationFrameProvenance(frame).positions;
function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test("sampled point meaning stays immutable through ordered enters, exits and exact nested children", () => {
  for (const explicit of [false, true]) {
    const original = points(), changed = original.reviseData({ source: "rows", id: "next", values: [
      { id: "new", x: 7, y: 4 }, { id: "a", x: 6, y: 5 }
    ] });
    const compose = program => hconcat({ id: "pair", programs: [{ id: "moving", program }, { id: "exact", program: original }] });
    const from = compose(original), to = compose(changed), snapshot = JSON.stringify([from, to]);
    const plan = planTransition({ from, to, options: options(explicit) });
    for (const time of [25, 50, 75]) {
      const frame = sampleTransition(plan, time), state = positions(frame);
      assert.equal(state.length, frame.scene.nodes.length);
      assert.ok(isOwned(state));
      assertDeepFrozen(state);
      const moving = plan.tracks.find(track => track.kind === "semantic-point");
      const row = state[moving.targetIndex];
      assert.equal(row.x.value, 2 + 4 * time / 100);
      assert.equal(row.y.value, 3 + 2 * time / 100);
      assert.ok(isOwned(row.x.scale));
      assert.throws(() => { row.x.value = 99; }, TypeError);
      assert.throws(() => { row.x.scale.domain[0] = 99; }, TypeError);
      assert.throws(() => { state.push(null); }, TypeError);
      assert.ok(frame.decisions.some(decision => decision.kind === "enter"));
      assert.ok(frame.decisions.some(decision => decision.kind === "exit"));
      assert.ok(frame.decisions.some(decision => decision.kind === "exact"));
      assert.ok(state.some(value => value === null));
      assert.deepEqual(sampleTransition(plan, time), frame);
    }
    assert.equal(JSON.stringify([from, to]), snapshot);
  }
});

test("local frame meaning preserves offline rebase and batch values without granting clone authority", () => {
  for (const explicit of [false, true]) {
    const from = points(), to = from.editScale({ id: "x", domain: [0, 20], nice: false });
    const plan = planTransition({ from, to, options: options(explicit) }), frame = sampleTransition(plan, 37);
    for (const fake of [structuredClone(frame), Object.freeze({ ...frame }), cloneAndFreeze(structuredClone(frame))]) {
      assert.equal(animationFrameProvenance(fake), undefined);
      assert.throws(() => planTransition({ from: fake, to, options: options(explicit) }));
    }
    const input = { x: { value: 1, scale: { domain: [0, 10] } } }, frozen = Object.freeze({ ...input });
    const copied = cloneAndFreeze(frozen);
    input.x.value = 2;
    assert.equal(copied.x.value, 1);
    assert.equal(isOwned(input.x), false);
    const rebased = planTransition({ from: frame, to, options: options(explicit) });
    const text = serializeAnimation(rebased), restored = deserializeAnimation(text).plan;
    assert.equal(serializeAnimation(restored), text);
    const timesMs = [0, 25, 50, 75, 100];
    assert.deepEqual(exportAnimationFrames(restored, { timesMs }), exportAnimationFrames(rebased, { timesMs }));
    for (const time of timesMs) {
      const native = sampleTransition(rebased, time), offline = sampleTransition(restored, time);
      assert.deepEqual(positions(offline), positions(native));
      assertDeepFrozen(positions(native));
      assertDeepFrozen(positions(offline));
    }
    const proof = animationFrameProvenance(sampleTransition(rebased, 50));
    assert.equal(Object.hasOwn(proof, "plan"), false);
    assert.equal(Object.hasOwn(proof, "frame"), false);
    assert.equal(Object.hasOwn(proof, "previous"), false);
  }
});
