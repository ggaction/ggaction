import assert from "node:assert/strict";
import test from "node:test";
import { blendAnimationNodes, clipInterpolationCompatible, interpolateNodeFrame, fadeAnimationNode } from "../../../src/animation/concrete.js";
import { prepareConcreteHitShape } from "../../../src/interaction/hitConcrete.js";
import { hitShape } from "../../../src/grammar/hitShapes.js";

const node = (fill, patch = {}) => ({ key: "item", type: "circle", topology: "point", properties: { x: 20, y: 20, radius: 5, fill },
  offset: [0, 0], clip: [0, 0, 100, 100], clips: [], ...patch });
const pathClip = { type: "path", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 100, y: 0 }, { op: "L", x: 0, y: 100 }, { op: "Z" }] };

test("current weighted item sources flatten with composed weights and explicit clips", () => {
  const first = blendAnimationNodes(node("red"), node("blue"), .25, 100, 100);
  const current = { ...first, offset: [4, 6], clips: [pathClip], properties: { ...first.properties, opacity: .5 } };
  const next = blendAnimationNodes(current, node("lime"), .4, 100, 100);
  next.properties.sources.forEach((source, index) => assert.ok(Math.abs(source.weight - [.45, .15, .4][index]) < 1e-15));
  assert.deepEqual(next.properties.sources.slice(0, 2).map(s => s.properties.opacity), [.5, .5]);
  assert.deepEqual(next.properties.sources[0].offset, [4, 6]);
  assert.deepEqual(next.properties.sources[0].clips[0], pathClip);
  assert.equal(next.properties.sources.some(s => s.type === "weighted-blend"), false);
  assert.ok(Object.isFrozen(next.properties.sources[0].properties));
  const many = { ...first, properties: { sources: Array.from({ length: 64 }, () => ({ ...first.properties.sources[0], weight: 1 / 64 })) } };
  assert.equal(many.properties.sources.length, 64);
  const before = JSON.stringify(many);
  assert.throws(() => blendAnimationNodes(many, node("red"), .5, 100, 100), /2\.\.64/);
  assert.equal(JSON.stringify(many), before);
});

test("rectangular placements interpolate while path clip topology remains explicit", () => {
  const a = node("red", { offset: [2, 4], clip: [0, 0, 100, 100], clips: [[0, 0, 100, 100], pathClip] });
  const b = node("red", { offset: [10, 20], clip: [10, 20, 200, 200], clips: [[10, 20, 200, 200], pathClip] });
  assert.equal(clipInterpolationCompatible(a, b), true);
  assert.deepEqual(interpolateNodeFrame(a, b, .5), { offset: [6, 12], clip: [5, 10, 150, 150], clips: [[5, 10, 150, 150], pathClip] });
  assert.equal(clipInterpolationCompatible(a, node("red")), false);
  assert.equal(clipInterpolationCompatible(a, { ...b, clips: [b.clips[0], { ...pathClip, commands: [...pathClip.commands, { op: "M", x: 10, y: 10 }] }] }), false);
  const zero = fadeAnimationNode(a, 0);
  assert.equal(hitShape(prepareConcreteHitShape(zero), { x: 22, y: 24 }, { slop: 0 }).hit, false);
  const nonnormal = { ...a, properties: { ...a.properties, blend: "multiply" } };
  assert.equal(blendAnimationNodes(nonnormal, nonnormal, .5, 100, 100).properties.blend, "multiply");
  assert.throws(() => blendAnimationNodes(a, nonnormal, .5, 100, 100), /backdrop blend/);
});
