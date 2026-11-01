import test from "node:test";
import assert from "node:assert/strict";
import { hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { createGraphPresentationFrame } from "../../../src/animation/graphPresentation.js";
import { prepareAnimationHitFrame, requireAnimationFrameProgram } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { animationGraphFrame } from "../../support/animation-graph-frame.js";

const options = { durationMs: 100, easing: "linear" };
const hit = (frame, point) => { const bridge = createHitFrameBridge(prepareAnimationHitFrame(frame)); try { return bridge.hit(point, { slop: 0 }); } finally { bridge.dispose(); } };

test("authentic graph presentation starts exactly at current meaning and reattaches native endpoints", () => {
  const { from, to, frame } = animationGraphFrame(false, true), original = JSON.stringify(frame);
  const proof = animationFrameProvenance(frame), group = proof.graphs.groups[0], first = group.nodes[0];
  const unchanged = createGraphPresentationFrame(frame, { group: 0, node: { key: first.key, x: first.x, y: first.y } });
  assert.deepEqual(unchanged.scene, frame.scene);
  const next = createGraphPresentationFrame(frame, { group: 0, node: { key: first.key, x: first.x + 30, y: first.y + 40 } });
  const after = animationFrameProvenance(next), moved = after.graphs.groups[0];
  assert.deepEqual(moved.nodes.map(({ x, y }) => [x, y]), [[80, 120], [210, 80]]);
  assert.deepEqual(moved.edges[0].points[0], { x: 80, y: 120 }); assert.deepEqual(moved.edges[0].points.at(-1), { x: 210, y: 80 });
  assert.equal(after.native, proof.native); assert.equal(after.positions, proof.positions);
  assert.equal(after.endpoint.identities, proof.endpoint.identities); assert.equal(after.endpoint.backgrounds, proof.endpoint.backgrounds);
  assert.equal(hit(next, { x: 80, y: 120 }).target.ownerId, "plot");
  requireAnimationFrameProgram(next, from); requireAnimationFrameProgram(next, to);
  assert.equal(JSON.stringify(frame), original);
});

test("a graph drag presentation remains a public re-planning endpoint without retaining prior frame chains", () => {
  const { from, to, frame } = animationGraphFrame(false, true), group = animationFrameProvenance(frame).graphs.groups[0];
  let current = frame;
  for (let i = 0; i < 100; i++) current = createGraphPresentationFrame(current, { group: 0, node: { key: group.nodes[0].key, x: 50 + i / 10, y: 80 } });
  const proof = animationFrameProvenance(current);
  assert.equal(Object.hasOwn(proof, "plan"), false); assert.equal(Object.hasOwn(proof, "frame"), false); assert.ok(proof.native.owners.length <= 2);
  const plan = planTransition({ from: current, to, options });
  assert.equal(sampleTransition(plan, 0), current);
  const middle = sampleTransition(plan, 50); assert.ok(middle.decisions.some(value => value.kernel === "completed-graph"));
  assert.equal(hit(middle, { x: 59.95, y: 90 }).target.ownerId, "plot");
  const restored = deserializeAnimation(serializeAnimation(plan)).plan;
  assert.deepEqual(sampleTransition(restored, 50).scene, middle.scene);
  assert.throws(() => prepareAnimationHitFrame(sampleTransition(restored, 50)), /native endpoint/);
  assert.equal(from.semanticSpec.resources.find(resource => resource.kind === "layout").revision, 0);
});

test("temporary unbundle changes the chosen edge body and arrow while preserving canonical meaning", () => {
  const { frame, to } = animationGraphFrame(false, true), proof = animationFrameProvenance(frame), group = proof.graphs.groups[0];
  const next = createGraphPresentationFrame(frame, { group: 0, edge: group.edges[0].key }), after = animationFrameProvenance(next);
  const changed = proof.graphs.items.flatMap((item, index) => item?.kind === "edge" ? [index] : []);
  assert.equal(changed.length, 2);
  for (let index = 0; index < frame.scene.nodes.length; index++) {
    if (changed.includes(index)) {
      assert.equal(next.scene.nodes[index].key, frame.scene.nodes[index].key);
      assert.equal(next.scene.nodes[index].topology, frame.scene.nodes[index].topology);
      assert.equal(after.graphs.items[index].reason, "edited-graph-geometry");
    } else assert.equal(next.scene.nodes[index], frame.scene.nodes[index]);
  }
  assert.equal(after.graphs.groups[0], group); assert.equal(after.native, proof.native);
  const plan = planTransition({ from: next, to, options }); assert.equal(sampleTransition(plan, 0), next);
  assert.ok(sampleTransition(plan, 50).decisions.some(value => value.reason === "edited-graph-geometry"));
});

test("nested graph presentations retain unrelated scopes and native child identities", () => {
  const { from, to } = animationGraphFrame(false, false);
  const compose = program => hconcat({ id: "pair", programs: [{ id: "a", program }, { id: "b", program }] });
  const original = sampleTransition(planTransition({ from: compose(from), to: compose(to), options }), 50);
  const proof = animationFrameProvenance(original), group = proof.graphs.groups[1];
  const next = createGraphPresentationFrame(original, { group: 1, node: { key: group.nodes[0].key, x: 70, y: 100 } });
  for (const [index, item] of proof.graphs.items.entries()) if (item?.group === 0 || item === null) assert.equal(next.scene.nodes[index], original.scene.nodes[index]);
  const node = next.scene.nodes.find((node, index) => proof.graphs.items[index]?.group === 1 && node.type === "circle");
  assert.deepEqual(hit(next, { x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] }).target.childPath, ["b"]);
});

test("graph presentation never promotes copied, offline or invalid operations to native authority", () => {
  const { frame, plan } = animationGraphFrame(false, true), group = animationFrameProvenance(frame).graphs.groups[0], before = JSON.stringify(frame);
  for (const source of [structuredClone(frame), sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50)]) {
    assert.throws(() => createGraphPresentationFrame(source, { group: 0, edge: group.edges[0].key }), /authentic native/);
  }
  for (const operation of [{ group: -1, edge: "x" }, { group: 0 }, { group: 0, edge: "x", node: {} },
    { group: 0, node: { key: "x", x: 1, y: 2 } }, { group: 0, node: { key: group.nodes[0].key, x: Infinity, y: 2 } },
    { group: 0, edge: "x", extra: true }]) assert.throws(() => createGraphPresentationFrame(frame, operation));
  let reads = 0;
  assert.throws(() => createGraphPresentationFrame(frame, { get group() { reads++; return 0; }, edge: "x" }), /accessors/);
  assert.equal(reads, 0); assert.equal(JSON.stringify(frame), before);
  const unbundled = createGraphPresentationFrame(frame, { group: 0, edge: group.edges[0].key });
  assert.throws(() => createGraphPresentationFrame(unbundled, { group: 0, node: { key: group.nodes[0].key, x: 70, y: 90 } }), /exact current/);
});
