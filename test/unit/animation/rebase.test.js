import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, exportTransitionPlan, restoreTransitionPlan, requireTransitionEndpoint } from "../../../src/animation/planner.js";
import { sampleTransition, withSampleTime } from "../../../src/animation/sample.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";

const points = () => chart().createCanvas({ width: 240, height: 180, margin: 20 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 20 }, { id: "b", x: 100, y: 80 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { id: "x", type: "log", domain: [1, 1000], nice: false } })
  .encodeY({ field: "y", scale: { id: "y", domain: [0, 100], nice: false } });
const prepare = (from,to) => planTransition({from,to,options:{durationMs:100,easing:"linear"}});
const revise = (p,x) => p.reviseData({source:"rows",id:"next",values:[{id:"a",x,y:40},{id:"b",x:1000,y:60}]});

test("current semantic values and resolved scales rebase without pixel inversion in either direction", () => {
  const from=points(),to=revise(from,100),old=prepare(from,to),current=sampleTransition(old,50),next=revise(from,500);
  const proof=animationFrameProvenance(current),index=old.tracks[0].targetIndex;
  assert.equal(proof.positions[index].x.value,50.5);
  for(const [a,b]of [[current,next],[next,current]]){
    const plan=prepare(a,b),track=plan.tracks[0];assert.equal(track.kind,"semantic-point");
    assert.equal(sampleTransition(plan,a===current?0:100),current);
    const middle=sampleTransition(plan,50),meaning=animationFrameProvenance(middle).positions[track.targetIndex];
    assert.equal(meaning.x.value,275.25);
    assert.ok(Math.abs(middle.scene.nodes[track.targetIndex].properties.x-(20+200*Math.log(275.25)/Math.log(1000)))<1e-10);
    assert.notEqual(middle.scene.nodes[track.targetIndex].properties.x,(plan.from.scene.nodes[track.sourceIndex].properties.x+plan.to.scene.nodes[track.targetIndex].properties.x)/2);
    const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(plan)));
    for(const time of [0,25,50,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));
  }
  assert.equal(requireTransitionEndpoint(current),current);
  assert.throws(()=>requireTransitionEndpoint(structuredClone(current)),/ChartProgram/);
});

test("timed exported frames retain authenticity and exact captured endpoint views", () => {
  const from=points(),to=revise(from,100),plan=prepare(from,to);
  for(const time of [0,50,100]){
    const frame=sampleTransition(plan,time),view=withSampleTime(frame,time);
    assert.equal(view.timeMs,time);assert.equal(animationFrameProvenance(view).plan,plan);
    const rebased=prepare(view,to);assert.equal(sampleTransition(rebased,0),view);
    const timed=withSampleTime(sampleTransition(rebased,0),0,rebased);
    assert.equal(timed.timeMs,0);assert.equal(animationFrameProvenance(timed).plan,rebased);
    const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(rebased)));
    assert.deepEqual(sampleTransition(restored,0),view);
    assert.deepEqual(sampleTransition(restored,40),sampleTransition(rebased,40));
  }
  assert.throws(()=>withSampleTime({},0),/authentic/);
  assert.throws(()=>withSampleTime(sampleTransition(plan,50),51),/authentic/);
  assert.throws(()=>withSampleTime(sampleTransition(plan,50),50,prepare(from,from)),/belong/);
});

test("repeated topology interruption flattens weighted sources and preserves node identity", () => {
  const from=points(),changed=from.editPointMark({shape:"diamond"}),first=sampleTransition(prepare(from,changed),50);
  const rebased=prepare(first,from),second=sampleTransition(rebased,50),index=rebased.tracks[0].targetIndex;
  assert.equal(second.scene.nodes[index].type,"weighted-blend");
  assert.deepEqual(second.scene.nodes[index].properties.sources.map(s=>s.weight),[.25,.25,.5]);
  assert.ok(second.scene.nodes[index].properties.sources.every(s=>s.type!=="weighted-blend"));
  assert.equal(animationFrameProvenance(second).positions[index],null);
  const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(rebased)));
  assert.deepEqual(sampleTransition(restored,50),second);
  assert.equal(sampleTransition(rebased,0),first);
  let current=first;
  assert.throws(()=>{
    for(let i=0;i<70;i++)current=sampleTransition(prepare(current,from),50);
  },/sources|clips/);
  assert.deepEqual(sampleTransition(rebased,50),second);
});

test("nested enter and exit frames retain keyed correspondence at the actual displayed state", () => {
  const p=points(),next=p.reviseData({source:"rows",id:"next",values:[{id:"b",x:20,y:30},{id:"new",x:10,y:40}]});
  const wrap=value=>hconcat({id:"pair",programs:[{id:"left",program:value},{id:"right",program:p}]});
  const first=prepare(wrap(p),wrap(next)),current=sampleTransition(first,40),rebased=prepare(current,wrap(p));
  assert.equal(new Set(rebased.from.identities.filter(Boolean).map(i=>i.key)).size,5);
  assert.equal(sampleTransition(rebased,0),current);
  assert.equal(rebased.tracks.length,4);
  assert.equal(rebased.exits.length,1);
  const restored=restoreTransitionPlan(structuredClone(exportTransitionPlan(rebased)));
  assert.deepEqual(sampleTransition(restored,60),sampleTransition(rebased,60));
});

test("sampled endpoint restoration rejects identity, view, topology and semantic corruption", () => {
  const p=points(),current=sampleTransition(prepare(p,revise(p,100)),50),payload=exportTransitionPlan(prepare(current,p));
  const mutations=[v=>{v.from.scene.extra=1;},v=>{v.from.scene.nodes[1].extra=1;},v=>{delete v.from.scene.nodes[1].topology;},
    v=>{v.from.identities.pop();},v=>{v.from.backgrounds[0].index=1;},v=>{v.from.backgrounds.push({...v.from.backgrounds[0]});},
    v=>{v.from.view.extra=true;},v=>{v.from.view.progress=2;},v=>{v.from.view.timeMs=Infinity;},
    v=>{v.from.view.decisions.pop();},v=>{v.from.view.decisions=[];},v=>{v.from.view.progress=0;},v=>{v.from.view.decisions[1].kernel="other";},v=>{v.from.view.decisions[1].kind="other";},
    v=>{v.from.view.decisions[1].sourceIndex=-1;},v=>{v.from.view.decisions[1].itemKey="other";},
    v=>{v.from.positions[1].x.value=1;},v=>{v.from.scene.nodes[1].properties.x=1;}];
  for(const mutate of mutations){const value=structuredClone(payload);mutate(value);assert.throws(()=>restoreTransitionPlan(value),mutate.toString());}
  const fade=exportTransitionPlan(prepare(sampleTransition(prepare(p,p.editPointMark({fill:"red"})),50),p));
  fade.from.view.decisions.forEach(d=>assert.ok(Object.isFrozen(d)));
  const changed=structuredClone(fade);changed.from.view.decisions[1].reason="";assert.throws(()=>restoreTransitionPlan(changed),/reason/);
  const primitive=structuredClone(payload);primitive.from.view.decisions[1]={...primitive.from.view.decisions[1],kind:"crossfade",reason:"appearance"};delete primitive.from.view.decisions[1].kernel;
  assert.throws(()=>restoreTransitionPlan(primitive),/concrete primitive/);
  assert.deepEqual(exportTransitionPlan(restoreTransitionPlan(structuredClone(payload))),payload);
});
