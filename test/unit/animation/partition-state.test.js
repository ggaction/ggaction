import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartitionAnimationState as create,preparePartitionAnimationState as prepare,samplePartitionAnimationState as sample} from '../../../src/grammar/animation/partitionState.js';
import {mapPartitionBendPoint} from '../../../src/grammar/hierarchy/partitionAdapter.js';
import {mapPartitionRectangle} from '../../../src/grammar/hierarchy/partitionMapping.js';
const mapping={orientation:'horizontal',reverseU:false,reverseV:false,padding:[0,0],innerRadius:20,outerRadius:100,startAngle:0,sweep:360,direction:'counterclockwise',radiusPolicy:'equal-depth'};
const frame={x:90,y:180,width:300,height:100},node={key:'root',parentKey:null,u0:0,u1:1,v0:0,v1:1,visible:true};
const native=(patch={},polar)=>({nodes:[node],focusKey:'root',frame,mapping:{...mapping,...patch},...(polar?{polar}: {})});
const point=(meaning,u,v)=>{const {gap,...basis}=meaning.state.frame;return mapPartitionBendPoint(basis,{u,v:meaning.depthReversed?1-v:v,bend:meaning.state.bend});};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('native rectangular and polar normalized states preserve fixed screen values without layout',()=>{
 const a=create(native()),b=create(native({}, {centerX:240,centerY:230,outerRadius:100}));
 assert.deepEqual(point(a,0,0),{x:90,y:180});assert.deepEqual(point(a,1,1),{x:390,y:280});
 const p=point(b,.25,.5);close(p.x,180);close(p.y,230);
 const saved=structuredClone([a,b]),plan=prepare(a,b);assert.equal(plan.track.mode,'partition');
 const mid=sample(plan,.5).state;assert.equal(mid.state.bend,.5);assert.deepEqual(mid.state.frame.origin,[240,205]);
 assert.deepEqual([a,b],saved);assert.ok(Object.isFrozen(plan.track.to.nodes));
 for(const t of [0,.25,.5,.75,1])assert.deepEqual(sample(JSON.parse(JSON.stringify(plan)),t),sample(plan,t));
});
test('all native coordinate directions and compatible bend endpoints preserve native mapping',()=>{
 let compatible=0;
 for(const orientation of ['horizontal','vertical'])for(const reverseU of [false,true])for(const reverseV of [false,true])
 for(const direction of ['clockwise','counterclockwise'])for(const pu of [false,true])for(const pv of [false,true]){
  const rect={orientation,reverseU,reverseV},polar={direction,reverseU:pu,reverseV:pv,startAngle:35,sweep:280};
  const a=create(native(rect)),b=create(native(polar,{centerX:240,centerY:230,outerRadius:100})),plan=prepare(a,b);
  if(plan.track.mode!=='partition')continue;compatible++;
  for(const [u,v]of[[.1,.2],[.3,.4],[1,1]]){
   const p=point(sample(plan,0).state,u,v),r=mapPartitionRectangle({u0:u,u1:u,v0:v,v1:v},{...frame,...rect});close(p.x,r.x);close(p.y,r.y);
   const q=point(sample(plan,1).state,u,v),uu=pu?1-u:u,vv=pv?1-v:v,theta=(35+(direction==='clockwise'?1:-1)*280*uu)*Math.PI/180,radius=20+80*vv;
   close(q.x,240+radius*Math.sin(theta));close(q.y,230-radius*Math.cos(theta));
  }
 }
 assert.equal(compatible,32);
});
test('current curved meaning rebases exactly while native dimensions remain explicit',()=>{
 const a=create(native()),b=create(native({}, {centerX:240,centerY:230,outerRadius:100}));
 const current=sample(prepare(a,b),.37).state;
 for(const target of [a,b]){
  const plan=prepare(current,target);assert.equal(plan.track.mode,'partition');assert.deepEqual(sample(plan,0).state,current);
 }
 const resized=create({...native(),frame:{x:20,y:30,width:600,height:200}}),rect=sample(prepare(a,resized),.5).state;
 assert.equal(rect.state.frame.kernel.width,450);assert.equal(rect.state.frame.kernel.height,150);
 const reflected=create(native({reverseV:true}, {centerX:240,centerY:230,outerRadius:100}));
 assert.equal(sample(prepare(b,reflected),.5).reason,'depth-direction');
 assert.equal(sample(prepare(a,create(native({reverseU:true}))),.5).reason,'handedness');
});
test('closed numeric inputs reject malformed frames, unknown versions, accessors and inconsistent plans',()=>{
 let calls=0;const malicious=native();Object.defineProperty(malicious.nodes[0]={...node},'u0',{enumerable:true,get(){calls++;return 0;}});
 assert.throws(()=>create(malicious),/accessors/);assert.equal(calls,0);
 for(const input of [null,{}, {...native(),extra:1},{...native(),frame:{...frame,width:0}},{...native(),frame:{...frame,x:NaN}},{...native(),frame:{...frame,x:1e308,width:1e308}},{...native(),polar:undefined},{...native(),polar:{centerX:NaN,centerY:0,outerRadius:100}},{...native(),polar:{centerX:0,centerY:0,outerRadius:80}}])assert.throws(()=>create(input));
 const a=create(native()),plan=prepare(a,a);
 for(const input of [{...a,depthReversed:1},{...a,extra:1}])assert.throws(()=>prepare(input,a));
 for(const input of [null,{...plan,version:2},{...plan,reason:undefined},{...plan,reason:'depth-direction'},{...plan,extra:1},{...plan,depthReversed:0},{...plan,depthReversed:true},{...plan,depthDirections:[]},{...plan,depthDirections:[1,false]}])assert.throws(()=>sample(input,.5));
 for(const t of [-1,2,NaN])assert.throws(()=>sample(plan,t));
 const oversized=native();oversized.nodes=Array(10001);Object.defineProperty(oversized.nodes,0,{get(){calls++;return node;}});assert.throws(()=>create(oversized),/10000/);assert.equal(calls,0);
});
