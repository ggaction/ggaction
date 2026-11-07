import assert from "node:assert/strict";
import test from "node:test";
import { chart,hconcat } from "../../../src/index.js";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames } from "../../../src/animation.js";
import { exportTransitionPlan,restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectPolarAnimationState } from "../../../src/materialization/animation/polar.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { preparePolarTrack } from "../../../src/animation/polarTracks.js";
const rows=[{id:1,t:20,r:30,c:"A"},{id:"1",t:130,r:50,c:"B"},{id:3,t:250,r:70,c:"C"}];
const base=()=>chart().createCanvas({width:300,height:300,margin:20}).createData({id:"d",values:rows,keyField:"id"});
const theta={field:"t",scale:{domain:[0,360],nice:false}},radius={field:"r",scale:{domain:[0,100],nice:false}};
const builders={point:p=>p.createPointMark({id:"m"}).encodeTheta(theta).encodeR(radius),line:p=>p.createLineMark({id:"m",closed:true}).encodeTheta(theta).encodeR(radius),
  pie:p=>p.createArcMark({id:"m",innerRadius:.25,padAngle:2}).encodeTheta({field:"r"}),
  radial:p=>p.createArcMark({id:"m"}).encodeTheta({field:"c",fieldType:"nominal"}).encodeR(radius),
  measured:p=>p.createArcMark({id:"m"}).encodeTheta({field:"c",fieldType:"nominal"}).encodeR({...radius,aggregate:"sum",mapping:"area"})};
const plan=(from,to)=>planTransition({from,to,options:{durationMs:100,easing:"linear"}});
const revise=p=>p.reviseData({source:"d",id:"next",values:rows.map(row=>({...row,t:row.t+10,r:row.r+10}))});
test("native polar point, ordered line, proportional and radial sectors sample and restore exact meaning",()=>{
  for(const [name,build]of Object.entries(builders)){
    const from=build(base()),to=revise(from),p=plan(from,to),before=from.graphicSpec;
    assert.ok(p.tracks.every(t=>t.kind==="semantic-polar"),`${name}: ${JSON.stringify(p.tracks.map(t=>[t.kind,t.reason]))}`);
    const middle=sampleTransition(p,50);assert.ok(middle.decisions.some(d=>d.kernel==="polar-geometry"));
    const restored=deserializeAnimation(serializeAnimation(p)).plan;
    for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(p,time),name);
    const next=plan(middle,from);assert.equal(sampleTransition(next,0),middle);
    assert.ok(next.tracks.every(t=>t.kind==="semantic-polar"),name);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(next)).plan,50),sampleTransition(next,50),name);
    const exported=exportAnimationFrames(next,{timesMs:[0,50,100]});assert.equal(sampleTransition(plan(exported[0],to),0),exported[0]);
    assert.equal(from.graphicSpec,before);
  }
});
test("same native polar ranges resize and nested current frames preserve unwrapped coordinates without plan retention",()=>{
  const point=builders.point(base()),line=builders.line(base()),combine=(a,b)=>hconcat({id:"outer",programs:[{id:"points",program:a},{id:"line",program:b}]});
  const from=combine(point,line),to=combine(revise(point).editCanvas({width:400,height:400}),revise(line).editCanvas({width:400,height:400}));
  let p=plan(from,to);
  for(let i=0;i<20;i++){
    const frame=sampleTransition(p,40),proof=animationFrameProvenance(frame);assert.equal(Object.hasOwn(proof,"plan"),false);
    assert.equal(proof.polars.length,frame.scene.nodes.length);assert.ok(frame.decisions.some(d=>d.kernel==="polar-geometry"));
    p=plan(frame,i%2?to:from);assert.equal(sampleTransition(p,0),frame);
  }
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(p)).plan,50),sampleTransition(p,50));
});
test("polar mapping, order, appearance and authored geometry changes remain explicit fallbacks",()=>{
  const point=builders.point(base()),line=builders.line(base());
  assert.equal(plan(point,point.encodeR({...radius,scale:{domain:[0,200],nice:false}})).tracks[0].reason,"polar-mapping");
  assert.equal(plan(line,line.editLineMark({closed:false})).tracks[0].reason,"geometry-policy");
  assert.equal(plan(line,line.editLineMark({stroke:"red"})).tracks[0].kind,"semantic-polar");
  assert.equal(plan(line,line.editLineMark({stroke:"red"})).tracks[0].appearance.entries[0].key,"stroke");
  assert.equal(plan(line,line.reviseData({source:"d",id:"next",values:rows.map(r=>({...r,t:360-r.t}))})).tracks[0].reason,"topology");
  const edited=point.editGraphics({target:"m",property:"x",value:[10,20,30]});assert.equal(plan(point,edited).tracks[0].reason,"edited-position");
  const e=projectAnimationEndpoint(point),wrong=structuredClone(e);wrong.identities.find(Boolean).lineage.rowKeys=[];
  assert.throws(()=>projectPolarAnimationState(point,wrong),/exact final item/);
});
test("strict polar restore rejects kernel, geometry, membership, cardinality, accessors and forged sampled decisions",()=>{
  const from=builders.line(base()),p=plan(from,revise(from)),payload=exportTransitionPlan(p),i=payload.from.polars.findIndex(v=>v.kind);
  for(const change of [v=>v.kernels.polar="future",v=>delete v.kernels.polar,v=>v.from.polars.pop(),v=>v.from.polars[i].points[0].theta++,v=>v.from.polars[i].grid[0]=["foreign"],v=>v.from.polars[i].policy.extra=true,v=>v.from.polars[i]={reason:"anonymous"}]){
    const v=structuredClone(payload);change(v);assert.throws(()=>restoreTransitionPlan(v));
  }
  let reads=0;const getter=structuredClone(payload);Object.defineProperty(getter.from.polars[i],"points",{enumerable:true,get(){reads++;return [];}});assert.throws(()=>restoreTransitionPlan(getter),/accessors/);assert.equal(reads,0);
  const current=sampleTransition(p,50),rebased=structuredClone(exportTransitionPlan(plan(current,from)));
  rebased.from.view.decisions.find(d=>d.kernel==="polar-geometry").kernel="cartesian-point";assert.throws(()=>restoreTransitionPlan(rebased));
  assert.deepEqual(sampleTransition(restoreTransitionPlan(payload),50),current);
});

test("categorical polar lines and aggregate sectors retain native groups while unsupported source states stay explicit",()=>{
  for(const from of [base().createLineMark({id:"m"}).encodeTheta({field:"c",fieldType:"nominal"}).encodeR(radius),base().createArcMark({id:"m"}).encodeTheta({field:"c",aggregate:"sum",weight:"r"})]){
    assert.ok(plan(from,revise(from)).tracks.every(t=>t.kind==="semantic-polar"));
  }
  const from=builders.point(base()),projection=p=>projectPolarAnimationState(p,projectAnimationEndpoint(p));
  assert.ok(projection(new ChartProgram({graphicSpec:from.graphicSpec})).some(v=>v.reason==="semantic-unavailable"));
  assert.ok(projection(from.editSemantic({property:"layer[m].encoding.radius",remove:true})).some(v=>v.reason==="incomplete-position"));
  const conditional=from.createParameter({id:"enabled",value:true}).encodeTheta({target:"m",conditions:[{when:{version:2,registry:"standard@1",root:{type:"parameter",id:"enabled"}},value:theta}],otherwise:theta});
  assert.ok(plan(from,conditional).tracks.every(t=>t.reason==="conditional-position"));
  const endpoint=projectAnimationEndpoint(from),index=endpoint.identities.findIndex(Boolean),states=projectPolarAnimationState(from,endpoint),match={sourceIndex:index,targetIndex:index,key:"key",role:"body"};
  for(const [reason,mutate]of [["primitive-kind",n=>n.type="rect"],["clip-topology",n=>n.clips.push([0,0,1,1])],["appearance",n=>n.properties.fill={type:"pattern"}]]){
    const next=structuredClone(endpoint);mutate(next.scene.nodes[index]);assert.equal(preparePolarTrack(match,endpoint,next,states[index],states[index]).reason,reason);
  }
  const foreign=structuredClone(endpoint);foreign.identities[index].role="foreign";assert.equal(projectPolarAnimationState(from,foreign)[index].reason,"primitive-role");
  const dataset=from.semanticSpec.datasets[0];
  assert.throws(()=>projectPolarAnimationState(from._clone({semanticSpec:{...from.semanticSpec,datasets:[{...dataset,values:Array(10001).fill(dataset.values[0])}]}}),endpoint),/10000/);
  const scaleId=from.semanticSpec.layers[0].encoding.theta.scale;
  assert.throws(()=>projectPolarAnimationState(from._clone({resolvedScales:{...from.resolvedScales,[scaleId]:{...from.resolvedScales[scaleId],domain:["x".repeat(4_000_000)]}}}),endpoint),/mapping work/);
});
