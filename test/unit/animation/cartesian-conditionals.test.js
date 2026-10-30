import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";

const values=[{id:"a",x:1,y:1,alt:100,upper:200,c:"A"},{id:"b",x:2,y:10,alt:400,upper:600,c:"B"}];
const when={version:2,registry:"standard@1",root:{type:"parameter",id:"active"}};
const scale={id:"measure",type:"log",domain:[1,1000],nice:false};
const conditional=(extra={})=>({conditions:[{when,value:{field:"alt",fieldType:"quantitative",scale,...extra}}],
  otherwise:{field:"y",fieldType:"quantitative",scale,...extra}});
const base=()=>chart().createCanvas({width:300,height:200,margin:20})
  .createData({id:"d",keyField:"id",values}).createParameter({id:"active",value:false});
const options={durationMs:100,easing:"linear"};

test("conditional rows and ordered series interpolate chosen semantic values on the native log scale",()=>{
  const builds={
    rule:p=>p.createRuleMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"}).encodeY(conditional()).encodeY2({field:"upper",fieldType:"quantitative",scale:{id:"measure"}}),
    rect:p=>p.createRectMark({id:"m"}).encodeXRange({lower:"x",upper:{datum:3},fieldType:"quantitative"}).encodeYRange({lower:"y",upper:"upper",fieldType:"quantitative",scale}).encodeY(conditional()),
    line:p=>p.createLineMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"}).encodeY(conditional()),
    area:p=>p.createAreaMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"}).encodeYRange({lower:"y",upper:"upper",fieldType:"quantitative",scale}).encodeY(conditional())
  };
  for(const [name,build] of Object.entries(builds)) {
    const from=build(base()), before=from.graphicSpec, to=from.editParameter({target:"active",value:true});
    const plan=planTransition({from,to,options});
    assert.ok(plan.tracks.every(track=>["semantic-cartesian","exact"].includes(track.kind)),name);
    const current=sampleTransition(plan,50), tracks=plan.tracks.filter(track=>track.kind==="semantic-cartesian");
    assert.ok(tracks.length>0,name);
    const expected=20+160*(1-Math.log(50.5)/Math.log(1000));
    const node=current.scene.nodes[current.decisions.findIndex(decision=>decision.kernel==="cartesian-geometry")];
    const ys=node.type==="line"?[node.properties.y1,node.properties.y2]:node.type==="rect"?[node.properties.y,node.properties.y+node.properties.height]:node.properties.commands.map(command=>command.y).filter(Number.isFinite);
    assert.ok(ys.some(y=>Math.abs(y-expected)<1e-10),`${name}: ${JSON.stringify(ys)} versus ${expected}`);
    assert.equal(sampleTransition(plan,0).graphicSpec,before);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
    assert.equal(from.graphicSpec,before);
    const saved=deserializeAnimation(serializeAnimation(plan)).plan;
    assert.deepEqual(sampleTransition(saved,50),current,name);
    const rebase=planTransition({from:current,to:from,options});
    assert.equal(sampleTransition(rebase,0),current);
    assert.ok(rebase.tracks.some(track=>track.kind==="semantic-cartesian"),name);
  }
});

test("aggregate conditional bars preserve selected measure scale and exact native cells",()=>{
  const from=base().createBarMark({id:"m"}).encodeX({field:"c",fieldType:"nominal"})
    .encodeY({conditions:[{when,value:{field:"alt",aggregate:"sum",scale:{id:"linear",domain:[0,500],nice:false}}}],
      otherwise:{field:"y",aggregate:"sum",scale:{id:"linear",domain:[0,500],nice:false}}});
  const to=from.editParameter({target:"active",value:true}), plan=planTransition({from,to,options});
  assert.ok(plan.tracks.every(track=>track.kind==="semantic-cartesian"));
  const frame=sampleTransition(plan,50), first=frame.scene.nodes[frame.decisions.findIndex(decision=>decision.kernel==="cartesian-geometry")];
  assert.ok(Math.abs(first.properties.height-160*50.5/500)<1e-10);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
});

test("conditional branch switches retain explicit mapping incompatibility instead of pixel interpolation",()=>{
  const from=base().createLineMark({id:"m"}).encodeY({field:"y"})
    .encodeX({conditions:[{when,value:{field:"alt",scale:{id:"log",type:"log",domain:[1,1000],nice:false}}}],
      otherwise:{field:"y",scale:{id:"linear",domain:[0,500],nice:false}}});
  const plan=planTransition({from,to:from.editParameter({target:"active",value:true}),options});
  assert.equal(plan.tracks[0].kind,"crossfade");
  assert.equal(plan.tracks[0].reason,"scale-type");
});
