import test from "node:test";
import assert from "node:assert/strict";
import { animationGeoTextFrame } from "../../support/animation-geo-text-frame.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";

const copy = value => JSON.parse(JSON.stringify(value));
const plan = (from,to) => planTransition({from,to,options:{durationMs:100,easing:"linear"}});

test("geographic Text restoration rejects malformed scoped meanings without changing the valid plan", () => {
  const prepared = animationGeoTextFrame("collision").plan, original = exportTransitionPlan(prepared), expected = sampleTransition(prepared,50);
  const changes = [
    p => p.key = '[[],"names","extra"]',
    p => p.key = '[[2],"names"]',
    p => p.projection.kind = "geometry",
    p => p.coordinateKind = "geographic",
    p => p.parameters.scalePx = -1,
    p => p.plotOrigin = [0],
    p => p.plotOrigin[0] = Infinity,
    p => p.bounds.right = p.bounds.left,
    p => p.bounds.extra = 1,
    p => p.layout.axis = "diagonal",
    p => p.leader.strokeWidth = -1,
    p => p.entries.push(copy(p.entries[0])),
    p => p.entries[0].identity.role = "label",
    p => p.entries[0].identity.topology = "line",
    p => p.entries[0].identity.key = JSON.stringify([[],"other","text",["label",p.entries[0].source.key]]),
    p => p.entries[0].identity.lineage.resource.kind = "image",
    p => p.entries[0].source.key = JSON.stringify([[],"points","geo",["feature"]]),
    p => p.entries[0].source.key = JSON.stringify([[],"points","geo",["feature","missing"]]),
    p => p.entries[0].source.digest = "not-a-digest",
    p => p.entries[0].anchor = [1],
    p => p.entries[0].properties.text = 3,
    p => p.entries[0].properties.fontSize = -1,
    p => p.entries[0].properties.extra = true,
    p => p.entries[0].source.extra = true,
    p => p.entries[0].extra = true
  ];
  for (const mutate of changes) { const payload=copy(original); mutate(payload.from.geotexts.groups[0].presentation);assert.throws(()=>restoreTransitionPlan(payload)); }
  assert.deepEqual(sampleTransition(prepared,50),expected);
});

test("geographic Text restored roles, slots and groups are exact and exhaustive", () => {
  const original = exportTransitionPlan(animationGeoTextFrame("collision").plan);
  const changes = [
    p => p.groups[0].insertion = -1,
    p => p.groups[0].insertion = 10000,
    p => p.groups[0].leaderInsertion = null,
    p => p.groups[0].leaderFrame = null,
    p => p.groups[0].frame.offset = [0],
    p => p.groups[0].reason = "invented",
    p => p.groups.push(copy(p.groups[0])),
    p => p.groups.reverse(),
    p => p.items.pop(),
    p => p.items[p.items.findIndex(Boolean)] = null,
    p => p.items.find(Boolean).group = -1,
    p => p.items.find(Boolean).key = "unknown",
    p => p.items.find(Boolean).reason = "edited-geo-graphics",
    p => p.items.find(Boolean).extra = true,
    p => p.order.pop(),
    p => p.order[0] = ["unknown","owner"],
    p => p.groups[0].presentation.entries.pop()
  ];
  for (const mutate of changes) {const payload=copy(original); mutate(payload.from.geotexts);assert.throws(()=>restoreTransitionPlan(payload));}
});

test("geographic Text native edits retain explicit appearance and layout fallback", () => {
  const {from}=animationGeoTextFrame("collision");
  const moved=from.editProjection({scalePx:4});
  for(const target of [
    moved.editTextMark({target:"names",fontSize:24}),
    moved.layoutLabels({target:"names",axis:"x",leader:{}}),
    moved.editGraphics({target:"names",property:"x",value:1000})
  ]) {
    const transition=plan(from,target);
    assert.ok(transition.tracks.some(track=>track.kind==="crossfade"));
    const middle=sampleTransition(transition,50);
    const next=plan(middle,from);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(next)).plan,50),sampleTransition(next,50));
  }
  const color=from.editTextMark({target:"names",fill:"red",opacity:.5}).editProjection({scalePx:4});
  const current=sampleTransition(plan(from,color),50);
  assert.ok(current.decisions.some(decision=>decision.kernel==="native-geo-text"));
  assert.ok(current.scene.nodes.some(node=>node.type==="text"&&node.properties.opacity===.75));
});

test("dynamic Text collection emits only its owned slot and rejects incomplete placement", async () => {
  const {transitionGeoTexts}=await import("../../../src/animation/planner.js");
  const {sampleGeoTextTracks}=await import("../../../src/animation/geoTextTracks.js");
  const {geoTextFrameCollector}=await import("../../../src/animation/geoTextFrames.js");
  const state=transitionGeoTexts(animationGeoTextFrame("collision").plan),samples=sampleGeoTextTracks(state.state,.5);
  const collector=geoTextFrameCollector(samples,state.to),key=samples[0].presentation.key;
  assert.deepEqual(collector.at(0,0,"labels","unknown"),[]);
  assert.deepEqual(collector.at(-1,0,"labels",key),[]);
  assert.throws(()=>collector.finish({groups:[]}),/actual sampled drawing slots/);
});
