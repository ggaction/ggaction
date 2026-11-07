import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, createAnimationPlayer, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { animationFrameProvenance, animationPlanProvenance } from "../../../src/animation/frameProvenance.js";
import { prepareAnimationHitFrame, requireAnimationFrameProgram } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { getMarkItems } from "../../../src/inspection.js";

const program = () => chart().createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { id: "x", domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 10], nice: false } });
const options = { durationMs: 100, easing: "linear" };
const plan = (from, to) => planTransition({ from, to, options });

for (const count of [100, 1000]) test(`${count} public interruptions retain bounded native proof and exact current geometry`, async () => {
  const a = program(), b = a.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 9, y: 9 }] });
  let renders = 0;
  const player = createAnimationPlayer({ plan: plan(a, b), clock: { now: () => 0, requestFrame() { throw new Error("Paused interruption must not request a frame."); }, cancelFrame() {} }, render() { renders++; } });
  player.seek(50);
  let value = 5;
  for (let i = 0; i < count; i++) {
    const current = player.getFrame(), target = i % 2 ? a : b, previous = player.finished;
    player.interrupt({ to: target, options });
    assert.equal(player.getFrame(), current);
    assert.equal((await previous).reason, "interrupted");
    player.seek(50);
    value = (value + (i % 2 ? 1 : 9)) / 2;
    const frame = player.getFrame(), proof = animationFrameProvenance(frame);
    assert.equal(Object.hasOwn(proof, "plan"), false);
    assert.equal(Object.keys(proof.planIdentity).length, 0);
    assert.ok(proof.native.owners.length <= 2);
    assert.equal(proof.native.nodes.length, 2);
    assert.ok(proof.native.nodes.every(source => source.metrics.length === 1));
    requireAnimationFrameProgram(frame, target);
    const circle = frame.scene.nodes.find(node => node.type === "circle");
    assert.ok(Math.abs(circle.properties.x - (20 + value * 20)) < 1e-10);
    assert.ok(Math.abs(circle.properties.y - (160 - value * 14)) < 1e-10);
    const bridge = createHitFrameBridge(prepareAnimationHitFrame(frame));
    try {
      const hit = bridge.hit({ x: circle.properties.x, y: circle.properties.y }, { slop: 0 });
      assert.equal(hit.target.itemKey, getMarkItems(target)[0].key);
      assert.equal(hit.target.resourceRefs[0].id, i % 2 ? "rows" : "next");
    } finally { bridge.dispose(); }
  }
  const current = player.getFrame(), final = plan(current, a);
  assert.equal(sampleTransition(final, 0), current);
  const restored = deserializeAnimation(serializeAnimation(final)).plan;
  for (const time of [0, 50, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(final, time));
  player.dispose(); assert.equal((await player.finished).reason, "disposed");
  assert.equal(player.getFrame(), undefined); const before = renders;
  assert.throws(() => player.seek(50), /disposed/); assert.equal(renders, before);
});

test("native authority contains exact displayed owners and direct endpoints without historical or cloned programs", () => {
  const a = program(), b = a.reviseData({ source: "rows", id: "b", values: [{ id: "a", x: 4, y: 5 }] });
  const c = a.reviseData({ source: "rows", id: "c", values: [{ id: "a", x: 8, y: 5 }] });
  const first = sampleTransition(plan(a, b), 50), next = plan(first, c), current = sampleTransition(next, 50);
  requireAnimationFrameProgram(first, a); requireAnimationFrameProgram(first, b);
  requireAnimationFrameProgram(current, c);
  assert.throws(() => requireAnimationFrameProgram(current, a), /current native program/);
  assert.throws(() => requireAnimationFrameProgram(current, b), /current native program/);
  assert.throws(() => requireAnimationFrameProgram(current, program()), /current native program/);
  assert.throws(() => requireAnimationFrameProgram(structuredClone(current), c), /authentic/);
  const restored = sampleTransition(deserializeAnimation(serializeAnimation(next)).plan, 50);
  assert.throws(() => requireAnimationFrameProgram(restored, c), /native endpoint metadata/);
  assert.equal(Object.hasOwn(animationPlanProvenance(next).from, "frame"), false);
  assert.equal(Object.hasOwn(animationPlanProvenance(next).from, "plan"), false);
});
