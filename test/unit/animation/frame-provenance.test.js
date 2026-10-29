import assert from "node:assert/strict";
import test from "node:test";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { registerAnimationPlan, animationPlanProvenance, registerAnimationFrame, animationFrameProvenance } from "../../../src/animation/frameProvenance.js";

test("sample provenance keeps native endpoints private and preserves the exact frame", () => {
  const plan = cloneAndFreeze({ durationMs: 1000 }), from = {}, to = {};
  assert.equal(registerAnimationPlan(plan, { from, to }), plan);
  assert.equal(animationPlanProvenance(plan).from, from);
  assert.equal(animationPlanProvenance(plan).to, to);
  assert.equal(Object.isFrozen(animationPlanProvenance(plan)), true);
  const frame = cloneAndFreeze({ scene: { nodes: [{ key: "a" }] }, progress: .5 });
  const positions = [{ x: { value: 10, scale: { type: "linear", domain: [0, 20], range: [0, 100] } } }];
  const serialized = JSON.stringify(frame);
  assert.equal(registerAnimationFrame(frame, { plan, timeMs: 500, positions }), frame);
  positions[0].x.value = 99;
  const proof = animationFrameProvenance(frame);
  assert.equal(proof.plan, plan);
  assert.equal(proof.timeMs, 500);
  assert.equal(proof.positions[0].x.value, 10);
  assert.equal(Object.isFrozen(proof.positions[0].x.scale.domain), true);
  assert.equal(JSON.stringify(frame), serialized);
  assert.equal(animationFrameProvenance(structuredClone(frame)), undefined);
  assert.equal(animationPlanProvenance(structuredClone(plan)), undefined);
});

test("provenance rejects duplicate registration, mutable frames and mismatched position order", () => {
  const plan = cloneAndFreeze({ durationMs: 1 }), frame = cloneAndFreeze({ scene: { nodes: [] } });
  assert.throws(() => registerAnimationPlan({}, {}), /owned plan/);
  registerAnimationPlan(plan, {});
  assert.throws(() => registerAnimationPlan(plan, {}), /owned plan/);
  assert.throws(() => registerAnimationFrame({}, { plan, timeMs: 0 }), /owned sampled frame/);
  assert.throws(() => registerAnimationFrame(frame, { plan: {}, timeMs: 0 }), /owned sampled frame/);
  assert.throws(() => registerAnimationFrame(frame, { plan, timeMs: Infinity }), /finite time/);
  assert.throws(() => registerAnimationFrame(frame, { plan, timeMs: 0, positions: [null] }), /node order/);
  assert.equal(animationFrameProvenance(frame), undefined);
  registerAnimationFrame(frame, { plan, timeMs: 0 });
  assert.throws(() => registerAnimationFrame(frame, { plan, timeMs: 0 }), /owned sampled frame/);
});
