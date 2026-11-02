import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {FDEB_EPSILON,forceEdgeMetric,forceCompatibility} from '../../../../../src/grammar/graph/routes/compatibility.js';
import {advanceForceRoutes,forceRouteSchedule} from '../../../../../src/grammar/graph/routes/forceDirected.js';
import {resampleRoute} from '../../../../../src/grammar/graph/routes/polyline.js';

// Evidence-only storage prototype. No product admission, guard, charge, public
// schema, worker, or original input is changed. Only the supported 100-edge
// schedule and small literal cases run. The oracle's JS allocations are NOT
// included in the managed numeric-buffer ledger or claimed as measured heap.
const hash=value=>createHash('sha256').update(value).digest('hex');
function ledger(maximum=16*1024*1024){
 const state={live:0,peak:0,allocations:0};
 return {state,reserve(bytes){
  assert.ok(Number.isSafeInteger(bytes)&&bytes>=0);
  if(state.live+bytes>maximum)throw new RangeError('Prototype managed bytes exceeded');
  state.live+=bytes;state.peak=Math.max(state.peak,state.live);state.allocations++;
 },release(bytes){state.live-=bytes;assert.ok(state.live>=0);}};
}
function upperNeighbors(metrics,directed,threshold,memory,chunkSize,check=()=>{}){
 check();
 const count=metrics.length,active=metrics.filter(m=>m.length>FDEB_EPSILON).length;
 const candidatePairs=active*(active-1)/2,headerBytes=4*(count+1)+4*count,chunks=[];
 let offsets,degree,size=0,reserved=0,visited=0;
 const reserve=bytes=>{memory.reserve(bytes);reserved+=bytes;};
 const dispose=()=>{if(reserved){memory.release(reserved);reserved=0;}chunks.length=0;offsets=degree=undefined;};
 try{
  reserve(headerBytes);offsets=new Uint32Array(count+1);degree=new Uint32Array(count);
  for(let edge=0;edge<count;edge++){
   offsets[edge]=size;
   if(metrics[edge].length<=FDEB_EPSILON)continue;
   for(let other=edge+1;other<count;other++){
    if(metrics[other].length<=FDEB_EPSILON)continue;
    check();visited++;
    const pair=forceCompatibility(metrics[edge],metrics[other],directed);
    if(!(pair.compatibility>0&&pair.compatibility>=threshold))continue;
    const slot=size%chunkSize;
    if(slot===0){
     const capacity=Math.min(chunkSize,candidatePairs-size);
     // One reserve covers all three arrays before the first allocation.
     reserve(13*capacity);
     chunks.push({target:new Uint32Array(capacity),weight:new Float64Array(capacity),reverse:new Uint8Array(capacity)});
    }
    const chunk=chunks.at(-1);
    chunk.target[slot]=other;chunk.weight[slot]=pair.compatibility;chunk.reverse[slot]=Number(pair.reverse);
    degree[edge]++;degree[other]++;size++;
   }
  }
  offsets[count]=size;
  assert.equal(visited,candidatePairs);
  return {offsets,degree,chunks,size,chunkSize,candidatePairs,managedBytes:reserved,dispose};
 }catch(error){dispose();throw error;}
}
function scalarNeighbors(metrics,directed,threshold){
 const result=metrics.map(()=>[]);
 for(let a=0;a<metrics.length;a++)for(let b=a+1;b<metrics.length;b++){
  const pair=forceCompatibility(metrics[a],metrics[b],directed);
  if(pair.compatibility>0&&pair.compatibility>=threshold){
   result[a].push({edge:b,compatibility:pair.compatibility,reverse:pair.reverse});
   result[b].push({edge:a,compatibility:pair.compatibility,reverse:pair.reverse});
  }
 }
 return result;
}
function assertStorage(table,neighbors){
 for(let edge=0;edge<neighbors.length;edge++){
  assert.equal(table.degree[edge],neighbors[edge].length);
  const upper=neighbors[edge].filter(n=>n.edge>edge);
  assert.equal(table.offsets[edge+1]-table.offsets[edge],upper.length);
  upper.forEach((expected,i)=>{
   const index=table.offsets[edge]+i,chunk=table.chunks[Math.floor(index/table.chunkSize)],slot=index%table.chunkSize;
   assert.deepEqual({edge:chunk.target[slot],compatibility:chunk.weight[slot],reverse:chunk.reverse[slot]===1},expected);
  });
 }
}
// Same expression grouping and edge -> upper neighbor -> sample loop order as
// the existing symmetric kernel. No arithmetic reassociation or reverse negate.
function advance(routes,lengths,table,step){
 const next=routes.map((points,edge)=>{
  const spring=lengths[edge]<=FDEB_EPSILON?0:.1/(lengths[edge]*(points.length-1));
  return points.map((point,index)=>index===0||index===points.length-1?{...point}:{
   x:spring*(points[index-1].x+points[index+1].x-2*point.x),
   y:spring*(points[index-1].y+points[index+1].y-2*point.y)
  });
 });
 for(let edge=0;edge<routes.length;edge++)for(let pair=table.offsets[edge];pair<table.offsets[edge+1];pair++){
  const chunk=table.chunks[Math.floor(pair/table.chunkSize)],slot=pair%table.chunkSize;
  const otherEdge=chunk.target[slot],weight=chunk.weight[slot],reverse=chunk.reverse[slot]===1;
  const points=routes[edge],other=routes[otherEdge];
  for(let index=1;index<points.length-1;index++){
   const pairedIndex=reverse?other.length-1-index:index,point=points[index],q=other[pairedIndex];
   const dx=q.x-point.x,dy=q.y-point.y,distance=Math.hypot(dx,dy);
   if(distance<=FDEB_EPSILON)continue;
   const attraction=weight/(distance*distance);
   next[edge][index].x+=attraction*dx;next[edge][index].y+=attraction*dy;
   next[otherEdge][pairedIndex].x+=attraction*(point.x-q.x);
   next[otherEdge][pairedIndex].y+=attraction*(point.y-q.y);
  }
 }
 let displacementCaps=0;
 for(let edge=0;edge<routes.length;edge++)for(let index=1;index<routes[edge].length-1;index++){
  const force=next[edge][index],point=routes[edge][index];
  let dx=step*force.x,dy=step*force.y;
  const displacement=Math.hypot(dx,dy);
  if(!Number.isFinite(displacement))throw new RangeError('Force route displacement must be finite.');
  if(displacement>.1){const factor=.1/displacement;dx*=factor;dy*=factor;displacementCaps++;}
  force.x=point.x+dx;force.y=point.y+dy;
 }
 return {routes:next,displacementCaps};
}
function original(){
 const n=100,raw=Array.from({length:n},(_,i)=>({x:200+150*Math.cos(2*Math.PI*i/n),y:200+150*Math.sin(2*Math.PI*i/n)}));
 const left=Math.min(...raw.map(p=>p.x)),top=Math.min(...raw.map(p=>p.y));
 const scale=Math.max(Math.max(...raw.map(p=>p.x))-left,Math.max(...raw.map(p=>p.y))-top);
 const p=raw.map(p=>({x:(p.x-left)/scale,y:(p.y-top)/scale}));
 return p.map((a,i)=>[a,p[(i+Math.floor(n/3))%n]]);
}
function coordinateHash(routes){
 const bytes=Buffer.alloc(routes.reduce((n,r)=>n+r.length*16,0));let offset=0;
 for(const route of routes)for(const {x,y}of route){bytes.writeDoubleLE(x,offset);bytes.writeDoubleLE(y,offset+8);offset+=16;}
 return hash(bytes);
}
const p=(x,y)=>({x,y});
const fixtures=[
 {name:'original-100',edges:original(),directed:false,threshold:.6,chunkSize:32768},
 {name:'chunk-boundaries',edges:original(),directed:false,threshold:.6,chunkSize:17},
 {name:'signed-zero-reverse-and-zero',edges:[[p(-0,0),p(1,-0)],[p(1,-0),p(-0,0)],[p(0,0),p(0,0)],[p(0,.1),p(1,.1)]],directed:false,threshold:0,chunkSize:2},
 {name:'directed-opposed-and-threshold',edges:[[p(0,0),p(1,0)],[p(1,0),p(0,0)],[p(0,0),p(1,0)],[p(0,1),p(1,1)]],directed:true,threshold:1,chunkSize:1},
 {name:'below-epsilon',edges:[[p(0,0),p(1e-10,0)],[p(0,0),p(1,0)],[p(0,0),p(0,0)]],directed:false,threshold:0,chunkSize:2}
];
const receipts=[];
for(const fixture of fixtures){
 const source=structuredClone(fixture.edges),metrics=fixture.edges.map(forceEdgeMetric),lengths=metrics.map(m=>m.length),memory=ledger();
 const table=upperNeighbors(metrics,fixture.directed,fixture.threshold,memory,fixture.chunkSize);
 const neighbors=scalarNeighbors(metrics,fixture.directed,fixture.threshold);
 assertStorage(table,neighbors);
 let routes=fixture.edges,iterations=0,displacementCaps=0,scheduleCharge=0,legacyCharge=0;
 const active=lengths.filter(l=>l>FDEB_EPSILON).length,legacyPairs=neighbors.reduce((n,list)=>n+list.length,0)/2;
 for(const cycle of forceRouteSchedule()){
  routes=routes.map((route,index)=>lengths[index]<=FDEB_EPSILON?route:resampleRoute(route,cycle.internalSamples+2));
  const points=active*(cycle.internalSamples+2)+(routes.length-active)*2;
  scheduleCharge+=points+cycle.iterations*(routes.length*2+active*cycle.internalSamples*5+table.size*cycle.internalSamples);
  legacyCharge+=points+cycle.iterations*(routes.length*2+active*cycle.internalSamples*5+legacyPairs*cycle.internalSamples);
  for(let iteration=0;iteration<cycle.iterations;iteration++){
   const actual=advance(routes,lengths,table,cycle.step),scalar=advanceForceRoutes(routes,lengths,neighbors,cycle.step,false),current=advanceForceRoutes(routes,lengths,neighbors,cycle.step,true);
   assert.deepEqual(actual,scalar);assert.deepEqual(actual,current);
   routes=actual.routes;displacementCaps+=actual.displacementCaps;iterations++;
  }
 }
 assert.equal(scheduleCharge,legacyCharge);assert.ok(table.candidatePairs*17+scheduleCharge<10000000);
 assert.deepEqual(fixture.edges,source);
 const result={name:fixture.name,edges:metrics.length,candidates:table.candidatePairs,compatiblePairs:table.size,iterations,displacementCaps,
  candidatePlusScheduleCharge:table.candidatePairs*17+scheduleCharge,managedNeighborBytes:table.managedBytes,bufferReservations:memory.state.allocations,
  chunkSize:fixture.chunkSize,chunks:table.chunks.length,coordinateHash:coordinateHash(routes)};
 table.dispose();assert.equal(memory.state.live,0);receipts.push(result);
}
// Byte rejection is before any typed allocation at the rejected reservation;
// abort releases already reserved buffers and never returns a partial table.
const metric=forceEdgeMetric([p(0,0),p(1,0)]),small=[metric,metric];
const first=ledger(19);assert.throws(()=>upperNeighbors(small,false,0,first,1),/managed bytes/);assert.deepEqual(first.state,{live:0,peak:0,allocations:0});
const next=ledger(20);assert.throws(()=>upperNeighbors(small,false,0,next,1),/managed bytes/);assert.deepEqual(next.state,{live:0,peak:20,allocations:1});
const aborted=ledger(),controller=new AbortController();let calls=0;
assert.throws(()=>upperNeighbors(Array(4).fill(metric),false,0,aborted,1,()=>{if(++calls===3)controller.abort();controller.signal.throwIfAborted();}),{name:'AbortError'});
assert.equal(aborted.state.live,0);assert.ok(aborted.state.peak>0);
const before=ledger();assert.throws(()=>upperNeighbors(small,false,0,before,1,()=>controller.signal.throwIfAborted()),{name:'AbortError'});assert.equal(before.state.allocations,0);
const badRoutes=[[p(0,0),p(1e308,0),p(0,0)]],badLengths=[1],empty=upperNeighbors([metric],false,0,ledger(),1);
assert.throws(()=>advance(badRoutes,badLengths,empty,1),/must be finite/);
assert.throws(()=>advanceForceRoutes(badRoutes,badLengths,[[]],1,false),/must be finite/);empty.dispose();
const previous=JSON.parse(readFileSync(new URL('./force-repeat-audit.json',import.meta.url)));
assert.equal(receipts[0].coordinateHash,previous.finalCoordinateHash);
const output={schemaVersion:1,status:'evidence-only small typed-storage prototype; no product policy or performance qualification',
 source:'fa943e864982783ae8ae10bc18a4257ea8f0b2bb',node:process.version,receipts,
 boundaries:['same complete scalar/current result for every iteration','same ordered pair values and original edge degrees','same candidate/schedule work charge','caller immutable','signed zero/reverse/coincident/threshold/degenerate cases','pre-allocation byte rejection','abort before allocation and partial-allocation cleanup','overflow matches original rejection'],
 largeStaticModel:{edges:10000,pairs:8145000,chunkSize:32768,chunks:Math.ceil(8145000/32768),
  managedNeighborBytes:13*Math.ceil(8145000/32768)*32768+80004,
  note:'Arithmetic model using prior exact compatibility count only. No large table or solver is allocated. Includes last-chunk padding; no consolidation-copy stage.'},
 limitations:['JS array/Map/object overhead, caller inputs, scalar-oracle harness and old/new point buffers are not in this neighbor ledger','No full solver/public finalization/worker/codec/packet byte benchmark','No 1k or 10k solver run, SLO or P95 claim','No bounds or charges reduced'],
 prototypeSHA256:hash(readFileSync(new URL(import.meta.url))),sourceSHA256:Object.fromEntries(['forceDirected.js','compatibility.js','polyline.js'].map(name=>[name,hash(readFileSync(new URL('../../../../../src/grammar/graph/routes/'+name,import.meta.url)))]))};
writeFileSync(new URL('./force-buffer-prototype.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
