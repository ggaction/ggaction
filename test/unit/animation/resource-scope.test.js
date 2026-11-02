import assert from 'node:assert/strict';
import test from 'node:test';
import {chart,hconcat} from '../../../src/index.js';
import {ChartProgram} from '../../../src/core/ChartProgram.js';
import {getErrorDetails} from '../../../src/core/diagnostics.js';
import {planTransition,sampleTransition} from '../../../src/animation.js';
import {planTransitionWithResources,exportScopedTransition,restoreScopedTransition,transitionResources,transitionColumnMetrics} from '../../../src/animation/planner.js';
import {createTransitionResourceScope,createOfflineResourceScope,animationResourceLimits,animationColumnLimits,validateAnimationResourceWork,validateAnimationColumnCount,pointAnimationRowLimit,animationResourceAccounting,validatePreparedEndpointResources} from '../../../src/animation/resources.js';
import {validateAnimationColumns} from '../../../src/animation/columnCodec.js';
import {encodeAnimationEnvelope,decodeAnimationEnvelope} from '../../../src/animation/envelopeCodec.js';
import {partitionFrameEndpoints} from '../../support/partition-frames.js';
const limits={maxEndpointNodes:200002,maxOutputNodes:100001},options={durationMs:100,easing:'linear'};
const points=()=>chart().createCanvas({width:200,height:160,margin:20,plotBorder:false}).createData({id:'rows',keyField:'id',values:[{id:1,x:.2,y:.4},{id:2,x:.3,y:.6}]}).createPointMark({id:'points'}).encodeX({field:'x',scale:{id:'x',domain:[0,1],nice:false}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}});

test('private explicit scope preserves native endpoints offline values and flat rebase ownership',()=>{
 const from=points(),to=from.editScale({id:'x',domain:[0,2],nice:false}),plan=planTransitionWithResources({from,to,options},limits);
 assert.equal(plan.version,3);assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);
 assert.equal(animationResourceAccounting(transitionResources(plan)).native,true);assert.ok(transitionColumnMetrics(plan).encodedValues>0);
 const restored=restoreScopedTransition(decodeAnimationEnvelope(encodeAnimationEnvelope(exportScopedTransition(plan))));
 assert.equal(animationResourceAccounting(transitionResources(restored)).native,false);
 for(const time of[0,37,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(plan,time));
 const frame=sampleTransition(plan,37),rebase=planTransitionWithResources({from:frame,to,options},limits);
 assert.equal(sampleTransition(rebase,0),frame);
 const offlineFrame=sampleTransition(restored,37),fromOffline=planTransitionWithResources({from:offlineFrame,to,options},limits);
 assert.equal(animationResourceAccounting(transitionResources(fromOffline)).native,false);
 assert.deepEqual(sampleTransition(fromOffline,50),sampleTransition(rebase,50));
 const ordinary=sampleTransition(planTransition({from,to,options}),50);assert.doesNotThrow(()=>planTransitionWithResources({from:ordinary,to,options},limits));
 const ordinaryOffline=sampleTransition(restoreScopedTransition(exportScopedTransition(plan)),50);assert.doesNotThrow(()=>planTransitionWithResources({from:ordinaryOffline,to,options},limits));
});

test('native scoped admission retains nested owners and each nonpoint collection limit',()=>{
 const point=points(),native=hconcat({programs:[{id:'left',program:point},{id:'right',program:point}]});
 assert.doesNotThrow(()=>planTransitionWithResources({from:native,to:native,options},limits));
 const {before,after}=partitionFrameEndpoints({labels:true});assert.doesNotThrow(()=>planTransitionWithResources({from:before,to:after,options},limits));
 const graphic={objects:{stray:{type:'circle',items:Array(10001).fill({id:'x',properties:{x:1,y:1,radius:1}})}},order:[]};
 const unowned=new ChartProgram({graphicSpec:graphic});assert.throws(()=>createTransitionResourceScope(unowned,unowned,limits),/10000/);
 const owner=point.graphicSpec.objects.points;
 const forged=new ChartProgram({...point,graphicSpec:{...point.graphicSpec,objects:{...point.graphicSpec.objects,points:{...owner,items:Array(100001).fill(owner.items[0])}}}});
 assert.throws(()=>createTransitionResourceScope(forged,forged,limits),/50000/);
 assert.throws(()=>createTransitionResourceScope({...point},point,limits),/exact native/);
 const single=new ChartProgram({graphicSpec:{objects:{only:{type:'rect',properties:{x:0,y:0,width:1,height:1}}},order:['only']}});
 let reads=0;const prior=Object.getOwnPropertyDescriptor(Object.prototype,'items');
 try{
  Object.defineProperty(Object.prototype,'items',{configurable:true,get(){reads++;return undefined;}});
  createTransitionResourceScope(single,single,{maxEndpointNodes:20,maxOutputNodes:10});
 }finally{if(prior===undefined)delete Object.prototype.items;else Object.defineProperty(Object.prototype,'items',prior);}
 assert.equal(reads,0);
});

test('closed limits token identity and explicit optin cannot be forged by shallow freezes',()=>{
 const point=points();
 let reads=0;
 const prior=Object.getOwnPropertyDescriptor(Object.prototype,'from');
 try{
  Object.defineProperty(Object.prototype,'from',{configurable:true,get(){reads++;return point;}});
  assert.throws(()=>planTransitionWithResources({to:point,options},limits),/own endpoints/);
 }finally{if(prior===undefined)delete Object.prototype.from;else Object.defineProperty(Object.prototype,'from',prior);}
 assert.equal(reads,0);
 assert.throws(()=>createOfflineResourceScope({}),/explicit node limits/);
 for(const bad of[{},undefined,{extra:1},{maxEndpointNodes:0},{maxEndpointNodes:200003},{maxOutputNodes:100002},{maxOutputNodes:undefined},{maxOutputNodes:1.5}])assert.throws(()=>createTransitionResourceScope(point,point,bad));
 assert.throws(()=>createTransitionResourceScope(point,point,{get maxOutputNodes(){reads++;return 10;}}),/accessor/);assert.equal(reads,0);
 for(const scope of[{},Object.freeze({})]){
  assert.throws(()=>animationResourceLimits(scope),/authentic/);assert.throws(()=>validateAnimationResourceWork(1,'Animation preparation work',scope),/authentic/);
  assert.throws(()=>pointAnimationRowLimit(point,point.semanticSpec.layers[0],scope),/authentic/);
 }
 const scoped=createTransitionResourceScope(point,point,{maxEndpointNodes:10});assert.deepEqual(animationResourceLimits(scoped),{maxEndpointNodes:10,maxOutputNodes:10000});
 assert.throws(()=>pointAnimationRowLimit(points(),point.semanticSpec.layers[0],scoped),/exact native/);
 const bar=point.semanticSpec.layers[0];assert.throws(()=>pointAnimationRowLimit(point,{...bar,id:'other'},scoped),/exact native point/);
 assert.equal(pointAnimationRowLimit(point,bar),10000);assert.equal(pointAnimationRowLimit(point,bar,scoped),50000);
 assert.equal(animationResourceLimits(),undefined);assert.equal(animationColumnLimits().expandedValues,10000000);
});

test('scoped work preserves exact canonical charges while every other owner stays at ten million',()=>{
 const point=points(),scope=createTransitionResourceScope(point,point,limits);
 assert.equal(validateAnimationResourceWork(133456501,'Animation preparation work',scope),133456501);
 assert.equal(validateAnimationResourceWork(16950544,'Partition animation track work',scope),16950544);
 for(const label of['Animation native sample work','Partition animation frame work','Animation frame export work'])assert.throws(()=>validateAnimationResourceWork(10000001,label,scope),/10000000/);
 assert.throws(()=>validateAnimationResourceWork(10000001,'Animation preparation work'),/10000000/);
 assert.throws(()=>validateAnimationResourceWork(140000001,'Animation preparation work',scope),/140000000/);
 for(const[kind,max]of[['expandedValues',12000000],['descriptors',16000000],['cells',16000000]]){assert.equal(validateAnimationColumnCount(max,kind,scope),max);assert.throws(()=>validateAnimationColumnCount(max+1,kind,scope));}
 assert.throws(()=>validateAnimationColumnCount(1,'other',scope),/Unknown/);assert.throws(()=>validateAnimationColumnCount(Infinity,'cells',scope),/safe integer/);
 assert.deepEqual(animationResourceAccounting(scope).maximumWork,{'Animation preparation work':140000001,'Partition animation track work':16950544});
});

test('scope work counters remain own data under inherited optional getters',()=>{
 let reads=0,receipt;const prior=Object.getOwnPropertyDescriptor(Object.prototype,'work');
 try{
  Object.defineProperty(Object.prototype,'work',{configurable:true,get(){reads++;return new Map();}});
  const scope=createOfflineResourceScope({maxOutputNodes:10});
  validateAnimationResourceWork(123,'Animation preparation work',scope);receipt=animationResourceAccounting(scope);
 }finally{if(prior===undefined)delete Object.prototype.work;else Object.defineProperty(Object.prototype,'work',prior);}
 assert.equal(reads,0);assert.deepEqual(receipt.maximumWork,{'Animation preparation work':123});
});

test('native point admission never reads an inherited capacity option',()=>{
 const point=points();let reads=0,maximum;
 const prior=Object.getOwnPropertyDescriptor(Object.prototype,'maxItems');
 try{
  Object.defineProperty(Object.prototype,'maxItems',{configurable:true,get(){reads++;return 100000;}});
  const scope=createTransitionResourceScope(point,point,limits);maximum=pointAnimationRowLimit(point,point.semanticSpec.layers[0],scope);
 }finally{if(prior===undefined)delete Object.prototype.maxItems;else Object.defineProperty(Object.prototype,'maxItems',prior);}
 assert.equal(reads,0);assert.equal(maximum,50000);
 const explicit=chart().createData({values:[{x:1,y:1},{x:2,y:2}]}).createPointMark({id:'points',maxItems:3});
 assert.equal(Object.hasOwn(explicit,'markConfigs'),false);
 const scope=createTransitionResourceScope(explicit,explicit,limits);
 assert.equal(pointAnimationRowLimit(explicit,explicit.semanticSpec.layers[0],scope),3);
});

test('scoped expansion is preflighted separately from legacy literal accounting',()=>{
 const scope=createOfflineResourceScope(limits),columns={kind:'animation-columns',version:1,vectors:[],root:{records:{length:100000,shapes:[{keys:['x']}],shape:{constant:0},columns:[[0,[['x',{constant:Array(101).fill(1)}]]]]}}};
 assert.throws(()=>validateAnimationColumns(columns),e=>getErrorDetails(e)?.limit===10000000);
 assert.equal(validateAnimationColumns(columns,scope).logicalValues,10300001);
 columns.root.records.columns[0][1][0][1].constant=Array(121).fill(1);assert.throws(()=>validateAnimationColumns(columns,scope),e=>getErrorDetails(e)?.limit===12000000);
});

test('frame resource admission requires authentication and source omission preserves the ordinary path',()=>{
 const point=points(),scope=createTransitionResourceScope(point,point,limits),plan=planTransition({from:point,to:point,options}),frame=sampleTransition(plan,50);
 assert.throws(()=>createTransitionResourceScope({...frame},point,limits),/exact native/);
 assert.throws(()=>exportScopedTransition(plan),/explicit resource/);
 for(const mutate of[p=>p.kind='other',p=>p.version=2,p=>p.extra=true,p=>delete p.columns,p=>delete p.limits.maxEndpointNodes,p=>p.limits.extra=true]){const input=structuredClone(exportScopedTransition(planTransitionWithResources({from:point,to:point,options},limits)));mutate(input);assert.throws(()=>restoreScopedTransition(input));}
 const source=planTransitionWithResources({from:point,to:point,options},limits),restored=restoreScopedTransition(structuredClone(exportScopedTransition(source)));assert.equal(transitionColumnMetrics(restored),undefined);
 assert.throws(()=>planTransitionWithResources({from:point,to:point,options},{maxEndpointNodes:1,maxOutputNodes:100001}),/endpoint nodes/);
 assert.throws(()=>planTransitionWithResources({from:point,to:point,options},{maxEndpointNodes:200002,maxOutputNodes:1}),/endpoint size/);
});

test('one hundred distinct rebases admit only the current canonical native owners',()=>{
 const source=points(),first=source.editScale({id:'x',domain:[0,2],nice:false});
 let frame=sampleTransition(planTransitionWithResources({from:source,to:first,options},limits),50);
 for(let index=0;index<100;index++){
  const target=source.editScale({id:'x',domain:[0,3+index/100],nice:false});
  const next=planTransitionWithResources({from:frame,to:target,options},limits);
  assert.equal(sampleTransition(next,0),frame);frame=sampleTransition(next,50);
  const scope=createTransitionResourceScope(frame,target,limits);
  assert.equal(pointAnimationRowLimit(target,target.semanticSpec.layers[0],scope),50000);
  for(const historical of[source,first])assert.throws(()=>pointAnimationRowLimit(historical,historical.semanticSpec.layers[0],scope),/exact native owner/);
 }
});

test('scoped endpoint counts distinguish bodies guides backgrounds and anonymous rows',()=>{
 const scope=createOfflineResourceScope({maxEndpointNodes:200002,maxOutputNodes:100001}),endpoint={scene:{nodes:Array(10001).fill({type:'circle'})},identities:Array(10001).fill(undefined),backgrounds:[]};
 assert.throws(()=>validatePreparedEndpointResources(endpoint,Array(10001).fill(null),scope),/owner items/);
 const guide={identity:{namespaces:[],owner:'axis',component:'ticks'}};
 assert.throws(()=>validatePreparedEndpointResources(endpoint,Array(10001).fill(guide),scope),/owner items/);
 validatePreparedEndpointResources(endpoint,Array.from({length:10001},(_,i)=>({identity:{namespaces:[],owner:i<10000?'first':'second',component:'ticks'}})),scope);
 assert.throws(()=>validatePreparedEndpointResources(endpoint,[],createOfflineResourceScope({maxOutputNodes:1})),/endpoint nodes/);
 assert.doesNotThrow(()=>validatePreparedEndpointResources(endpoint,[],undefined));
});
