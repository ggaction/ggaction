import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeHitPreparation,normalizeHitPathGeometry} from '../../../src/grammar/hitPolicy.js';
import {prepareHitShape,hitShape,nearestHitShape,hitShapeAnchor,prepareHitShapeUnion,hitShapeWork,hitShapePreparationWork,validateHitShapePolicy,hitShapeUsesIndex} from '../../../src/grammar/hitShapes.js';
import {buildPartIndex,indexedDistance,lowerBound} from '../../../src/grammar/hitPartIndex.js';
import {prepareHitIndex,hitIndex,nearestHitIndex} from '../../../src/grammar/hitIndex.js';
import {segmentDistance,pathFillContains,pathStrokeDistance} from '../../../src/grammar/pathGeometry.js';
import {prepareHitStroke,calculateHitStroke,hitStrokeDistance,hitStrokePreparationWork} from '../../../src/grammar/hitStroke.js';
import {cloneAndFreeze,isOwned} from '../../../src/core/immutable.js';
const identity=[1,0,0,1,0,0],policy={maxParts:400000,maxWork:2000000,maxIndexWork:16000000};
const base={geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:30,y:20},{op:'L',x:40,y:-20},{op:'L',x:60,y:0}],fillRule:'nonzero'},paint:{fill:false,stroke:{width:2,lineCap:'butt',lineJoin:'miter',miterLimit:10},opacity:1},transform:identity,clips:[]};
const indexed=input=>prepareHitShape({...input,geometry:{...input.geometry,maxCommands:200000}},policy);
const capture=fn=>{try{return{value:fn()};}catch(e){return{name:e.name,message:e.message};}};

test('path preparation requires closed own finite limits without changing defaults',()=>{
 assert.deepEqual(normalizeHitPreparation(),{maxSceneNodes:100000,maxWork:10000000});
 assert.deepEqual(normalizeHitPreparation({pathGeometry:undefined}),normalizeHitPreparation());
 assert.deepEqual(normalizeHitPathGeometry({}),{maxParts:30000,maxWork:1000000,maxIndexWork:10000000});
 assert.deepEqual(normalizeHitPathGeometry({maxWork:undefined}),normalizeHitPathGeometry({}));
 for(const [key,max] of Object.entries(policy))for(const value of[0,-1,1.5,NaN,Infinity,max+1])assert.throws(()=>normalizeHitPathGeometry({[key]:value}),RangeError);
 for(const input of[null,[],true,{other:1}])assert.throws(()=>normalizeHitPathGeometry(input),TypeError);
 let reads=0;const getter=Object.defineProperty({},'maxWork',{enumerable:true,get(){reads++;return 1;}});assert.throws(()=>normalizeHitPathGeometry(getter),/accessors/);assert.equal(reads,0);
 for(const key of Object.keys(policy)){assert.equal(normalizeHitPathGeometry({[key]:1})[key],1);assert.equal(normalizeHitPathGeometry({[key]:policy[key]})[key],policy[key]);}
 Object.defineProperty(Object.prototype,'pathGeometry',{configurable:true,get(){reads++;throw Error('inherited');}});
 try{assert.deepEqual(normalizeHitPreparation({}),{maxSceneNodes:100000,maxWork:10000000});}finally{delete Object.prototype.pathGeometry;}assert.equal(reads,0);
 assert.equal(hitShapeUsesIndex(prepareHitShape(base,policy)),false);
 assert.throws(()=>prepareHitShape({...base,geometry:{...base.geometry,maxCommands:undefined}},policy),/maxCommands/);
});

test('indexed footprints preserve scalar full hit nearest and focus results',()=>{
 const fixtures=[base];for(const lineCap of['butt','round','square'])for(const lineJoin of['miter','bevel','round'])fixtures.push({...base,paint:{...base.paint,stroke:{width:4,lineCap,lineJoin,miterLimit:1,dash:[3,1,2]}}});
 fixtures.push({...base,transform:[-1,.4,.3,1.5,7,11]},{...base,transform:[0,0,0,0,0,0]},{...base,paint:{...base.paint,opacity:0}},{...base,paint:{...base.paint,fill:true}},
 {...base,clips:[{geometry:{type:'rect',rect:{x:10,y:-10,width:25,height:20}},transform:identity}]},
 {...base,clips:[{geometry:{type:'rect',rect:{x:10,y:-10,width:25,height:20}},transform:identity},{geometry:{type:'rect',rect:{x:20,y:0,width:25,height:5}},transform:identity}]},
 {...base,clips:[{geometry:{type:'rect',rect:{x:20,y:0,width:0,height:0}},transform:identity}]},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:0,y:0},{op:'L',x:1e-300,y:1e-300}],fillRule:'evenodd'}},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:2**30,y:0}],fillRule:'nonzero'}},
 {...base,geometry:{type:'path',commands:[{op:'M',x:0,y:0},{op:'C',x1:40,y1:70,x2:-10,y2:-20,x:80,y:0},{op:'Z'}],fillRule:'evenodd'}});
 for(const input of fixtures){const a=prepareHitShape(input),b=indexed(input);assert.deepEqual(a,b);assert.equal(hitShapeWork(a),hitShapeWork(b));assert.ok(hitShapePreparationWork(b)>hitShapeWork(b));
  for(const point of[{x:0,y:0},{x:-0,y:-0},{x:15,y:8},{x:30,y:20},{x:60,y:0},{x:90,y:40},{x:2**40,y:2**40},{x:Number.MIN_VALUE,y:-Number.MIN_VALUE}])for(const slop of[0,3,6])for(const hitInvisible of[false,true]){
   const options={slop,hitInvisible};assert.deepEqual(capture(()=>hitShape(b,point,options)),capture(()=>hitShape(a,point,options)));assert.deepEqual(capture(()=>nearestHitShape(b,point,options)),capture(()=>nearestHitShape(a,point,options)));
  }
  assert.deepEqual(capture(()=>hitShapeAnchor(b)),capture(()=>hitShapeAnchor(a)));
 }
});

test('query work belongs to visited exact parts and cached policy is rechecked',()=>{
 const commands=[];for(let i=0;i<200;i++)commands.push({op:'M',x:i*20,y:0},{op:'L',x:i*20+5,y:0});
 const input={...base,geometry:{...base.geometry,commands}},scalar=prepareHitShape(input),shape=indexed(input);
 let visits=0;const result=hitShape(shape,{x:1,y:0},{slop:0},cost=>visits+=cost);assert.deepEqual(result,hitShape(scalar,{x:1,y:0},{slop:0}));assert.ok(visits<hitShapeWork(shape)/5);
 const scene=cloneAndFreeze({version:2,width:4000,height:100,nodes:[{key:'path'}]}),entry={nodeKey:'path',shape,zIndex:0,metadata:{itemKey:'item',ownerId:'coast',role:'mark',childPath:[],rowKeys:[],resourceRefs:[]}};
 assert.throws(()=>prepareHitIndex(scene,[entry]),/explicit preparation policy/);
 const index=prepareHitIndex(scene,[entry],{pathGeometry:policy});const hit=hitIndex(index,scene,{x:1,y:0},{slop:0});assert.equal(hit.target.itemKey,'item');assert.ok(hit.statistics.work<hitShapeWork(shape));
 assert.equal(nearestHitIndex(index,scene,{x:1,y:1},{ownerId:'coast',childPath:[],itemKeys:['item'],maxDistance:3}).target.itemKey,'item');
 for(const lower of[{maxParts:1},{maxWork:1},{maxIndexWork:1}])assert.throws(()=>validateHitShapePolicy(shape,{...policy,...lower}),/policy budget/);
 assert.throws(()=>validateHitShapePolicy({},policy),/prepared geometry/);assert.throws(()=>hitShapePreparationWork({}),/prepared geometry/);
 assert.throws(()=>indexedDistance({}, {x:0,y:0},()=>0),/prepared index/);
 const union=prepareHitShapeUnion([shape,scalar]);assert.equal(hitShapeUsesIndex(union),true);assert.deepEqual(hitShape(union,{x:1,y:0},{slop:0}),result);assert.equal(hitShapePreparationWork(union),hitShapePreparationWork(shape)+hitShapePreparationWork(scalar));
 validateHitShapePolicy(union,policy);assert.throws(()=>validateHitShapePolicy(union),/explicit/);
});

test('balanced part bounds remain conservative with collisions extremes and a bounded build',()=>{
 const parts=Array.from({length:128},(_,i)=>({bounds:{left:i*10,top:-1,right:i*10+4,bottom:1}}));
 const index=buildPartIndex(parts);assert.equal(index.work,15*parts.length+2*Math.ceil(parts.length/8)-1+2048);assert.equal(buildPartIndex(parts,index.work).work,index.work);assert.throws(()=>buildPartIndex(parts,index.work-1),/work budget/);for(let i=0;i<256;i++){const point={x:i*5-3,y:(i%7)-3};const oracle=p=>Math.hypot(Math.max(0,p.bounds.left-point.x,point.x-p.bounds.right),Math.max(0,p.bounds.top-point.y,point.y-p.bounds.bottom));assert.equal(indexedDistance(index,point,oracle),Math.min(...parts.map(oracle)));}
 for(const x of[-Infinity,-Number.MAX_VALUE,-(2**20),-0,Number.MIN_VALUE,2**20,Number.MAX_VALUE,Infinity])assert.ok(lowerBound([0,0,1,1],{x,y:0})>=0);
 assert.equal(indexedDistance(buildPartIndex([]),{x:0,y:0},()=>1),Infinity);
 assert.equal(indexedDistance(buildPartIndex([{circle:true,bounds:{left:0,top:0,right:1,bottom:1}}]),{x:0,y:0},()=>-0),-0);
 assert.equal(indexedDistance(buildPartIndex([{bounds:undefined}]),{x:0,y:0},()=>2),2);
 let reads=0;const deferred={length:400000,get 0(){reads++;throw new Error('must reserve before input visits');}};assert.throws(()=>buildPartIndex(deferred,1),/work budget/);assert.equal(reads,0);
 assert.throws(()=>buildPartIndex(parts,1),/work budget/);assert.throws(()=>buildPartIndex(new Array(400001)),/part budget/);
 assert.equal(indexedDistance(index,{x:2**40,y:0},p=>p.bounds.left),0);
});


test('explicit path quotas reject before partial geometry and never transfer to clips or text',()=>{
 const declared={...base,geometry:{...base.geometry,maxCommands:200000}};
 assert.throws(()=>prepareHitShape(declared,{...policy,maxParts:1}),/stroke parts/);
 assert.throws(()=>prepareHitShape(declared,{...policy,maxWork:1}),/stroke.*work budget/);
 assert.throws(()=>prepareHitShape({...declared,paint:{...base.paint,stroke:null,fill:true}},{...policy,maxWork:1}),/geometry work budget/);
 assert.throws(()=>prepareHitShape(declared,{...policy,maxIndexWork:1}),/index.*work budget/);
 const long=Array.from({length:30001},(_,i)=>({op:i?'L':'M',x:i,y:0}));
 assert.throws(()=>prepareHitShape({...base,geometry:{...base.geometry,commands:long}},policy),/must not exceed 30000/);
 assert.throws(()=>prepareHitShape({...declared,clips:[{geometry:{...base.geometry,commands:long},transform:identity}]},policy),/must not exceed 30000/);
 assert.throws(()=>prepareHitShape({...declared,clips:[{geometry:declared.geometry,transform:identity}]},policy),/requires exactly/);
 assert.throws(()=>prepareHitShape({...base,geometry:{type:'text',boxes:new Array(30001)}},policy),/Text hit boxes/);
 const circle={subpaths:[{points:[{x:0,y:0},{x:20,y:0}],closed:false,hasSegments:true}]},stroke={width:4,lineCap:'round'};
 const parts=prepareHitStroke(circle,stroke,policy),cost=hitStrokePreparationWork(parts);
 assert.deepEqual(prepareHitStroke(circle,stroke,{...policy,maxWork:cost,maxParts:parts.length}),parts);
 assert.throws(()=>prepareHitStroke(circle,stroke,{...policy,maxWork:cost-1}),/work budget/);
 assert.throws(()=>prepareHitStroke(circle,stroke,{...policy,maxParts:parts.length-1}),/parts/);
 const shape=indexed(base);let costQuery=0;hitShape(shape,{x:10,y:10},{slop:0},n=>costQuery+=n);
 const run=maximum=>{let cost=0;return hitShape(shape,{x:10,y:10},{slop:0},n=>{cost+=n;if(cost>maximum)throw new RangeError('query bound');});};
 assert.deepEqual(run(costQuery),hitShape(shape,{x:10,y:10},{slop:0}));assert.throws(()=>run(costQuery-1),/query bound/);
});

test('conservative polygon bounds stay below scalar distances at numeric boundaries',()=>{
 assert.equal(segmentDistance({x:3,y:4},{x:0,y:0},{x:0,y:0}),5);
 assert.equal(lowerBound([0,0,0,0],{x:3,y:4}),4-2**-10);
 let seed=1729;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const scales=[Number.MIN_VALUE,2**-500,2**-40,1,2**10,2**19];
 for(const scale of scales)for(let i=0;i<80;i++){
  const a={x:(random()*2-1)*scale,y:(random()*2-1)*scale},b={x:(random()*2-1)*scale,y:(random()*2-1)*scale};
  const bounds=[Math.min(a.x,b.x),Math.min(a.y,b.y),Math.max(a.x,b.x),Math.max(a.y,b.y)];
  for(const q of[a,b,{x:a.x+Number.EPSILON*scale,y:a.y-Number.EPSILON*scale},{x:(random()*2-1)*scale,y:(random()*2-1)*scale}]){
   assert.ok(lowerBound(bounds,q)<=segmentDistance(q,a,b));
   const commands=[{op:'M',x:a.x,y:a.y},{op:'L',x:b.x,y:a.y},{op:'L',x:b.x,y:b.y},{op:'L',x:a.x,y:b.y},{op:'Z'}];
   const distance=pathFillContains(commands,q)?0:pathStrokeDistance(commands,q);assert.ok(lowerBound(bounds,q)<=distance);
  }
 }
 const collisions=Array.from({length:33},()=>({bounds:{left:1,top:1,right:1,bottom:1}})),order=[];
 assert.equal(indexedDistance(buildPartIndex(collisions),{x:1,y:1},(_p,i)=>{order.push(i);return i===32?-0:0;}),-0);assert.deepEqual(order,Array.from({length:33},(_,i)=>i));
});


test('raw stroke assembly has identical work and commands without granting owned authority',()=>{
 const geometry={subpaths:[{points:[{x:0,y:0},{x:20,y:5},{x:40,y:-10}],closed:false,hasSegments:true}]};
 for(const cap of['butt','round','square']){
  const style={width:4,lineCap:cap,lineJoin:'miter',dash:[3,1,2]},raw=calculateHitStroke(geometry,style,policy),owned=prepareHitStroke(geometry,style,policy);
  assert.deepEqual(raw.parts,owned);assert.equal(raw.work,hitStrokePreparationWork(owned));assert.equal(isOwned(raw.parts),false);assert.equal(isOwned(owned),true);assert.ok(Object.isFrozen(owned));
  assert.throws(()=>hitStrokeDistance(raw.parts,{x:0,y:0}),/prepared parts/);
  const before=JSON.stringify(owned);raw.parts[0].commands[0].x=999;assert.equal(JSON.stringify(owned),before);
 }
 const input=structuredClone(base),shape=indexed(input),before=hitShape(shape,{x:30,y:20},{slop:0});input.geometry.commands[1].x=999;input.transform[0]=9;input.paint.stroke.width=500;
 assert.deepEqual(hitShape(shape,{x:30,y:20},{slop:0}),before);
});
