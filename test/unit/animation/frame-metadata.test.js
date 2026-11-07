import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { captureFrameMeaning } from "../../../src/animation/frameEndpoint.js";
import { projectSampledAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";

function fixture() {
  const from = chart().createCanvas({ width: 400, height: 400, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: .2, y: .5 }, { id: "b", x: .7, y: .3 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { id: "x", domain: [0, 1], nice: false } })
    .encodeY({ field: "y", scale: { id: "y", domain: [0, 1], nice: false } });
  const to = from.editScale({ id: "x", domain: [0, 2], nice: false });
  return planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
}

test("later samples share exact immutable correspondence while retaining current graphics", () => {
  const plan = fixture(), a = sampleTransition(plan, 25), b = sampleTransition(plan, 75);
  const x = animationFrameProvenance(a).endpoint, y = animationFrameProvenance(b).endpoint;
  for (const key of ["identities", "matching", "sources"]) assert.equal(x[key], y[key]);
  assert.notEqual(x, y);
  assert.equal(y.scene, b.scene);
  assert.equal(y.graphicSpec, b.graphicSpec);
  assert.notEqual(a.scene.nodes[1].properties.x, b.scene.nodes[1].properties.x);
  assert.equal(a.scene.nodes[1].properties.x, 20 + 360 * .2 / 1.25);
  assert.equal(b.scene.nodes[1].properties.x, 20 + 360 * .2 / 1.75);
  const text = serializeAnimation(plan), restored = deserializeAnimation(text).plan;
  assert.deepEqual(sampleTransition(restored, 25), a);
  assert.deepEqual(sampleTransition(restored, 75), b);
  assert.equal(serializeAnimation(restored), text);
  assert.throws(() => prepareAnimationHitFrame(sampleTransition(restored, 50)), /native endpoint metadata/);
  assert.throws(() => prepareAnimationHitFrame(structuredClone(b)), /authentic/);
});

test("sampled projection rebuilds changed node keys and validates each new identity vector", () => {
  const frame = sampleTransition(fixture(), 50), endpoint = animationFrameProvenance(frame).endpoint;
  const project = (value, identities = endpoint.identities) =>
    projectSampledAnimationEndpoint(value, identities, endpoint.backgrounds);
  const changed = cloneAndFreeze({ ...frame, scene: { ...frame.scene,
    nodes: frame.scene.nodes.map((node, index) => ({ ...node, key: `changed-${index}` })) } });
  const next = project(changed);
  assert.equal(next.matching, endpoint.matching);
  assert.notEqual(next.sources, endpoint.sources);
  assert.deepEqual(next.sources.map(source => source.nodeKey), changed.scene.nodes.map(node => node.key));
  assert.deepEqual(project(frame).sources, endpoint.sources);
  const invalid = [
    cloneAndFreeze([endpoint.identities[1], endpoint.identities[1], undefined]),
    cloneAndFreeze(endpoint.identities.map(value => value ? { ...value, role: "" } : value)),
    cloneAndFreeze(endpoint.identities.map(value => value ? { ...value, key: "invalid-json" } : value))
  ];
  for (const identities of invalid) assert.throws(() => project(frame, identities));
  assert.deepEqual(project(frame).matching, endpoint.matching);
  for (const identities of [structuredClone(endpoint.identities), Object.freeze(structuredClone(endpoint.identities))])
    assert.throws(() => project(frame, identities), /owned scene/);
  assert.throws(() => project({ ...frame, scene: structuredClone(frame.scene) }), /owned scene/);
  assert.throws(() => project({ ...frame, graphicSpec: structuredClone(frame.graphicSpec) }), /owned scene/);
  assert.throws(() => project(frame, cloneAndFreeze([])), /owned scene/);
});

test("metadata reuse never bypasses the current sampled decision boundary", () => {
  const plan = fixture(), frame = sampleTransition(plan, 25);
  sampleTransition(plan, 75);
  const broken = structuredClone(frame);
  broken.decisions[1].targetIndex = 999;
  assert.throws(() => captureFrameMeaning(cloneAndFreeze(broken), plan, 25), /exact endpoint node/);
  const changed = structuredClone(frame);
  [changed.decisions[1], changed.decisions[2]] = [changed.decisions[2], changed.decisions[1]];
  const meaning = captureFrameMeaning(cloneAndFreeze(changed), plan, 25);
  assert.deepEqual(meaning.endpoint.identities, [undefined, plan.to.identities[2], plan.to.identities[1]]);
  const original = captureFrameMeaning(frame, plan, 25);
  assert.deepEqual(original.endpoint.identities, animationFrameProvenance(frame).endpoint.identities);
});
