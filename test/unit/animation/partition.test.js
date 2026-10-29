import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePartitionInterpolation as prepare, samplePartitionInterpolation as sample, PARTITION_INTERPOLATION_VERSION } from '../../../src/grammar/hierarchy/partitionInterpolation.js';
import { mapPartitionBendPoint, createPartitionBendAdapter } from '../../../src/grammar/hierarchy/partitionAdapter.js';
import { bendPartitionPoint, insetPartitionBendCell } from '../../../src/grammar/hierarchy/partitionBend.js';
import { mapPartitionRectangle, mapPartitionSector, partitionRadius } from '../../../src/grammar/hierarchy/partitionMapping.js';
import { encodeValue, decodeValue } from '../../../src/persistence/codec.js';
import { expectedBendPoint } from '../../charts/partition-layouts/reference.js';

const kernel = { width:300,height:100,innerRadius:20,outerRadius:100,radiusPolicy:'equal-depth',sweep:2*Math.PI };
const bounds = {u0:0,u1:1,v0:0,v1:1};
const node = (key='root',parentKey=null,patch={}) => ({key,parentKey,...bounds,visible:true,...patch});
const endpoint = (bend=0,patch={}) => ({nodes:[node()],focusKey:'root',bend,frame:{origin:[240,180+50*bend],angle:0,handedness:1,kernel:{...kernel},gap:[0,0]},...patch});
const close = (a,b) => assert.ok(Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const point = (state,u,v) => { const {gap,...frame}=state.frame;return mapPartitionBendPoint(frame,{u,v,bend:state.bend}); };
const cell = n => Object.fromEntries(['u0','u1','v0','v1'].map(k=>[k,n[k]]));

test('typed partition tracks preserve exact immutable endpoints and offline numeric identity',()=>{
 const a=endpoint(),b=endpoint(1),saved=structuredClone([a,b]),plan=prepare(a,b);
 assert.equal(PARTITION_INTERPOLATION_VERSION,1);assert.equal(plan.kind,'partition');assert.equal(plan.mode,'partition');
 assert.ok(Object.isFrozen(plan.from.frame.kernel));assert.deepEqual([a,b],saved);
 a.nodes[0].u1=.5;b.frame.origin[0]=0;
 for(const t of [0,.25,.5,.75,1]){
  assert.deepEqual(sample(JSON.parse(JSON.stringify(plan)),t),sample(plan,t));
  assert.deepEqual(sample(decodeValue(encodeValue(plan)),t),sample(plan,t));
 }
 assert.deepEqual(sample(plan,0).state,saved[0]);assert.deepEqual(sample(plan,1).state,saved[1]);
 const signed=endpoint();signed.frame.origin[0]=-0;
 assert.ok(Object.is(sample(decodeValue(encodeValue(prepare(signed,signed))),0).state.frame.origin[0],-0));
});

test('icicle to sunburst samples agree with independent bend values and reverse sampling',()=>{
 const plan=prepare(endpoint(),endpoint(1)),reverse=prepare(endpoint(1),endpoint());
 for(const t of [0,Number.MIN_VALUE,1e-10,.25,.5,.75,1]){
  const state=sample(plan,t).state;
  for(const [u,v] of [[.5,.5],[.25,.7],[.1,.2],[1,1]]){
   const actual=point(state,u,v);
   if(t>=1e-10||t===0){const expected=expectedBendPoint(u,v,t);close(actual.x,expected.x);close(actual.y,expected.y+50*t);}
   assert.ok(Number.isFinite(actual.x)&&Number.isFinite(actual.y));
  }
  if(t===0||t>=.25)assert.deepEqual(sample(reverse,1-t).state,state);
 }
});

test('canonical frames support every compatible general direction without a second coordinate formula',()=>{
 let count=0;
 for(const orientation of ['horizontal','vertical'])for(const reverseU of [false,true])for(const reverseV of [false,true])
 for(const direction of ['clockwise','counterclockwise'])for(const pu of [false,true])for(const pv of [false,true]){
  const rect={x:20,y:30,width:320,height:180,orientation,reverseU,reverseV};
  const polar={centerX:240,centerY:200,innerRadius:20,outerRadius:120,startAngle:35,sweep:280,direction,reverseU:pu,reverseV:pv,radiusPolicy:'equal-depth'};
  const adapter=createPartitionBendAdapter(rect,polar);if(!adapter.compatible)continue;count++;
  const a=endpoint(0,{frame:{origin:adapter.origin,angle:adapter.angle0,handedness:adapter.handedness,kernel:adapter.kernel,gap:[0,0]}});
  const b=endpoint(1,{frame:{...a.frame,origin:adapter.center,angle:adapter.angle0+adapter.rotation}});
  const track=prepare(a,b);
  for(const [u,v]of[[0,0],[.3,.4],[1,1]]){
   const zero=point(sample(track,0).state,u,pv?1-v:v),uu=reverseU?1-u:u,vv=reverseV?1-v:v;
   close(zero.x,20+320*(orientation==='horizontal'?uu:vv));close(zero.y,30+180*(orientation==='horizontal'?vv:uu));
   const one=point(sample(track,1).state,u,pv?1-v:v),angle=(35+(direction==='clockwise'?1:-1)*280*(pu?1-u:u))*Math.PI/180,r=20+100*(pv?1-v:v);
   close(one.x,240+r*Math.sin(angle));close(one.y,200-r*Math.cos(angle));
  }
 }
 assert.equal(count,32);
});

test('same-family size center hole and focus changes interpolate without changing hierarchy identity',()=>{
 const a=endpoint(1,{nodes:[node(),node('child','root',{u0:.2,u1:.6,v0:.5})]});
 const b=structuredClone(a);b.focusKey='child';b.frame.origin=[400,300];b.frame.angle=2*Math.PI-.2;b.frame.kernel={...kernel,width:600,height:200,innerRadius:40,outerRadius:200};b.frame.gap=[4,8];b.nodes[1].u0=.1;b.nodes[1].u1=.8;
 const mid=sample(prepare(a,b),.5).state;
 assert.equal(mid.bend,1);assert.equal(mid.focusKey,'root');assert.equal(mid.frame.kernel.innerRadius,30);assert.equal(mid.frame.kernel.outerRadius,150);
 assert.deepEqual(mid.frame.origin,[320,265]);close(mid.frame.angle,-.1);assert.deepEqual(mid.frame.gap,[2,4]);close(mid.nodes[1].u0,.15);close(mid.nodes[1].u1,.7);
 assert.deepEqual(mid.nodes.map(n=>[n.key,n.parentKey]),[['root',null],['child','root']]);
 const rectA=endpoint(),rectB=endpoint(0,{frame:{...endpoint().frame,origin:[300,200],kernel:{...kernel,width:600,height:200}}});
 assert.equal(sample(prepare(rectA,rectB),.5).state.bend,0);assert.equal(sample(prepare(rectA,rectB),.5).state.frame.kernel.width,450);
});

test('current-frame rebasing keeps raw boundaries and current CSS gaps exactly at the new start',()=>{
 const a=endpoint(),b=endpoint(1);a.frame.gap=[2,4];b.frame.gap=[8,12];
 const current=sample(prepare(a,b),.37).state,next=endpoint(.2);next.frame.origin=[100,120];next.frame.gap=[10,6];
 const rebased=sample(prepare(current,next),0).state;
 assert.deepEqual(rebased,current);
 const inset=s=>insetPartitionBendCell(cell(s.nodes[0]),s.frame.kernel,s.bend,s.frame.gap);
 assert.deepEqual(inset(rebased),inset(current));
 assert.deepEqual(cell(current.nodes[0]),bounds,'Gap never overwrites raw normalized intervals');
 const expected=sample(prepare(current,next),.6);sample(prepare(a,b),.9);assert.deepEqual(sample(prepare(current,next),.6),expected);
});

test('topology visibility reflection and radius policy changes report distinct crossfades',()=>{
 const a=endpoint(0,{nodes:[node(),node('a','root'),node('b','root')]});
 const changes=[
  [b=>b.nodes.pop(),'topology'],[b=>b.nodes[2].parentKey='a','topology'],[b=>b.nodes.reverse(),'invalid'],
  [b=>b.nodes[1].visible=false,'visibility'],[b=>b.frame.handedness=-1,'handedness'],[b=>b.frame.kernel.radiusPolicy='equal-depth-area','radius-policy']
 ];
 for(const[change,reason]of changes){const b=structuredClone(a);change(b);if(reason==='invalid'){assert.throws(()=>prepare(a,b));continue;}
  const plan=prepare(a,b);assert.equal(plan.mode,'crossfade');assert.equal(plan.reason,reason);
  for(const t of [0,.4,1]){const out=sample(JSON.parse(JSON.stringify(plan)),t);assert.deepEqual(out.weights,[1-t,t]);assert.deepEqual(out.from,a);assert.deepEqual(out.to,b);}
 }
});

test('CSS gap at exact native boundaries agrees with rectangle and sector mapping',()=>{
 const raw={u0:.2,u1:.7,v0:.25,v1:.75},gap=[6,10];
 for(const radiusPolicy of ['equal-depth','equal-depth-area']){
  const k={...kernel,radiusPolicy},r=insetPartitionBendCell(raw,k,0,gap);
  const rect=mapPartitionRectangle(raw,{x:0,y:0,width:300,height:100,gapX:6,gapY:10});
  close(r.u0*300,rect.x);close(r.u1*300,rect.x+rect.width);close(r.v0*100,rect.y);close(r.v1*100,rect.y+rect.height);
  const p=insetPartitionBendCell(raw,k,1,gap),sector=mapPartitionSector(raw,{innerRadius:20,outerRadius:100,radiusPolicy,startAngle:-Math.PI,sweep:2*Math.PI,angularGap:6,radialGap:10});
  close(-Math.PI+2*Math.PI*p.u0,sector.startAngle);close(-Math.PI+2*Math.PI*p.u1,sector.endAngle);
  const radius=v=>partitionRadius(v,{innerRadius:20,outerRadius:100,radiusPolicy});
  close(radius(p.v0),sector.innerRadius);close(radius(p.v1),sector.outerRadius);close(radius(p.anchorV),(sector.innerRadius+sector.outerRadius)/2);
 }
});

test('intermediate gaps use current curved arc and radial distances including area depths',()=>{
 const raw={u0:.1,u1:.8,v0:.2,v1:.9};
 for(const radiusPolicy of ['equal-depth','equal-depth-area'])for(const bend of [.1,.5,.9]){
  const k={...kernel,radiusPolicy},gap=[7,9],out=insetPartitionBendCell(raw,k,bend,gap);
  const radius=v=>radiusPolicy==='equal-depth'?20+80*v:Math.sqrt(400+9600*v);
  const depth=v=>(1-bend)*100*v+bend*radius(v),r=(1-bend)*300/(2*Math.PI*bend),middle=(depth(.2)+depth(.9))/2;
  close((out.u0-.1)*2*Math.PI*bend*(r+middle),3.5);close((.8-out.u1)*2*Math.PI*bend*(r+middle),3.5);
  close(depth(out.v0)-depth(.2),4.5);close(depth(.9)-depth(out.v1),4.5);close(depth(out.anchorV),(depth(out.v0)+depth(out.v1))/2);
 }
 const tiny=insetPartitionBendCell({u0:.2,u1:.20001,v0:.5,v1:.50001},kernel,.5,[20,20]);assert.equal(tiny.visible,false);
 const zero=insetPartitionBendCell({...bounds,u1:0},kernel,.5,[0,0]);assert.equal(zero.visible,false);
 const flat=insetPartitionBendCell(bounds,{...kernel,height:0},0,[0,0]);assert.equal(flat.visible,false);
 const empty=endpoint(0,{nodes:[],focusKey:null});assert.deepEqual(sample(prepare(empty,empty),.5).state,empty);
});

test('track restoration rejects unknown versions malformed topology and inconsistent decisions',()=>{
 const a=endpoint(),plan=prepare(a,endpoint(1));
 for(const input of [null,[],{}, {...plan,version:2},{...plan,kind:'other'},{...plan,extra:1},{...plan,reason:undefined},{...plan,mode:'crossfade'},{...plan,from:undefined}])assert.throws(()=>sample(input,.5));
 const cross=prepare(a,{...a,frame:{...a.frame,handedness:-1}});assert.throws(()=>sample({...cross,reason:'topology'},.5));
 for(const modify of [v=>delete v.frame.angle,v=>v.frame.kernel.sweep=undefined,v=>v.frame.kernel.radiusPolicy=undefined,v=>v.frame.extra=1,v=>v.frame.gap=[1],v=>v.frame.gap=[-1,0],v=>v.focusKey='missing',v=>v.nodes[0].visible=1,v=>v.nodes[0].u0=2,v=>v.nodes[0].parentKey='root',v=>v.nodes.push(node()),v=>v.nodes.push(node('orphan','missing')),v=>v.nodes=[node(),node('child','root'),node('other'),node('late','root')]]){const b=structuredClone(a);modify(b);assert.throws(()=>prepare(a,b));}
 for(const progress of [-1,2,NaN,Infinity,undefined])assert.throws(()=>sample(plan,progress));
 for(const gap of [[],[0],[0,0,0],[NaN,0]])assert.throws(()=>insetPartitionBendCell(bounds,kernel,.5,gap));
 assert.throws(()=>insetPartitionBendCell(bounds,kernel,2,[0,0]));
 assert.throws(()=>insetPartitionBendCell(bounds,{...kernel,innerRadius:1e308,outerRadius:1.1e308},1,[0,0]),/finite/);
});

test('descriptor checks and global work limits reject before callbacks or oversized traversal',()=>{
 const a=endpoint();let reads=0;
 for(const path of [['frame','angle'],['nodes',0,'u0'],['frame','kernel','sweep']]){
  const b=structuredClone(a);let owner=b;for(const key of path.slice(0,-1))owner=owner[key];Object.defineProperty(owner,path.at(-1),{enumerable:true,get(){reads++;return 1;}});assert.throws(()=>prepare(a,b),/accessors/);
 }
 const plan=prepare(a,a);assert.throws(()=>sample({...plan,get from(){reads++;return a;}},.5),/accessors/);assert.equal(reads,0);
 assert.throws(()=>prepare(a,{...a,nodes:Array(10001)}),/10000/);
 const key='x'.repeat(5_000_000),huge=endpoint(0,{nodes:[node(key)],focusKey:null});assert.throws(()=>prepare(huge,huge),/work/);
 const chain=Array.from({length:10000},(_,i)=>node(String(i),i?String(i-1):null));const deep=endpoint(0,{nodes:chain,focusKey:'9999'});
 assert.equal(sample(prepare(deep,deep),.5).state.nodes.length,10000);
 for(const frame of [{...a.frame,origin:[0]},{...a.frame,angle:NaN},{...a.frame,handedness:0}]){const{gap,...basis}=frame;assert.throws(()=>mapPartitionBendPoint(basis,{u:.5,v:.5,bend:0}));}
});
