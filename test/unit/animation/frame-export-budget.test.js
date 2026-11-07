import test from "node:test";
import assert from "node:assert/strict";
import { collectAnimationFrameViews } from "../../../src/animation/frames.js";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, exportAnimationFrames } from "../../../src/animation.js";
import { sampleTransitionWithBudget } from "../../../src/animation/sample.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";
import { serializeProgram } from "../../../src/persistence.js";

test("frame export charges actual intermediate nodes before exposing a batch", () => {
  // Sparse arrays stand for already-produced frames: no geometry algorithm or
  // endpoint estimate participates in this independent cumulative-work oracle.
  const frame = length => Object.freeze({ scene: Object.freeze({ nodes: Object.freeze(Array(length)) }) });
  const a=frame(4_000_000),b=frame(6_000_000),empty=frame(0),times=Object.freeze([0,1,2]);
  assert.deepEqual(collectAnimationFrameViews([0,1],time=>[a,b][time]),[a,b]);
  let calls=0, published;
  assert.throws(()=>{published=collectAnimationFrameViews(times,time=>{calls++;return[a,b,empty][time];});},/work.*10000000|10,000,000|exceeds/i);
  assert.equal(calls,3);assert.equal(published,undefined);assert.deepEqual(times,[0,1,2]);
  assert.equal(a.scene.nodes.length,4_000_000);assert.equal(b.scene.nodes.length,6_000_000);
});

test("empty output still charges native preparation across a bounded long schedule", () => {
  const empty=Object.freeze({scene:Object.freeze({nodes:Object.freeze([])})});
  const times=Object.freeze(Array.from({length:10_000},(_,i)=>i));
  // Each frame consumes 999 native work units plus its minimum output visit.
  // These literal costs test the cumulative owner independently of a layout.
  assert.equal(collectAnimationFrameViews(times,(_,account)=>{account(999);return empty;}).length,10_000);
  let calls=0,published;
  assert.throws(()=>{published=collectAnimationFrameViews(times,(_,account)=>{calls++;account(1_000);return empty;});},/work.*10000000|exceeds/i);
  assert.equal(calls,9_991);assert.equal(published,undefined);
  assert.equal(empty.scene.nodes.length,0);assert.equal(times.length,10_000);assert.equal(times[9_999],9_999);
});

test("internal budgeted sampling preserves complete public frames and adds empty-axis and Geo work", () => {
  const axis=chart().createCanvas({width:300,height:300,margin:50}).createData({values:[{x:0,y:0},{x:1,y:1}]})
    .createPointMark().encodeX({field:"x"}).encodeY({field:"y"})
    .createXAxis({line:false,title:false,ticksAndLabels:{values:[0,1],labels:{maxWidth:20,labelMap:[{value:0,label:""},{value:1,label:""}]}}});
  const geo=chart().createCanvas({width:300,height:300,margin:0}).createGeometryData({id:"places",format:"geojson",coordinateKind:"geographic",featureKey:"id",values:{type:"FeatureCollection",features:[{type:"Feature",id:"a",properties:{},geometry:{type:"Point",coordinates:[0,0]}}]}})
    .createProjection({id:"map",type:"orthographic",scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[300,300]]}).createCoordinate({type:"geo"}).createGeoPointMark({id:"places-mark"});
  const wrap=(a,g)=>hconcat({id:"pair",programs:[{id:"axis",program:a},{id:"map",program:g}]});
  const a=axis.editCanvas({width:400}),g=geo.editProjection({translatePx:[500,150]});
  const options={durationMs:100,easing:"linear"},prepare=(from,to)=>planTransition({from,to,options});
  const axisPlan=prepare(axis,a),geoPlan=prepare(geo,g),from=wrap(axis,geo),to=wrap(a,g),plan=prepare(from,to),before=serializeProgram(from);
  function measured(p,time=50){let work=0;const frame=sampleTransitionWithBudget(p,time,amount=>{work+=amount;});assert.deepEqual(frame,sampleTransition(p,time));return {frame,work};}
  const empty=measured(axisPlan),geographic=measured(geoPlan),combined=measured(plan);
  assert.equal(animationFrameProvenance(empty.frame).axislabels.items.filter(Boolean).length,0);assert.ok(empty.work>0);assert.ok(geographic.work>0);
  assert.equal(combined.work,empty.work+geographic.work);
  for(const time of [0,25,100])measured(plan,time);
  const total=combined.work+Math.max(1,combined.frame.scene.nodes.length);
  assert.equal(collectAnimationFrameViews([50],(time,account)=>{account(10_000_000-total);return sampleTransitionWithBudget(plan,time,account);}).length,1);
  let published;
  assert.throws(()=>{published=collectAnimationFrameViews([50],(time,account)=>{account(10_000_001-total);return sampleTransitionWithBudget(plan,time,account);});},/work.*10000000|exceeds/i);
  assert.equal(published,undefined);assert.equal(serializeProgram(from),before);
  assert.deepEqual(exportAnimationFrames(plan,{timesMs:[0,50,100]}).map(({timeMs,...frame})=>frame),[0,50,100].map(time=>sampleTransition(plan,time)));
});
