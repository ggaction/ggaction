import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";
import { createHitFrameBridge } from "../../../src/interaction/hitFrame.js";
import { validateGraphic } from "../../../src/persistence/validation.js";

const options = { durationMs: 100, easing: "linear" };
const feature = (id, coordinates, type = "Point") => ({ type: "Feature", properties: { id }, geometry: { type, coordinates } });
const make = (features = [feature("a", [0, 0])], type = "orthographic", mark = "createGeoPointMark", camera = {}) => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: ["properties", "id"], values: { type: "FeatureCollection", features } })
  .createProjection({ id: "map", type, scalePx: 100, translatePx: [200, 150], ...camera }).createCoordinate({ type: "geo" })[mark]({ id: "places" });
const frame = (from, to, time = 50) => sampleTransition(planTransition({ from, to, options }), time);
const hits = (sample, node) => {
  const bridge = createHitFrameBridge(prepareAnimationHitFrame(sample));
  try { return bridge.hit({ x: node.properties.x + node.offset[0], y: node.properties.y + node.offset[1] }, { slop: 0 }); }
  finally { bridge.dispose(); }
};

test("public Geo sampling materializes a source feature absent from both endpoint scenes", () => {
  const from = make().editProjection({ clipExtentPx: [[0, 0], [400, 300]], translatePx: [-200, 150] }), to = from.editProjection({ translatePx: [600, 150] });
  const plan = planTransition({ from, to, options }), before = JSON.stringify([from, to]), middle = sampleTransition(plan, 50);
  assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec); assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
  assert.deepEqual(middle.scene, projectAnimationEndpoint(from.editProjection({ translatePx: [200, 150] })).scene);
  const index = middle.scene.nodes.findIndex(node => node.type === "circle"), decision = middle.decisions[index];
  assert.equal(decision.kind, "geographic"); assert.equal(decision.kernel, "native-geo");
  assert.equal(Object.hasOwn(decision, "sourceIndex"), false); assert.equal(Object.hasOwn(decision, "targetIndex"), false);
  validateGraphic(middle.graphicSpec); assert.equal(JSON.stringify([from, to]), before);
  assert.deepEqual(sampleTransition(plan, 50), middle); assert.ok(Object.isFrozen(middle));
  const hit = hits(middle, middle.scene.nodes[index]);
  assert.equal(hit.target.ownerId, "places"); assert.equal(hit.target.itemKey, decision.itemKey);
  assert.deepEqual(hit.target.resourceRefs, [{ kind: "geometry", id: "world", revision: 0 }]);
});

test("current Geo frames rebase repeatedly with flat native provenance and exact endpoints", () => {
  const from = make(), to = from.editProjection({ rotateDeg: [80, 20, 30], scalePx: 200 });
  let current = frame(from, to);
  for (let index = 0; index < 20; index++) {
    const target = index % 2 ? from : to, plan = planTransition({ from: current, to: target, options });
    assert.equal(sampleTransition(plan, 0), current);
    const reverse = planTransition({ from: target, to: current, options }); assert.equal(sampleTransition(reverse, 100), current);
    current = sampleTransition(plan, 50);
    const proof = animationFrameProvenance(current); assert.equal(Object.hasOwn(proof, "plan"), false);
    assert.equal(proof.geos.groups.length, 1); assert.equal(proof.geos.items.length, current.scene.nodes.length);
    assert.ok(proof.native.owners.length <= 2);
    const circle = current.scene.nodes.find(node => node.type === "circle"); if (circle) assert.equal(hits(current, circle).target.ownerId, "places");
  }
  const timed = exportAnimationFrames(planTransition({ from: current, to, options }), { timesMs: [0, 50] });
  assert.doesNotThrow(() => planTransition({ from: timed[0], to: timed[1], options }));
});

test("Geo seam part changes and nested scopes follow actual native camera geometry", () => {
  const line = make([feature("route", [[170, 0], [-170, 0]], "LineString")], "equirectangular", "createGeoLineMark"), to = line.editProjection({ rotateDeg: [30, 0, 0] });
  const middle = frame(line, to), expected = projectAnimationEndpoint(line.editProjection({ rotateDeg: [15, 0, 0] })).scene;
  assert.deepEqual(middle.scene, expected); assert.equal(middle.decisions.filter(d => d.kind === "geographic").length, 1);
  const p = make().editProjection({ clipExtentPx: [[0, 0], [400, 300]], translatePx: [-200, 150] }), q = p.editProjection({ translatePx: [600, 150] });
  const pair = program => hconcat({ id: "pair", programs: [{ id: "left", program }, { id: "right", program }] });
  const nested = frame(pair(p), pair(q)), circles = nested.scene.nodes.filter(node => node.type === "circle");
  assert.equal(circles.length, 2); assert.deepEqual(circles.map(node => hits(nested, node).target.childPath), [["left"], ["right"]]);
  assert.notEqual(circles[0].key, circles[1].key);
});

test("Geo offline replay retains hidden sources and current semantic camera state", () => {
  const from = make().editProjection({ clipExtentPx: [[0, 0], [400, 300]], translatePx: [-200, 150] }), to = from.editProjection({ translatePx: [600, 150] });
  const plan = planTransition({ from, to, options }), restored = deserializeAnimation(serializeAnimation(plan)).plan;
  assert.deepEqual(sampleTransition(restored, 50), sampleTransition(plan, 50));
  const current = sampleTransition(plan, 50), rebased = planTransition({ from: current, to, options });
  const replay = deserializeAnimation(serializeAnimation(rebased)).plan;
  for (const time of [0, 20, 50, 100]) assert.deepEqual(sampleTransition(replay, time), sampleTransition(rebased, time));
  assert.throws(() => prepareAnimationHitFrame(sampleTransition(restored, 50)), /native endpoint metadata/);
});

test("Geo restore rejects lost meaning, fabricated indices, wrong versions and changed part geometry", () => {
  const p = make(), q = p.editProjection({ rotateDeg: [30, 0, 0] }), middle = frame(p, q);
  const payload = exportTransitionPlan(planTransition({ from: middle, to: q, options })), index = payload.from.view.decisions.findIndex(d => d.kind === "geographic");
  for (const mutate of [
    value => { value.kernels.geo = "unknown"; }, value => { delete value.from.geos; },
    value => { value.from.view.decisions[index].targetIndex = 0; }, value => { value.from.view.decisions[index].role = "other"; },
    value => { value.from.geos.items[index] = null; }, value => { value.from.geos.groups[0].presentation.geometry.parameters.scalePx += 1; },
    value => { value.from.geos.groups[0].presentation.geometry.features[0].key = "other"; }
  ]) { const value = structuredClone(payload); mutate(value); assert.throws(() => restoreTransitionPlan(value)); }
  let calls = 0; const forged = structuredClone(payload); Object.defineProperty(forged.from.geos, "groups", { get() { calls++; return []; } });
  assert.throws(() => restoreTransitionPlan(forged)); assert.equal(calls, 0);
  assert.deepEqual(sampleTransition(restoreTransitionPlan(payload), 50), sampleTransition(planTransition({ from: middle, to: q, options }), 50));
});

test("incompatible Geo camera, primitive edits and changed source geometry retain explicit crossfade", () => {
  const p = make();
  for (const [q, reason] of [[p.editProjection({ type: "equirectangular" }), "projection-type"], [p.editGraphics({ target: p.graphicSpec.objects.places.items[0].id, property: "radius", value: 20 }), "edited-geo-graphics"]]) {
    const plan = planTransition({ from: p, to: q, options }); assert.equal(plan.tracks.find(track => track.key)?.reason, reason);
    const current = sampleTransition(plan, 50); assert.ok(current.scene.nodes.some(node => node.type === "weighted-blend"));
    assert.doesNotThrow(() => restoreTransitionPlan(exportTransitionPlan(planTransition({ from: current, to: q, options }))));
  }
});

test("filled shapes and generated graticules use current native geometry and exact target lineage", async () => {
  const { animationGeoFrame } = await import("../../support/animation-geo-frame.js");
  for (const variant of ["shape", "graticule"]) {
    const { from, to, plan, native } = animationGeoFrame(variant), current = sampleTransition(plan, 50);
    assert.deepEqual(current.scene, projectAnimationEndpoint(native).scene);
    const proof = animationFrameProvenance(current), identity = proof.endpoint.identities.find(Boolean);
    const expected = variant === "graticule" ? { kind: "projection", id: "map", revision: 1 } : { kind: "geometry", id: "world", revision: 0 };
    assert.deepEqual(identity.lineage.resource, expected);
    assert.equal(proof.native.nodes.find(node => node.origin.kind === "geo-feature").origin.program, to);
    assert.doesNotThrow(() => prepareAnimationHitFrame(current));
    assert.deepEqual(sampleTransition(planTransition({ from: current, to: from, options }), 0), current);
  }
});

test("compatible features survive source membership changes and retain typed camera on current rebase", () => {
  const p = make([feature("a", [0, 0]), feature("b", [20, 0])]);
  const q = p.editGeometryData({ target: "world", values: { type: "FeatureCollection", features: [feature("a", [0, 0]), feature("new", [-20, 0])] } }).editProjection({ rotateDeg: [20, 0, 0] });
  const current = frame(p, q), decisions = current.decisions;
  assert.equal(decisions.filter(decision => decision.kind === "geographic").length, 1);
  assert.equal(decisions.filter(decision => decision.kind === "enter").length, 1);
  assert.equal(decisions.filter(decision => decision.kind === "exit").length, 1);
  assert.equal(animationFrameProvenance(current).geos.groups[0].presentation.geometry.features.length, 1);
  const plan = planTransition({ from: current, to: q, options });
  assert.equal(sampleTransition(plan, 50).decisions.filter(decision => decision.kind === "geographic").length, 1);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50), sampleTransition(plan, 50));
});

test("hidden endpoint geometry cannot bypass the current frame generated-part limit", () => {
  const p=make([feature("many",Array.from({length:10_001},()=>[0,0]),"MultiPoint")],"orthographic","createGeoPointMark",{clipExtentPx:[[0,0],[400,300]],translatePx:[-200,150]});
  const q=p.editProjection({translatePx:[600,150]}),before=JSON.stringify(p),plan=planTransition({from:p,to:q,options});
  const first=sampleTransition(plan,0);assert.equal(first.scene.nodes.length,1);
  assert.throws(()=>sampleTransition(plan,50),/limit|exceed|10000/i);
  assert.equal(JSON.stringify(p),before);assert.deepEqual(sampleTransition(plan,0),first);
  assert.equal(sampleTransition(plan,100).scene.nodes.length,1);
});

test("current composite camera samples retain native inset identities and excluded source visibility", () => {
  const from=make([feature("lower",[-100,40]),feature("north",[-150,64]),feature("island",[-157,20]),feature("outside",[0,0])],
    "albers-usa","createGeoPointMark",{scalePx:100,translatePx:[100,100]});
  const to=from.editProjection({scalePx:400,translatePx:[300,200]}),current=frame(from,to);
  const expected=from.editProjection({scalePx:200,translatePx:[200,150]});
  const native=projectAnimationEndpoint(expected).scene,actual=structuredClone(current.scene);
  for(const [index,node] of actual.nodes.entries())if(node.type==="circle")for(const axis of ["x","y"]){
    assert.ok(Math.abs(node.properties[axis]-native.nodes[index].properties[axis])<1e-10);
    node.properties[axis]=native.nodes[index].properties[axis];
  }
  assert.deepEqual(actual,native);
  const points=current.scene.nodes.filter(node=>node.type==="circle");assert.equal(points.length,3);
  const decisions=current.decisions.filter(value=>value.kind==="geographic");
  assert.equal(new Set(decisions.map(value=>value.itemKey)).size,3);
  for(const point of points) assert.equal(hits(current,point).target.ownerId,"places");
  const restored=deserializeAnimation(serializeAnimation(planTransition({from:current,to,options}))).plan;
  assert.deepEqual(sampleTransition(restored,0).scene,current.scene);
});
