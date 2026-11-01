import assert from 'node:assert/strict';
import test from 'node:test';
import {hconcat} from '../../../src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../../src/animation.js';
import {transitionPartitions} from '../../../src/animation/planner.js';
import {partitionTrackPreparation} from '../../../src/animation/partitionTracks.js';
import {cloneAndFreeze} from '../../../src/core/immutable.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const prepare=(from,to)=>planTransition({from,to,options:{durationMs:100,easing:'linear'}});
const matches=plan=>plan.tracks.map(({sourceIndex,targetIndex,key,role})=>({sourceIndex,targetIndex,key,role}));
function measure(plan,a,b,run){
 const preparation=partitionTrackPreparation(plan.from,plan.to,a,b),groups=new Set([...a.groups,...b.groups]);
 const stringify=JSON.stringify;let calls=0;
 try{JSON.stringify=function(value,...args){if(groups.has(value))calls++;return stringify(value,...args);};return {result:run(preparation),calls};}
 finally{JSON.stringify=stringify;}
}

test('owned equal and unequal partition groups are compared once per exact pair',()=>{
 const {before,after}=partitionFrameEndpoints({labels:false});
 for(const [from,to]of[[before,before],[before,after]]){
  const plan=prepare(from,to),states=transitionPartitions(plan);
  const {result,calls}=measure(plan,states.from,states.to,p=>matches(plan).map(p.track));
  assert.equal(calls,2);assert.equal(result.length,5);
  assert.ok(result.every(track=>track.kind===(from===to?'exact':'semantic-partition')));
 }
});

test('nested partition groups retain independent equality and every native offline and rebase item',()=>{
 const {before,after}=partitionFrameEndpoints({labels:false,padding:2});
 const nested=p=>hconcat({programs:[{id:'left',program:p},{id:'right',program:p}]});
 const from=nested(before),to=nested(after),plan=prepare(from,to),states=transitionPartitions(plan);
 const {result,calls}=measure(plan,states.from,states.to,p=>matches(plan).map(p.track));
 assert.equal(calls,4);assert.equal(result.length,10);assert.ok(result.every(t=>t.kind==='semantic-partition'));
 const offline=deserializeAnimation(serializeAnimation(plan)).plan;
 for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(offline,time),sampleTransition(plan,time));
 const middle=sampleTransition(plan,37);
 for(const [a,b]of[[middle,from],[to,middle],[middle,to]]){
  const rebased=prepare(a,b),restored=deserializeAnimation(serializeAnimation(rebased)).plan;
  for(const time of [0,29,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(rebased,time));
 }
});

test('caller-owned and shallow-frozen partition groups do not acquire cached equality authority',()=>{
 const {before}=partitionFrameEndpoints({labels:false}),plan=prepare(before,before),states=transitionPartitions(plan);
 for(const frozen of [false,true]){
  const a=structuredClone(states.from),b=structuredClone(states.to);
  if(frozen){Object.freeze(a.groups[0]);Object.freeze(b.groups[0]);}
  const {result,calls}=measure(plan,a,b,p=>{
   const first=p.track(matches(plan)[0]);a.groups[0].labelOffset[0]+=1;
   return [first,p.track(matches(plan)[1])];
  });
  assert.equal(calls,4);assert.equal(result[0].kind,'exact');assert.equal(result[1].kind,'semantic-partition');
 }
});

test('an owned group replacement cannot borrow the preceding pair equality',()=>{
 const {before}=partitionFrameEndpoints({labels:false}),plan=prepare(before,before),states=transitionPartitions(plan);
 const a={...states.from,groups:[...states.from.groups]},p=partitionTrackPreparation(plan.from,plan.to,a,states.to);
 assert.equal(p.track(matches(plan)[0]).kind,'exact');
 a.groups[0]=cloneAndFreeze({...a.groups[0],labelOffset:[1,0]});
 assert.equal(p.track(matches(plan)[1]).kind,'semantic-partition');
});
