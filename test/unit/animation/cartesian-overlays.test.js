import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectCartesianAnimationState } from "../../../src/materialization/animation/cartesian.js";
import { resolveCartesianAnimationGeometry } from "../../../src/grammar/animation/cartesianState.js";

const values=[{id:"a",x:1,y:2,c:"A",g:"u"},{id:"b",x:2,y:4,c:"B",g:"u"},
  {id:"c",x:1,y:3,c:"A",g:"v"},{id:"d",x:3,y:8,c:"C",g:"v"}];
const base=()=>chart().createCanvas({width:400,height:300,margin:30}).createData({id:"d",keyField:"id",values});
const options={durationMs:100,easing:"linear"};
function close(actual,expected) {
  if(typeof expected==="number")assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
  else if(expected!==null&&typeof expected==="object") {assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort());for(const key of Object.keys(expected))close(actual[key],expected[key]);}
  else assert.equal(actual,expected);
}
function verify(from,context="") {
  const before=serializeAnimation(planTransition({from,to:from,options}));
  const native=from.editCanvas({width:500,height:350}),endpoint=projectAnimationEndpoint(native),states=projectCartesianAnimationState(native,endpoint);
  const plan=planTransition({from,to:from.editCanvas({width:600,height:400}),options}),frame=sampleTransition(plan,50);
  const overlays=plan.tracks.filter(track=>JSON.parse(track.key)[1]==="overlay");assert.ok(overlays.length);
  for(const track of overlays) {
    assert.equal(track.kind,"semantic-cartesian",`${context}: ${track.reason}`);
    const expected=endpoint.identities.findIndex(identity=>identity?.key===track.key&&identity.role===track.role);
    const actual=frame.decisions.findIndex(decision=>decision.targetIndex===track.targetIndex);
    for(const [key,value] of Object.entries(resolveCartesianAnimationGeometry(states[expected]).properties))close(frame.scene.nodes[actual].properties[key],value);
  }
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
  const rebase=planTransition({from:frame,to:from,options});assert.equal(sampleTransition(rebase,0),frame);
  assert.ok(rebase.tracks.filter(track=>JSON.parse(track.key)[1]==="overlay").every(track=>track.kind==="semantic-cartesian"));
  assert.equal(serializeAnimation(planTransition({from,to:from,options})),before);
}

test("source-follow overlays preserve point and grouped/stacked bar endpoint meanings",()=>{
  for(const type of ["line","point"])for(const horizontal of [false,true]) {
    const category={field:"c",fieldType:"nominal",scale:{reverse:true}},measure={field:"y",fieldType:"quantitative",aggregate:"sum"};
    for(const layout of ["group","stack","fill","diverging","overlay"])for(const series of layout==="stack"?["source","total"]:["source"]) {
      const p=base().createBarMark({id:"m"}).encodeX(horizontal?measure:category).encodeY(horizontal?category:measure)
        .encodeColor({field:"g",fieldType:"nominal",layout}).createOverlay({id:"overlay",source:"m",type,series});
      verify(p,JSON.stringify({type,horizontal,layout,series}));
    }
    verify(base().createPointMark({id:"m"}).encodeX({field:"x"}).encodeY({field:"y",scale:{type:"log",domain:[1,10],nice:false}})
      .createOverlay({id:"overlay",source:"m",type,orderBy:horizontal?"y":"x"}));
  }
});

test("source-follow line, ranged area and density overlays share native order and conditional scales",()=>{
  for(const type of ["line","point"])for(const family of ["line","area","density"])for(const conditional of [false,true]) {
    let p=base();
    if(family==="density")p=p.createDensityPlot({id:"m",field:"y",bandwidth:1,extent:[0,10],steps:8,guides:false});
    else {
      p=p[family==="line"?"createLineMark":"createAreaMark"]({id:"m"}).encodeX({field:"x"}).encodeY({field:"y",fieldType:"quantitative"});
      if(family==="area")p=p.encodeY2({datum:0});
    }
    if(conditional) {
      const value={field:p.semanticSpec.layers[0].encoding.y.field,fieldType:"quantitative",scale:{id:p.semanticSpec.layers[0].encoding.y.scale}};
      p=p.encodeY({target:"m",conditions:[{when:{version:2,registry:"standard@1",root:{type:"literal",value:false}},value}],otherwise:value});
    }
    verify(p.createOverlay({id:"overlay",source:"m",type,line:type==="line"?{curve:"cardinal",tension:.4}:undefined}));
  }
});

test("overlay topology and unsupported glyph anchors retain explicit fade decisions",()=>{
  const from=base().createLineMark({id:"m"}).encodeX({field:"x"}).encodeY({field:"y"}).createOverlay({id:"overlay",source:"m"});
  const changed=from.reviseData({source:"d",id:"next",values:values.map(row=>({...row,y:row.y+1}))});
  const plan=planTransition({from,to:changed,options});
  assert.ok(plan.tracks.filter(track=>JSON.parse(track.key)[1]==="overlay").every(track=>track.kind==="crossfade"&&track.reason==="topology"));
  const source=base().createPointMark({id:"m",shape:"triangle-up"}).encodeX({field:"x"}).encodeY({field:"y"}).createOverlay({id:"overlay",source:"m",orderBy:"x"});
  const unsupported=planTransition({from:source,to:source.editCanvas({width:600}),options});
  assert.ok(unsupported.tracks.filter(track=>JSON.parse(track.key)[1]==="overlay").every(track=>track.kind==="crossfade"&&track.reason==="overlay-position"));
});
