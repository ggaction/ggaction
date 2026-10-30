import assert from "node:assert/strict";
import test from "node:test";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectCartesianAnimationState } from "../../../src/materialization/animation/cartesian.js";
import { prepareCartesianInterpolation, sampleCartesianInterpolation, validateCartesianAnimationState } from "../../../src/grammar/animation/cartesianState.js";
const rows=[{id:"a",x:1,y:2,y2:5,c:"a"},{id:"b",x:2,y:4,y2:7,c:"b"},{id:"c",x:3,y:6,y2:9,c:"c"}];
const base=()=>chart().createCanvas({width:300,height:200,margin:20}).createData({id:"d",keyField:"id",values:rows});
const builders={
  rule:p=>p.createRuleMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"}).encodeY({field:"y",fieldType:"quantitative"}).encodeY2({field:"y2",fieldType:"quantitative"}),
  span:p=>p.createRuleMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"}),
  rect:p=>p.createRectMark({id:"m"}).encodeXRange({lower:"x",upper:{datum:4},fieldType:"quantitative"}).encodeYRange({lower:"y",upper:"y2",fieldType:"quantitative"}),
  band:p=>p.createRectMark({id:"m"}).encodeX({field:"c",fieldType:"nominal"}).encodeY({field:"c",fieldType:"nominal"}),
  bar:p=>p.createBarMark({id:"m"}).encodeX({field:"c",fieldType:"nominal"}).encodeY({field:"y",aggregate:"sum"}),
  line:p=>p.createLineMark({id:"m"}).encodeX({field:"x"}).encodeY({field:"y"}),
  area:p=>p.createAreaMark({id:"m"}).encodeX({field:"x"}).encodeYRange({lower:"y",upper:"y2"})
};
const projection=program=>{const endpoint=projectAnimationEndpoint(program);return{endpoint,states:projectCartesianAnimationState(program,endpoint)};};

test("native rule, ranges, cells, bars and ordered series have exact forward semantic proofs",()=>{
  for(const [name,build] of Object.entries(builders)) {
    const program=build(base()),before=program.graphicSpec,{endpoint,states}=projection(program);
    for(let i=0;i<states.length;i++) {
      validateCartesianAnimationState(states[i],endpoint.identities[i],endpoint.scene.nodes[i]);
      if(endpoint.identities[i]!==undefined)assert.equal(states[i].reason,undefined,name);
    }
    assert.equal(program.graphicSpec,before);assert.ok(Object.isFrozen(states));
  }
});

test("native revision samples rule, bar and series meanings without re-running a program",()=>{
  for(const name of ["rule","rect","bar","line","area"]) {
    const from=builders[name](base()),to=from.reviseData({source:"d",id:"revised",values:rows.map(row=>({...row,y:row.y+2,y2:row.y2+2}))});
    const a=projection(from),b=projection(to);
    a.states.forEach((state,i)=>{
      if(state.reason)return;
      const prepared=prepareCartesianInterpolation(state,b.states[i]);assert.equal(prepared.kind,"cartesian",name);
      const middle=sampleCartesianInterpolation(prepared,.5);assert.equal(middle.kind,"cartesian",name);
      assert.equal(middle.state.points[0].y.value,(state.points[0].y.value+b.states[i].points[0].y.value)/2);
      validateCartesianAnimationState(middle.state,b.endpoint.identities[i],{...b.endpoint.scene.nodes[i],type:middle.type,properties:middle.properties});
    });
  }
});

test("geometry edits cannot be mistaken for stored meaning and reordered series fade explicitly",()=>{
  const from=builders.line(base()),a=projection(from),i=a.states.findIndex(state=>state.kind==="line");
  const edited=from.editGraphics({target:"m",property:"commands",value:[[{op:"M",x:1,y:2},{op:"L",x:3,y:4}]]});
  assert.equal(projection(edited).states[i].reason,"edited-position");
  const to=from.reviseData({source:"d",id:"reverse",values:rows.map(row=>({...row,x:4-row.x}))});
  assert.equal(prepareCartesianInterpolation(a.states[i],projection(to).states[i]).reason,"series-grid");
  const broken=structuredClone(a.states[i]);broken.points[0].y.value+=1;
  assert.throws(()=>validateCartesianAnimationState(broken,a.endpoint.identities[i],a.endpoint.scene.nodes[i]),/differs/);
});

test("grouped and stacked bars reuse their native category and offset placement",()=>{
  const values=[{id:"a",c:"A",g:"u",y:2},{id:"b",c:"A",g:"v",y:4},{id:"c",c:"B",g:"u",y:3},{id:"d",c:"B",g:"v",y:5}];
  for(const layout of ["group","stack","fill","diverging","overlay"]) {
    const program=chart().createCanvas({width:320,height:220}).createData({id:"d",keyField:"id",values})
      .createBarPlot({id:"m",x:"c",y:{field:"y",aggregate:"sum"},color:{field:"g",layout},guides:false});
    const a=projection(program),b=projection(program.editCanvas({width:500}));
    a.states.forEach((state,i)=>{if(a.endpoint.identities[i]===undefined)return;
      assert.equal(state.reason,undefined,layout);
      const plan=prepareCartesianInterpolation(state,b.states[i]);assert.equal(plan.kind,"cartesian",layout);
      assert.equal(sampleCartesianInterpolation(plan,.5).kind,"cartesian",layout);
    });
  }
});


test("public Cartesian plans retain meaning through offline restore and interruption",()=>{
  for(const name of ["rule","rect","band","bar","line","area"]) {
    const from=builders[name](base()),to=from.reviseData({source:"d",id:"next",values:rows.map(row=>({...row,y:row.y+2,y2:row.y2+2}))}).editCanvas({width:400});
    const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}});
    assert.ok(plan.tracks.some(track=>track.kind==="semantic-cartesian"),name);
    const current=sampleTransition(plan,40);
    assert.ok(current.decisions.some(decision=>decision.kernel==="cartesian-geometry"),name);
    const restored=deserializeAnimation(serializeAnimation(plan)).plan;
    for(const time of [0,25,40,80,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time),name);
    const rebased=planTransition({from:current,to:from,options:{durationMs:60,easing:"linear"}});
    assert.equal(sampleTransition(rebased,0),current);
    assert.ok(rebased.tracks.some(track=>track.kind==="semantic-cartesian"),name);
    const saved=deserializeAnimation(serializeAnimation(rebased)).plan;
    assert.deepEqual(sampleTransition(saved,30),sampleTransition(rebased,30),name);
  }
});

test("histogram native count/stack/group values retain exact bins and slot geometry",()=>{
  const values=[{id:"a",v:1,g:"u"},{id:"b",v:1.5,g:"v"},{id:"c",v:2.5,g:"u"},{id:"d",v:3,g:"v"}];
  for(const layout of ["group","stack","fill","overlay"]) {
    const from=chart().createCanvas({width:300,height:200}).createData({id:"d",keyField:"id",values})
      .createHistogram({id:"m",field:"v",binBoundaries:[0,2,4],color:{field:"g",layout},guides:false});
    const to=from.editCanvas({width:500,height:300}),a=projection(from),b=projection(to);
    a.states.forEach((state,i)=>{if(a.endpoint.identities[i]===undefined)return;assert.equal(state.kind,"histogram",layout);
      assert.equal(sampleCartesianInterpolation(prepareCartesianInterpolation(state,b.states[i]),.5).kind,"cartesian",layout);});
    const plan=planTransition({from,to,options:{durationMs:100}}),saved=deserializeAnimation(serializeAnimation(plan)).plan;
    assert.deepEqual(sampleTransition(saved,50),sampleTransition(plan,50));
  }
});

test("native line curves and Area layout endpoints use the same sample geometry through resize",()=>{
  for(const curve of ["linear","step","step-before","step-after","basis","cardinal","monotone","monotone-steffen","natural"]) {
    const from=builders.line(base()).editLineMark({curve,...(curve==="cardinal"?{tension:.4}:{})});
    const to=from.reviseData({source:"d",id:"next",values:rows.map(row=>({...row,y:row.y+2}))});
    const plan=planTransition({from,to,options:{durationMs:100}});
    assert.equal(plan.tracks[0].kind,"semantic-cartesian",curve);
    const mid=sampleTransition(plan,50);assert.ok(mid.decisions.some(decision=>decision.kernel==="cartesian-geometry"),curve);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),mid);
  }
  const values=["a","b"].flatMap((g,index)=>[2,4,3].map((v,x)=>({id:`${g}:${x}`,x,g,v:v+index})));
  for(const layout of ["overlay","stack","fill","center","wiggle"]) {
    const from=chart().createCanvas({width:400,height:250}).createData({id:"d",values,keyField:"id"})
      .createAreaPlot({id:"m",x:"x",y:"v",groupBy:"g",layout,guides:false});
    const to=from.reviseData({source:"d",id:"next",values:values.map(row=>({...row,v:row.v*2}))});
    const plan=planTransition({from,to,options:{durationMs:100}});
    assert.ok(plan.tracks.every(track=>["semantic-cartesian","exact"].includes(track.kind)),layout);
    const mid=sampleTransition(plan,50);assert.ok(mid.decisions.every(decision=>decision.kind!=="crossfade"),layout);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),mid);
  }
});


test("Basic Cartesian families retain the same typed preparation and offline renderer contract",()=>{
  const supported=[builders.bar,builders.line,builders.band,
    p=>p.createRectMark({id:"m"}).encodeX({field:"x"}).encodeX2({datum:4,fieldType:"quantitative"}).encodeY({field:"y"}).encodeY2({field:"y2"}),
    p=>p.createHistogram({id:"m",field:"x",binBoundaries:[0,2,4],guides:false})];
  for(const build of supported) {
    const from=build(basicChart().createCanvas({width:300,height:200}).createData({id:"d",keyField:"id",values:rows}));
    const {endpoint,states}=projection(from);
    states.forEach((state,index)=>{if(endpoint.identities[index]!==undefined)assert.equal(state.reason,undefined);});
    const to=["bar","line"].includes(from.semanticSpec.layers[0].mark.type)
      ?from.encodeY({target:"m",field:"y",scale:{domain:[0,20],nice:false},...(from.semanticSpec.layers[0].mark.type==="bar"?{aggregate:"sum"}:{})}):from;
    const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),frame=sampleTransition(plan,50);
    if(to!==from)assert.ok(frame.decisions.some(decision=>decision.kernel==="cartesian-geometry"));
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
    assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);
    assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  }
});
