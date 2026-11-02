import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../src/index.js';
import {chart as basic} from '../../../src/basic.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames,createAnimationPlayer} from '../../../src/animation.js';
import {decodeAnimationEnvelope,encodeAnimationEnvelope} from '../../../src/animation/envelopeCodec.js';
import {exportTransitionPlan,restoreTransitionPlan,transitionResources} from '../../../src/animation/planner.js';
import {animationResourceAccounting} from '../../../src/animation/resources.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const limits={maxEndpointNodes:200002,maxOutputNodes:100001},options={durationMs:100,easing:'linear'};
const points=(count=2,make=chart)=>make().createCanvas({width:200,height:160,margin:20,plotBorder:false})
 .createData({id:'rows',keyField:'id',values:Array.from({length:count},(_,id)=>({id,x:(id+1)/(count+1),y:(count-id)/(count+1)}))})
 .createPointMark({id:'points'}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});
const prepare=(from,to=from,extra=limits)=>planTransition({from,to,options:{...options,...extra}});

test('explicit node options alone select version4 while omitted options preserve version3 bytes and failure order',()=>{
 const from=points(),ordinary=prepare(from,from,{}),legacy=serializeAnimation(ordinary);
 assert.equal(ordinary.version,3);assert.equal(decodeAnimationEnvelope(legacy).plan.version,3);
 assert.equal(serializeAnimation(prepare(from,from,{})),legacy);
 for(const extra of[{maxEndpointNodes:20},{maxOutputNodes:20},limits]){
  const plan=prepare(from,from,extra),wire=decodeAnimationEnvelope(serializeAnimation(plan)).plan;
  assert.equal(plan.version,4);assert.equal(wire.kernels.transition,4);
  assert.deepEqual(wire.limits,{maxEndpointNodes:extra.maxEndpointNodes??10000,maxOutputNodes:extra.maxOutputNodes??10000});
  assert.deepEqual(Object.keys(wire),['kind','version','limits','kernels','durationMs','easing','from','to','vectors']);
  assert.deepEqual(Object.keys(wire.from),['object']);assert.ok(Array.isArray(wire.vectors));
  assert.deepEqual(sampleTransition(plan,50),sampleTransition(ordinary,50));
 }
 assert.throws(()=>planTransition({from:{},to:{},options:{durationMs:-1}}),/duration/i);
 assert.throws(()=>planTransition({from:{},to:{},options:{durationMs:1,unknown:true}}),/Unknown transition options/);
 let reads=0;const prior=Object.getOwnPropertyDescriptor(Object.prototype,'maxEndpointNodes');
 try{Object.defineProperty(Object.prototype,'maxEndpointNodes',{configurable:true,get(){reads++;return 200002;}});assert.equal(prepare(from,from,{}).version,3);}
 finally{if(prior===undefined)delete Object.prototype.maxEndpointNodes;else Object.defineProperty(Object.prototype,'maxEndpointNodes',prior);}
 assert.equal(reads,0);
});

test('explicit limits validate exact safe bounds own undefined and complete endpoint counts atomically',()=>{
 const from=points(),before=JSON.stringify(from);
 for(const key of Object.keys(limits))for(const value of[undefined,null,0,-1,1.5,NaN,Infinity,limits[key]+1,'100'])assert.throws(()=>prepare(from,from,{[key]:value}));
 assert.throws(()=>prepare(from,from,{maxEndpointNodes:1}),/endpoint (?:nodes|size)/);
 assert.throws(()=>prepare(from,from,{maxOutputNodes:1}),/endpoint (?:nodes|size)/);
 let reads=0;assert.throws(()=>planTransition({from,to:from,options:{...options,get maxOutputNodes(){reads++;return 100001;}}}),/accessors/);assert.equal(reads,0);
 assert.equal(JSON.stringify(from),before);
 const large=points(5000);assert.throws(()=>prepare(large,large,{}),/endpoint (?:nodes|size)/);
 const plan=prepare(large);assert.equal(plan.version,4);assert.equal(sampleTransition(plan,50).scene.nodes.length,5001);
 assert.throws(()=>prepare(large,large,{maxEndpointNodes:10001}),/endpoint (?:nodes|size)/);
 assert.throws(()=>prepare(large,large,{maxOutputNodes:5000}),/endpoint (?:nodes|size)/);
 const frame=sampleTransition(plan,50);assert.throws(()=>prepare(frame,large,{}),/endpoint (?:nodes|size)/);
 assert.equal(sampleTransition(prepare(frame,large),0),frame);
 assert.equal(sampleTransition(plan,0).graphicSpec,large.graphicSpec);
});

test('version4 public replay preserves concrete values timeline all decisions Basic and partition frames',()=>{
 const from=points(),to=from.editScale({id:'x',domain:[0,2],nice:false}),base=prepare(from,to),decision=sampleTransition(base,50).decisions.find(item=>item.itemKey);
 const plan=planTransition({from,to,options:{...options,...limits,tracks:[{target:{ownerKey:decision.ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]}],markers:[{id:'half',timeMs:50}]}});
 const text=serializeAnimation(plan,{repeat:Infinity,rate:-2,reducedMotion:true}),restored=deserializeAnimation(text);
 assert.equal(restored.plan.version,4);assert.equal(animationResourceAccounting(transitionResources(restored.plan)).native,false);
 assert.equal(serializeAnimation(restored.plan,restored.playback),text);
 assert.ok(Object.hasOwn(decodeAnimationEnvelope(text).plan,'timeline'));
 for(const time of[0,25,50,75,100])assert.deepEqual(sampleTransition(restored.plan,time),sampleTransition(plan,time));
 const current=sampleTransition(plan,37),rebased=prepare(current,to);assert.equal(sampleTransition(rebased,0),current);
 const offline=deserializeAnimation(serializeAnimation(rebased)).plan;for(const time of[0,50,100])assert.deepEqual(sampleTransition(offline,time),sampleTransition(rebased,time));
 for(const [first,last]of[[points(1,basic),undefined],(()=>{const p=partitionFrameEndpoints({labels:true});return[p.before,p.after];})()]){
  const source=prepare(first,last??first),copy=deserializeAnimation(serializeAnimation(source)).plan;
  for(const time of[0,37,100])assert.deepEqual(sampleTransition(copy,time),sampleTransition(source,time));
 }
 assert.deepEqual(exportAnimationFrames(plan,{timesMs:[0,50,100]}).map(item=>item.timeMs),[0,50,100]);
});

test('version4 restore rejects forged metadata refs shapes actual graphic values and sample views before authentic output',()=>{
 const from=points(),plan=prepare(from),original=sampleTransition(plan,50),payload=()=>structuredClone(decodeAnimationEnvelope(serializeAnimation(plan)));
 for(const mutate of[p=>p.plan.extra=true,p=>delete p.plan.limits,p=>delete p.plan.limits.maxEndpointNodes,p=>p.plan.limits.extra=true,p=>p.plan.limits.maxOutputNodes=undefined,p=>p.plan.limits.maxEndpointNodes=1,p=>p.plan.kernels.transition=3,p=>p.plan.kernels.position='future',p=>delete p.plan.kernels.appearance,p=>p.plan.kind='other',p=>p.plan.durationMs=-1,p=>p.plan.easing='spring',p=>p.plan.from={records:{length:Number.MAX_SAFE_INTEGER,shapes:[],shape:{constant:0},columns:[]}},p=>p.plan.to={array:[{records:{length:2,shapes:[{keys:['x']}],shape:{constant:0},columns:[[0,[['x',{vector:999999}]]]]}}]},p=>p.plan.timeline={literal:{version:'future'}}]){
  const value=payload();mutate(value);assert.throws(()=>deserializeAnimation(encodeAnimationEnvelope(value)));
 }
 const old=exportTransitionPlan(prepare(from,from,{}));
 for(const change of[value=>value.graphicSpec.objects.points.items[0].properties.x=999,value=>value.positions[1].x.value=NaN]){
  const value=payload(),endpoint=structuredClone(old.from);change(endpoint);value.plan.from={literal:endpoint};assert.throws(()=>deserializeAnimation(encodeAnimationEnvelope(value)));
 }
 const current=sampleTransition(plan,50),rebased=prepare(current,from),bad=structuredClone(decodeAnimationEnvelope(serializeAnimation(rebased)));
 bad.plan.from={literal:{scene:current.scene,identities:[],backgrounds:[],positions:[],view:{progress:current.progress,decisions:current.decisions}}};assert.throws(()=>deserializeAnimation(encodeAnimationEnvelope(bad)));
 const wire=structuredClone(exportTransitionPlan(plan));let reads=0;Object.defineProperty(wire,'from',{enumerable:true,get(){reads++;return {};}});assert.throws(()=>restoreTransitionPlan(wire),/accessors/);assert.equal(reads,0);
 assert.deepEqual(sampleTransition(plan,50),original);
});

test('player interruption preserves explicit node options and rejected changes preserve the active run',()=>{
 const from=points(5000),to=from.editScale({id:'x',domain:[0,2],nice:false}),plan=prepare(from,to);let now=0,id=0;const pending=new Map(),drawn=[];
 const clock={now:()=>now,requestFrame:callback=>{pending.set(++id,callback);return id;},cancelFrame:key=>pending.delete(key)};
 const player=createAnimationPlayer({plan,clock,render:frame=>drawn.push(frame)});player.play();now=25;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(now));
 const current=player.getFrame(),state=player.getState();
 assert.throws(()=>player.interrupt({to,options:{...options,maxOutputNodes:undefined}}));assert.deepEqual(player.getState(),state);assert.equal(player.getFrame(),current);
 assert.throws(()=>player.interrupt({to,options}));assert.equal(player.getFrame(),current);
 player.interrupt({to,options:{...options,...limits}});assert.equal(player.getFrame(),current);player.seek(50);assert.equal(player.getFrame().scene.nodes.length,5001);player.dispose();assert.equal(pending.size,0);
});

test('all continuous point kernels retain complete native and offline frames through version4',()=>{
 for(const type of['linear','time','log','pow','sqrt','symlog']){
  const parameters=type==='log'?{base:10}:type==='pow'?{exponent:2}:type==='symlog'?{constant:1}:{};
  const temporal=type==='time',domain=temporal?[Date.UTC(2020,0,1),Date.UTC(2020,1,1)]:[1,100];
  const from=chart().createCanvas({width:200,height:160,margin:20,plotBorder:false})
   .createData({id:'rows',keyField:'id',values:[{id:'a',x:temporal?'2020-01-10':10,y:20},{id:'b',x:temporal?'2020-01-20':40,y:60}]})
   .createPointMark({id:'points',fill:'#e11d48',opacity:.7,stroke:'#112233',strokeWidth:2})
   .encodeX({field:'x',...(temporal?{fieldType:'temporal'}:{}),scale:{id:'x',type,domain,nice:false,...parameters}})
   .encodeY({field:'y',scale:{id:'y',domain:[0,100],nice:false}});
  const to=from.editScale({id:'x',domain:temporal?[domain[0],Date.UTC(2020,3,1)]:[1,1000],nice:false}),legacy=prepare(from,to,{}),explicit=prepare(from,to),offline=deserializeAnimation(serializeAnimation(explicit)).plan;
  for(const time of[0,37,100]){assert.deepEqual(sampleTransition(explicit,time),sampleTransition(legacy,time),type);assert.deepEqual(sampleTransition(offline,time),sampleTransition(legacy,time),type);}
 }
});

test('version4 header rejection precedes column allocation and inherited views are never read',()=>{
 const from=points(),plan=prepare(from),baseline=sampleTransition(plan,50),wire=exportTransitionPlan(plan);
 const NativeArray=globalThis.Array;
 for(const mutate of[value=>value.durationMs=-1,value=>value.easing='future',value=>value.kernels.transition=3,value=>value.kernels.position='future',value=>value.kernels.extra=true,value=>delete value.kernels.appearance,value=>value.kernels.timeline='keyframe-schedule@1']){
  const bad=structuredClone(wire);mutate(bad);let arrays=0;
  try{globalThis.Array=new Proxy(NativeArray,{construct(target,args,newTarget){arrays++;return Reflect.construct(target,args,newTarget);}});assert.throws(()=>restoreTransitionPlan(bad));}
  finally{globalThis.Array=NativeArray;}
  assert.equal(arrays,0);
 }
 let reads=0;const prior=Object.getOwnPropertyDescriptor(Object.prototype,'view');
 try{
  Object.defineProperty(Object.prototype,'view',{configurable:true,get(){reads++;return undefined;}});
  for(const source of[prepare(from,from,{}),plan])assert.deepEqual(sampleTransition(restoreTransitionPlan(exportTransitionPlan(source)),50),baseline);
 }finally{if(prior===undefined)delete Object.prototype.view;else Object.defineProperty(Object.prototype,'view',prior);}
 assert.equal(reads,0);
});

test('plan version dispatch reads only an own data descriptor without executing either getter',()=>{
 const from=points(),plan=prepare(from),wire=structuredClone(exportTransitionPlan(plan));
 let versionReads=0,descriptorReads=0;
 Object.defineProperty(wire,'version',{configurable:true,enumerable:true,get(){versionReads++;return 4;}});
 const prior=Object.getOwnPropertyDescriptor(Object.prototype,'value');
 try{
  Object.defineProperty(Object.prototype,'value',{configurable:true,get(){descriptorReads++;return 4;}});
  assert.throws(()=>restoreTransitionPlan(wire),/accessors/);
 }finally{delete Object.prototype.value;if(prior!==undefined)Object.defineProperty(Object.prototype,'value',prior);}
 assert.equal(versionReads,0);assert.equal(descriptorReads,0);
});
