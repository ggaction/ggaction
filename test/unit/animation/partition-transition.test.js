import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat} from '../../../src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames} from '../../../src/animation.js';
import {exportTransitionPlan,restoreTransitionPlan} from '../../../src/animation/planner.js';
import {animationFrameProvenance} from '../../../src/animation/frameProvenance.js';
import {prepareAnimationHitFrame} from '../../../src/interaction/hitProgram.js';
import {createHitFrameBridge} from '../../../src/interaction/hitFrame.js';
import {createPartitionFramePlan,samplePartitionFrame} from '../../../src/materialization/hierarchy/partitionFrames.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const prepare=(from,to,durationMs=100)=>planTransition({from,to,options:{durationMs,easing:'linear'}});
const restored=plan=>deserializeAnimation(serializeAnimation(plan)).plan;

test('public partition transitions retain exact native endpoints and the approved canonical intermediate geometry',()=>{
 const {before,after}=partitionFrameEndpoints({padding:[2,4]}),plan=prepare(before,after),legacy=createPartitionFramePlan(before,after,{target:'partitionPlot'});
 assert.equal(sampleTransition(plan,0).graphicSpec,before.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,after.graphicSpec);
 assert.ok(plan.tracks.every(track=>track.kind==='semantic-partition'));
 for(const time of [25,50,75]){
  const frame=sampleTransition(plan,time),expected=samplePartitionFrame(legacy,time/100).groups[0].graphics;
  const nodes=frame.scene.nodes.filter((node,index)=>frame.decisions[index]?.kernel==='partition');
  assert.equal(nodes.length,10);assert.deepEqual(nodes.map(node=>node.properties),expected.map(graphic=>graphic.properties));
  assert.equal(animationFrameProvenance(frame).partitions.items.length,frame.scene.nodes.length);
  assert.deepEqual(sampleTransition(restored(plan),time),frame);
 }
});
test('native size, radial hole and clockwise mappings interpolate within their normalized hierarchy',()=>{
 const {before,after}=partitionFrameEndpoints({labels:false});
 for(const [from,to]of[[before,before.editCanvas({plot:{width:450,height:150}})],[after,after.editPartitionPlot({innerRadius:30,outerRadius:90,startAngle:50})]]){
  const plan=prepare(from,to);assert.ok(plan.tracks.every(track=>track.kind==='semantic-partition'));
  const frame=sampleTransition(plan,50);assert.ok(frame.scene.nodes.every(node=>node.properties.commands?.every(c=>c.op==='Z'||Number.isFinite(c.x)&&Number.isFinite(c.y))??true));
  assert.deepEqual(sampleTransition(restored(plan),50),frame);
 }
 for(const reverseU of [false,true])for(const reverseV of [false,true]){
  const p=after.editPartitionPlot({direction:'clockwise',reverseU,reverseV});assert.deepEqual(sampleTransition(restored(prepare(p,p)),50),sampleTransition(prepare(p,p),50));
 }
});
test('interrupted bidirectional native partition plans preserve authentic frames and offline meaning',()=>{
 const {before,after}=partitionFrameEndpoints({padding:[3,5]}),middle=sampleTransition(prepare(before,after),37);
 for(const [from,to]of[[middle,before],[after,middle],[middle,after]]){
  const plan=prepare(from,to);assert.ok(plan.tracks.every(track=>track.kind==='semantic-partition'));
  if(from===middle)assert.equal(sampleTransition(plan,0),middle);else assert.equal(sampleTransition(plan,100),middle);
  for(const time of [0,29,100])assert.deepEqual(sampleTransition(restored(plan),time),sampleTransition(plan,time));
 }
 const labelled=exportAnimationFrames(prepare(middle,after),{timesMs:[0,50,100]});
 const again=prepare(labelled[1],before);assert.ok(again.tracks.every(track=>track.kind==='semantic-partition'));
 assert.deepEqual(sampleTransition(restored(again),35),sampleTransition(again,35));
});
test('scope, current path hit and bounded repeated interruptions retain exact native hierarchy identity',()=>{
 const {before,after}=partitionFrameEndpoints({labels:false}),concat=p=>hconcat({id:'comparison',programs:[{id:'left',program:p},{id:'right',program:p}]});
 const frame=sampleTransition(prepare(concat(before),concat(after)),50),proof=animationFrameProvenance(frame);
 assert.equal(proof.partitions.groups.length,2);assert.equal(proof.partitions.items.filter(Boolean).length,10);
 const prepared=prepareAnimationHitFrame(frame),cell=frame.scene.nodes.find(node=>node.type==='path'),points=cell.properties.commands.filter(c=>c.op!=='Z');
 const center={x:points.reduce((n,p)=>n+p.x,0)/points.length+cell.offset[0],y:points.reduce((n,p)=>n+p.y,0)/points.length+cell.offset[1]};
 const bridge=createHitFrameBridge(prepared);try{assert.ok(bridge.hit(center,{slop:0}));}finally{bridge.dispose();}
 let current=sampleTransition(prepare(before,after),40);
 for(let i=0;i<100;i++){
  const plan=prepare(current,i%2?after:before);assert.equal(sampleTransition(plan,0),current);current=sampleTransition(plan,30);
  assert.equal(animationFrameProvenance(current).partitions.groups.length,1);assert.equal(animationFrameProvenance(current).plan,undefined);
 }
});
test('visibility, hierarchy topology, edited geometry and paint retain explicit concrete fallbacks',()=>{
 const {before,after}=partitionFrameEndpoints();
 const focus=prepare(before,before.editPartitionPlot({focus:{key:'A'}}));assert.ok(focus.tracks.some(track=>track.reason==='visibility'));
 const changed=structuredClone(before.graphicSpec);changed.objects.partitionPlot.items[0].properties.x+=1;
 assert.ok(prepare(before._clone({graphicSpec:changed}),after).tracks.some(track=>track.reason==='partition-edited-geometry'));
 const color=prepare(before,before.editPartitionPlot({cells:{overrides:[{key:'R',fill:'#ff0000'}]}}));assert.ok(color.tracks.some(track=>track.kind==='semantic-partition' && track.appearance.entries.some(entry=>entry.key==='fill')));
 const mirrored=prepare(before,after.editPartitionPlot({direction:'clockwise'}));assert.ok(mirrored.tracks.every(track=>track.reason==='handedness'));
 assert.deepEqual(sampleTransition(restored(focus),50),sampleTransition(focus,50));
});
test('closed partition transport rejects missing kernels, forged semantic state and unreferenced groups',()=>{
 const {before,after}=partitionFrameEndpoints({padding:2}),payload=exportTransitionPlan(prepare(before,after));
 const reject=change=>{const input=structuredClone(payload);change(input);assert.throws(()=>restoreTransitionPlan(input));};
 for(const change of [p=>delete p.kernels.partition,p=>p.kernels.partition=2,p=>p.from.partitions.items.pop(),p=>p.from.partitions.groups[0].meaning.state.nodes[0].u1=.7,
  p=>p.from.partitions.groups[0].labelOffset=[1,2,3],p=>p.from.partitions.groups.push(structuredClone(p.from.partitions.groups[0])),p=>p.from.partitions.items.find(Boolean).group=99,
  p=>p.from.partitions.groups[0].layout.kind='hierarchy',p=>p.from.partitions.groups[0].meaning.extra=1,p=>p.from.partitions.groups[0].extra=1,
  p=>p.from.partitions.groups[0].hierarchy.id='foreign',p=>p.from.partitions.groups[0].id='foreign',p=>p.from.partitions.items.find(Boolean).role='label',
  p=>p.from.partitions.items.find(Boolean).reason='unknown',p=>p.from.partitions.items.find(Boolean).reason='primitive-role',p=>p.from.partitions.groups=[]])reject(change);
 const frame=sampleTransition(prepare(before,after),50),sampled=exportTransitionPlan(prepare(frame,after));
 assert.throws(()=>restoreTransitionPlan({...sampled,from:{...sampled.from,partitions:undefined}}));
});

test('the public plan preserves every compatible native general direction through offline replay',()=>{
 const {before,after}=partitionFrameEndpoints({padding:[2,4]});let compatible=0;
 for(const orientation of ['horizontal','vertical'])for(const reverseU of [false,true])for(const reverseV of [false,true])
 for(const direction of ['clockwise','counterclockwise'])for(const pu of [false,true])for(const pv of [false,true]){
  const from=before.editPartitionPlot({orientation,reverseU,reverseV}),to=after.editPartitionPlot({direction,reverseU:pu,reverseV:pv,startAngle:35,sweep:280});
  const plan=prepare(from,to);if(!plan.tracks.some(track=>track.kind==='semantic-partition'))continue;compatible++;
  const replay=restored(plan);
  for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(replay,time),sampleTransition(plan,time));
 }
 assert.equal(compatible,32);
});

test('incompatible clipping and structured paint preserve their native pixels through explicit fallbacks',()=>{
 const {before,after}=partitionFrameEndpoints({labels:false});
 const clipped=prepare(before,after.editPartitionPlot({clip:true}));
 assert.ok(clipped.tracks.every(track=>track.reason==='clip-topology'));
 const paint={type:'pattern',style:'dots',pitch:12};
 const painted=p=>p.editPartitionPlot({cells:{fill:paint,overrides:[]}});
 const patterned=prepare(painted(before),painted(after));
 assert.ok(patterned.tracks.every(track=>track.reason==='appearance'));
 for(const plan of [clipped,patterned])assert.deepEqual(sampleTransition(restored(plan),50),sampleTransition(plan,50));
});

test('a gap that consumes an intermediate cell falls back with both body and label preserved',()=>{
 const before=chart().createCanvas({plot:{width:300,height:3},margin:0,plotBorder:false})
  .createData({id:'one',values:[{id:'root',parent:null,value:1}]})
  .createHierarchyData({id:'h',key:'id',parent:'parent',value:'value'})
  .layoutHierarchy({id:'l',method:'partition'})
  .createPartitionPlot({padding:[270,0],labels:{content:'value'}});
 const after=before.createCoordinate({id:'polar',type:'polar'})
  .editCoordinate({target:'polar',polarFrame:{center:{x:.5,y:.5},radius:{unit:'px',value:100},overflow:'allow'}})
  .editPartitionPlot({coordinate:'polar',innerRadius:20,outerRadius:100,direction:'counterclockwise'});
 const plan=prepare(before,after),frame=sampleTransition(plan,50);
 assert.ok(plan.tracks.every(track=>track.kind==='semantic-partition'));
 assert.equal(frame.decisions.filter(d=>d.reason==='partition-collapsed-cell').length,2);
 assert.deepEqual(sampleTransition(restored(plan),50),frame);
 assert.ok(prepare(frame,after).tracks.every(track=>track.kind==='crossfade'));
});
