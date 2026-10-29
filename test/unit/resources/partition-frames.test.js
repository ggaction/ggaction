import assert from "node:assert/strict";
import test from "node:test";
import { createPartitionFramePlan, samplePartitionFrame, hitPartitionFrame } from "../../../src/materialization/hierarchy/partitionFrames.js";
import { partitionFrameEndpoints } from "../../support/partition-frames.js";
import { expectedBendPoint } from "../../charts/partition-layouts/reference.js";
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
  [after.editPartitionPlot({focus:{key:"A"}}),"topology"],
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
