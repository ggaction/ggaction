import assert from "node:assert/strict";
import test from "node:test";
import { createPartitionFramePlan, samplePartitionFrame, hitPartitionFrame } from "../../../src/materialization/hierarchy/partitionFrames.js";
import { partitionFrameEndpoints } from "../../support/partition-frames.js";
import { expectedBendPoint } from "../../charts/partition-layouts/reference.js";
import { chart } from "../../../src/index.js";
import { rows } from "../../../examples/partition-layouts/fixture.js";
import { serializeProgram } from "../../../src/persistence.js";
const resolved=p=>({graphics:p.graphicSpec.objects.partitionPlot.items});
const plan=(a,b)=>createPartitionFramePlan(a,b,{target:"partitionPlot"});
const body=frame=>frame.groups.flatMap(g=>g.graphics).filter(g=>g.identity.role==="body");

test("bend sampling reuses exact native endpoints and keeps mid-frame hit on rendered paths",()=>{
 const {before,after}=partitionFrameEndpoints(),snapshot=serializeProgram(before),p=plan(before,after);
 assert.equal(p.mode,"bend");
 assert.deepEqual(samplePartitionFrame(p,0).groups[0].graphics,resolved(before).graphics);
 assert.deepEqual(samplePartitionFrame(p,1).groups[0].graphics,resolved(after).graphics);
 assert.deepEqual(samplePartitionFrame(p,.1,{reducedMotion:true}),samplePartitionFrame(p,1));
 const keys=body(samplePartitionFrame(p,0)).map(g=>g.identity.key);
 for(const b of [0,.25,.5,.75,1]) {
  const frame=samplePartitionFrame(p,b);
  assert.deepEqual(body(frame).map(g=>g.identity.key),keys);
  for(const [index,u,v] of [[0,.45,1/6],[1,.3,.5],[2,.1,5/6],[3,.4,5/6],[4,.8,.5]]) {
   const canonical=expectedBendPoint(u,v,b),point={x:canonical.x,y:canonical.y+50*b},hit=hitPartitionFrame(frame,point);
   assert.equal(hit?.key,keys[index],`${b}/${index}`);
  }
  assert.equal(hitPartitionFrame(frame,{x:10,y:10}),null);
 }
 assert.equal(serializeProgram(before),snapshot);
});

test("reversing a bend plan reverses its frames while gaps, clip and label offsets stay concrete",()=>{
 const {before,after}=partitionFrameEndpoints({padding:[2,4],clip:true});
 const shifted=after.editPartitionPlot({labels:{offset:[3,-2]}}),forward=plan(before,shifted),reverse=plan(shifted,before);
 assert.deepEqual(samplePartitionFrame(forward,.75).groups,samplePartitionFrame(reverse,.25).groups);
 const frame=samplePartitionFrame(forward,.5);
 assert.equal(hitPartitionFrame(frame,{x:240,y:100}),null,"frame clip excludes otherwise visible polar area");
 assert.ok(body(frame).every(g=>g.properties.commands.length>4));
 assert.ok(frame.groups[0].graphics.filter(g=>g.type==="text").every(g=>Number.isFinite(g.properties.x)&&Number.isFinite(g.properties.y)));
 const without=partitionFrameEndpoints({labels:false,radiusPolicy:"equal-depth-area"});
 const middle=samplePartitionFrame(plan(without.before,without.after),.5);
 assert.ok(middle.groups[0].graphics.every(g=>g.type==="path"));
 const area=partitionFrameEndpoints({radiusPolicy:"equal-depth-area"});
 assert.ok(samplePartitionFrame(plan(area.before,area.after),.5).groups[0].graphics.some(g=>g.type==="text"));
});

test("incompatible topology, appearance and handedness carry explicit crossfade reasons",()=>{
 const {before,after}=partitionFrameEndpoints();
 for(const [next,reason] of [
  [after.editPartitionPlot({direction:"clockwise"}),"handedness"],
  [after.editPartitionPlot({focus:{key:"A"}}),"visibility"],
  [after.editPartitionPlot({radiusPolicy:"equal-depth-area"}),"radius-policy"],
  [after.editPartitionPlot({clip:true}),"clip"],
  [after.editPartitionPlot({cells:{opacity:.5}}),"appearance"],
  [before,"coordinate-family"]
 ]) {
  const p=plan(before,next);assert.deepEqual([p.mode,p.reason],["crossfade",reason]);
  const frame=samplePartitionFrame(p,.4);assert.deepEqual(frame.groups.map(g=>g.opacity),[.6,.4]);
  assert.deepEqual(samplePartitionFrame(p,.4,{reducedMotion:true}).groups[0].graphics,resolved(next).graphics);
  assert.equal(hitPartitionFrame(frame,{x:10,y:10}),null);
 }
 const fill={type:"pattern",style:"dots",pitch:12};
 const paintedBefore=before.editPartitionPlot({cells:{fill,overrides:[]}}),paintedAfter=after.editPartitionPlot({cells:{fill,overrides:[]}});
 assert.equal(plan(paintedBefore,paintedAfter).reason,"appearance","structured paint origins remain exact in the two native crossfade groups");
});

test("current-frame hit uses body ink and ignores labels, zero opacity and discarded groups",()=>{
 const {before,after}=partitionFrameEndpoints({labels:false});
 const outline=before.editPartitionPlot({cells:{fill:"none",stroke:"red",strokeWidth:4,overrides:[]}});
 const frame=samplePartitionFrame(plan(outline,after),0);
 assert.equal(hitPartitionFrame(frame,{x:90,y:180}).key,body(frame)[0].identity.key);
 assert.equal(hitPartitionFrame(frame,{x:240,y:190}),null);
 const hidden=before.editPartitionPlot({cells:{opacity:0}});
 assert.equal(hitPartitionFrame(samplePartitionFrame(plan(hidden,after),0),{x:240,y:190}),null);
 const faded=structuredClone(samplePartitionFrame(plan(before,before),.5));faded.groups[1].opacity=0;
 assert.equal(hitPartitionFrame(faded,{x:240,y:190}).key,body(faded)[0].identity.key);
});

test("frame preparation and sampling reject invalid state without mutating either endpoint",()=>{
 const {before,after}=partitionFrameEndpoints(),saved=[serializeProgram(before),serializeProgram(after)];
 assert.throws(()=>createPartitionFramePlan(before,after,{target:"missing"}));
 assert.throws(()=>createPartitionFramePlan(before,after,{target:"partitionPlot",extra:true}));
 const point=before.createData({id:"p",values:[{x:1,y:2}]}).createPointMark({id:"point"});
 assert.throws(()=>createPartitionFramePlan(point,point,{target:"point"}),/partition marks/);
 const p=plan(before,after);
 assert.throws(()=>samplePartitionFrame({},.5));assert.throws(()=>samplePartitionFrame(p,NaN));
 assert.throws(()=>samplePartitionFrame(p,.5,{reducedMotion:1}));
 let reads=0;assert.throws(()=>samplePartitionFrame(p,.5,{get reducedMotion(){reads++;return false;}}));assert.equal(reads,0);
 assert.throws(()=>hitPartitionFrame(samplePartitionFrame(p,.5),{x:NaN,y:0}));
 assert.deepEqual([serializeProgram(before),serializeProgram(after)],saved);
});

test("native endpoints preserve displayed highlights and explicit graphic edits",()=>{
 const {before,after}=partitionFrameEndpoints();
 const highlight=p=>p.selectMarks({id:"chosen",target:"partitionPlot",field:"key",op:"eq",value:"A"}).highlightMarks({selection:"chosen",color:"red"});
 const from=highlight(before),to=highlight(after),prepared=plan(from,to);
 assert.equal(prepared.mode,"bend");
 assert.deepEqual(samplePartitionFrame(prepared,0).groups[0].graphics,from.graphicSpec.objects.partitionPlot.items);
 assert.deepEqual(samplePartitionFrame(prepared,1).groups[0].graphics,to.graphicSpec.objects.partitionPlot.items);
 assert.ok(body(samplePartitionFrame(prepared,.5)).some(g=>g.properties.fill==="red"));
 const edited=before.editGraphics({target:"partitionPlot",property:"x",value:99});
 assert.equal(plan(edited,after).reason,"graphic-edit");
 assert.deepEqual(samplePartitionFrame(plan(edited,after),0).groups[0].graphics,edited.graphicSpec.objects.partitionPlot.items);
 const missing=before._clone({graphicSpec:{objects:{...before.graphicSpec.objects,partitionPlot:undefined}}});
 assert.throws(()=>plan(missing,after),/materialized/);
});


test("native frame preparation distinguishes a changed parent from hidden descendants",()=>{
 const {before,after}=partitionFrameEndpoints(),saved=[serializeProgram(before),serializeProgram(after)];
 const changed=after.reviseData({source:"d",id:"reparented",values:rows.map(row=>({...row,...(row.key==="A2"?{parentKey:"B"}:{})}))});
 const keys=p=>p.graphicSpec.objects.partitionPlot.items.filter(g=>g.identity.role==="body").map(g=>g.identity.key).sort();
 assert.deepEqual(keys(before),keys(changed),"The same real node identities remain visible");
 assert.equal(plan(before,changed).reason,"topology");
 assert.deepEqual([serializeProgram(before),serializeProgram(after)],saved);
});

test("native middle-frame paths apply interpolated CSS gaps after bending raw intervals",()=>{
 const {before,after}=partitionFrameEndpoints({padding:[2,4]}),to=after.editPartitionPlot({padding:[10,16]});
 const prepared=plan(before,to),frame=samplePartitionFrame(prepared,.5),graphics=body(frame);
 assert.equal(prepared.mode,"bend");
 assert.deepEqual(samplePartitionFrame(prepared,0).groups[0].graphics,resolved(before).graphics);
 assert.deepEqual(samplePartitionFrame(prepared,1).groups[0].graphics,resolved(to).graphics);
 // A occupies u=[0,.6], depth=[1/3,2/3]. At b=.5 radial depth is
 // 10+90*v and tangent length is 150+pi*55. Half current gaps are 3/5px.
 const first=graphics[1].properties.commands[0],expected=expectedBendPoint(3/(150+Math.PI*55),1/3+5/90,.5);
 assert.ok(Math.abs(first.x-expected.x)<1e-10);assert.ok(Math.abs(first.y-(expected.y+25))<1e-10);
 const inside=expectedBendPoint(.3,.5,.5);
 assert.equal(hitPartitionFrame(frame,{x:inside.x,y:inside.y+25}).key,graphics[1].identity.key);
 const gap=expectedBendPoint(.3,1/3,.5);
 assert.notEqual(hitPartitionFrame(frame,{x:gap.x,y:gap.y+25})?.key,graphics[1].identity.key);
});


test("a CSS gap that consumes an intermediate cell removes its body and label together",()=>{
 const before=chart().createCanvas({plot:{width:300,height:3},margin:0,plotBorder:false})
  .createData({id:"one",values:[{id:"root",parent:null,value:1}]}).createHierarchyData({id:"h",key:"id",parent:"parent",value:"value"})
  .layoutHierarchy({id:"l",method:"partition"}).createPartitionPlot({padding:[270,0],labels:{content:"value"}});
 const after=before.createCoordinate({id:"polar",type:"polar"})
  .editCoordinate({target:"polar",polarFrame:{center:{x:.5,y:.5},radius:{unit:"px",value:100},overflow:"allow"}})
  .editPartitionPlot({coordinate:"polar",innerRadius:20,outerRadius:100,direction:"counterclockwise"});
 const prepared=plan(before,after);assert.equal(prepared.mode,"bend");
 assert.equal(body(samplePartitionFrame(prepared,0)).length,1);assert.equal(body(samplePartitionFrame(prepared,1)).length,1);
 const middle=samplePartitionFrame(prepared,.5);assert.deepEqual(middle.groups[0].graphics,[]);assert.equal(hitPartitionFrame(middle,{x:150,y:1.5}),null);
});
