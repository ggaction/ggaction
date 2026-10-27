import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";

const values = [0, 29];
const labelMap = [{ value: 0, label: "Start" }, { value: 29, label: "Last" }];
const profile = {schemaVersion:1,id:"edge-label-widths",measurements:["Start","Last"].map(text=>({text,fontFamily:"sans-serif",fontSize:10,fontWeight:400,fontStyle:"normal",width:22.25}))};
function base() {
  return chart().createCanvas({width:420,height:300,margin:60})
    .applyTextMetrics({profile}).createData({values:[{x:0,y:0},{x:30,y:30}]})
    .createLinePlot({x:{field:"x",scale:{domain:[0,30]}},y:{field:"y",scale:{domain:[0,30]}},guides:false});
}
const axis = (threshold, extra={})=>({title:false,ticksAndLabels:{values,labels:{fontSize:10,fontFamily:"sans-serif",flush:true,labelMap,...(threshold===undefined?{}:{flushThreshold:threshold}),...extra}}});
const items = (p,c="x")=>p.graphicSpec.objects[`${c}AxisLabels`].items.map(i=>i.properties);

test("threshold selects mapped ticks rather than overflowing text bounds and keeps legacy output",()=>{
  const legacy=base().createXAxis(axis()), limited=base().createXAxis(axis(1));
  assert.equal(items(legacy)[1].x,348.875);
  assert.equal(items(limited)[1].x,350);
  assert.equal(items(limited)[0].x,71.125);
  assert.deepEqual(items(base().createXAxis(axis(0))),items(limited));
  assert.deepEqual(items(base().createXAxis(axis(9.999))),items(limited));
  assert.deepEqual(items(base().createXAxis(axis(10))),items(legacy));
  assertEquivalentMeaning(legacy.semanticSpec,limited.semanticSpec);
  assert.deepEqual(limited.resolvedScales.x.domain,[0,30]);
  assert.equal(limited.graphicSpec.objects.xAxisTicks.items.length,2);
});

test("complete, focused, grouped, whole-axis and plot-facade edits converge immutably",()=>{
  const p=base().createXAxis(axis()), snapshot=serializeProgram(p), direct=base().createXAxis(axis(1));
  for(const edited of [p.editXAxisLabels({flushThreshold:1}),p.editXAxisTicksAndLabels({labels:{flushThreshold:1}}),p.editXAxis({labels:{flushThreshold:1}}),p.editXAxis({ticksAndLabels:{labels:{flushThreshold:1}}})]) assertEquivalentMeaning(edited.graphicSpec,direct.graphicSpec);
  const facade=chart().createCanvas({width:420,height:300,margin:60}).applyTextMetrics({profile}).createData({values:[{x:0,y:0},{x:30,y:30}]}).createLinePlot({x:{field:"x",scale:{domain:[0,30]}},y:{field:"y",scale:{domain:[0,30]}},guides:{axes:{x:axis(1),y:false},grid:false,legend:false}});
  assertEquivalentMeaning(facade.graphicSpec,direct.graphicSpec);
  assert.equal(serializeProgram(p),snapshot);
});

test("omission preserves threshold, auto removes it and disabled flushing keeps dormant intent",()=>{
  const p=base().createXAxis(axis(1));
  assert.equal(p.editXAxisLabels({color:"red"}).guideConfigs.axis.x.labels.flushThreshold,1);
  const reset=p.editXAxisLabels({flushThreshold:"auto"});
  assert.equal(Object.hasOwn(reset.guideConfigs.axis.x.labels,"flushThreshold"),false);
  assertEquivalentMeaning(reset.graphicSpec,base().createXAxis(axis()).graphicSpec);
  assertEquivalentMeaning(base().createXAxis(axis("auto")).graphicSpec,reset.graphicSpec);
  const disabled=p.editXAxisLabels({flush:false});
  assert.equal(disabled.guideConfigs.axis.x.labels.flushThreshold,1);
  assert.deepEqual(disabled.editXAxisLabels({flush:true}).graphicSpec,p.graphicSpec);
});

test("vertical, reversed and displaced ranges use the same mapped-position policy",()=>{
  const labels={fontSize:10,flush:true,values:[0,29.5]};
  const y=base().createYAxis({title:false,ticksAndLabels:{values:labels.values,labels:{fontSize:10,flush:true,flushThreshold:1}}});
  const legacy=base().createYAxis({title:false,ticksAndLabels:{values:labels.values,labels:{fontSize:10,flush:true}}});
  assert.notEqual(items(y,"y")[1].y,items(legacy,"y")[1].y);
  const p=base().createXAxis(axis(1,{alongOffset:4}));
  assert.equal(items(p)[1].x,354);
  const replay=p.editCanvas({width:450}).editXScale({reverse:true});
  const direct=base().editCanvas({width:450}).editXScale({reverse:true}).createXAxis(axis(1,{alongOffset:4}));
  assertEquivalentMeaning(replay.graphicSpec,direct.graphicSpec);
});

test("wrapped lines move as one eligible tick group",()=>{
  const p=base().createXAxis(axis(1,{labelMap:[{value:0,label:"Long start"},{value:29,label:"Long last"}],maxWidth:30,wrap:"word",lineHeight:10}));
  const unflushed=p.editXAxisLabels({flush:false});
  const a=items(p),b=items(unflushed);
  assert.equal(a.length,4);
  assert.equal(a[0].x-b[0].x,a[1].x-b[1].x);
  assert.equal(a[2].x,b[2].x);assert.equal(a[3].x,b[3].x);
});

test("editable persistence retains threshold and rejects noncanonical stored values",()=>{
  const p=base().createXAxis(axis(1)), restored=deserializeProgram(serializeProgram(p));
  assert.equal(restored.guideConfigs.axis.x.labels.flushThreshold,1);
  assertEquivalentMeaning(restored.editXAxisLabels({flushThreshold:"auto"}).graphicSpec,base().createXAxis(axis()).graphicSpec);
  for(const invalid of [-1,Infinity,"auto",null]) {
    const envelope=JSON.parse(serializeProgram(p)),state=decodeValue(envelope.payload);
    state.materializationConfigs.guides.axis.x.labels.flushThreshold=invalid;
    envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/flushThreshold|finite|Invalid/);
  }
});

test("invalid requests fail atomically and threshold does not authorize rotated flushing",()=>{
  const p=base().createXAxis(axis(1)), snapshot=serializeProgram(p);
  for(const value of [-1,NaN,Infinity,-Infinity,null,true,"1",{},[]]) {
    assert.throws(()=>p.editXAxisLabels({flushThreshold:value}),/flushThreshold|finite/);
    assert.throws(()=>base().createXAxis(axis(value)),/flushThreshold|finite/);
  }
  assert.throws(()=>p.editXAxisLabels({rotation:.1}),/unrotated/);
  assert.equal(serializeProgram(p),snapshot);
});

test("excluding a near-edge tick never bypasses Canvas bounds or ordinary overlap checks",()=>{
  const p=base().editCanvas({margin:{left:60,right:0,top:60,bottom:60}});
  assert.throws(()=>p.createXAxis({title:false,ticksAndLabels:{values:[0,29.9],labels:{fontSize:10,flush:true,flushThreshold:0}}}),/Canvas|margin/);
  assert.throws(()=>base().createXAxis({title:false,ticksAndLabels:{values:[0,.1],labels:{fontSize:10,flush:true,flushThreshold:0}}}),/overlap/);
});
