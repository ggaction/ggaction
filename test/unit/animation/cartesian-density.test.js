import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectCartesianAnimationState } from "../../../src/materialization/animation/cartesian.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";

const values=[1,2,3,4,2,3,4,7].map((value,index)=>({id:String(index),value,group:index<4?"A":"B"}));
const base=()=>chart().createCanvas({width:400,height:300,margin:30}).createData({id:"d",keyField:"id",values});
const options={durationMs:100,easing:"linear"};
function verify(from,kind) {
  const endpoint=projectAnimationEndpoint(from),states=projectCartesianAnimationState(from,endpoint);
  states.forEach((state,index)=>{if(endpoint.identities[index]!==undefined)assert.equal(state.kind,kind,JSON.stringify(state));});
  const to=from.editCanvas({width:600,height:500}),plan=planTransition({from,to,options}),frame=sampleTransition(plan,50);
  const reference=projectAnimationEndpoint(from.editCanvas({width:500,height:400}));
  for(const track of plan.tracks) {
    assert.equal(track.kind,"semantic-cartesian");
    const expectedIndex=reference.identities.findIndex(identity=>identity?.key===track.key&&identity.role===track.role);
    const actualIndex=frame.decisions.findIndex(decision=>decision.targetIndex===track.targetIndex);
    assert.deepEqual(frame.scene.nodes[actualIndex].properties.commands,reference.scene.nodes[expectedIndex].properties.commands);
  }
  const restored=deserializeAnimation(serializeAnimation(plan)).plan;
  for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));
  const rebase=planTransition({from:frame,to:from,options});
  assert.equal(sampleTransition(rebase,0),frame);assert.ok(rebase.tracks.every(track=>track.kind==="semantic-cartesian"));
  return plan;
}

test("continuous density samples reuse native horizontal and stacked baseline paths",()=>{
  for(const orientation of ["vertical","horizontal"])for(const curve of ["linear","basis"]) {
    verify(base().createDensityPlot({id:"density",field:"value",densityChannel:orientation==="vertical"?"y":"x",bandwidth:1,extent:[0,8],steps:8,area:{curve},guides:false}),"area-density");
  }
  for(const layout of ["stack","fill","center","wiggle"]) {
    verify(base().createDensityPlot({id:"density",field:"value",groupBy:"group",bandwidth:1,extent:[0,8],steps:8,guides:false}).encodeColor({target:"density",field:"group",fieldType:"nominal",layout}),"area-density");
  }
});

test("categorical density samples preserve native width normalization, side and source grid",()=>{
  for(const orientation of ["vertical","horizontal"])for(const side of orientation==="vertical"?["both","left","right"]:["both","top","bottom"]) {
    const category={field:"group",fieldType:"nominal",scale:{reverse:true}},measure={field:"value",scale:{domain:[0,8],nice:false}};
    const from=base().createViolinPlot({id:"violin",x:orientation==="vertical"?category:measure,y:orientation==="vertical"?measure:category,
      density:{bandwidth:1,extent:[0,8],steps:8,side,width:{band:.8,resolve:"shared"}},guides:false});
    const plan=verify(from,"area-category-density"),payload=structuredClone(exportTransitionPlan(plan));
    const state=payload.from.cartesian.find(state=>state.kind==="area-category-density");
    state.density.maximum*=2;
    assert.throws(()=>restoreTransitionPlan(payload),/differs/);
  }
});
