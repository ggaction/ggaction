import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {encodeRowKey} from '../../../../../src/core/itemIdentity.js';
import {chart} from '../../../../../src/index.js';
import {edgeRouteJob} from '../../../../../src/materialization/graph/routeResource.js';
import {normalizeRouteIntent} from '../../../../../src/grammar/graph/routes/options.js';
import {validateRouteJob as canonicalValidate} from '../../../../../src/grammar/graph/routes/job.js';
import {createRouteJobStages,validateRouteJob,stageCounters} from '../../../../../.artifacts/route-v2-proposal/job.generated.mjs';
const policy=Object.freeze({maxBytes:100_000,maxSteps:100_000,maxDepth:128});
let program=chart().createCanvas({width:200,height:120})
 .createData({id:'nodes',values:[0,1,2].map(id=>({id,label:`node-${id}`,big:42n}))})
 .createData({id:'edges',values:[0,1,2].map(id=>({id,source:id,target:(id+1)%3}))})
 .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'source',target:'target',attributes:['label','big']})
 .layoutGraph({id:'layout',method:'circular'})
 .createData({id:'tree',values:[{id:'root',parent:null,value:0},...[0,1,2].map(id=>({id,parent:'root',value:1}))]})
 .createHierarchyData({id:'hierarchy',data:'tree',key:'id',parent:'parent',value:'value'})
 .layoutHierarchy({id:'tree-layout',method:'tree',options:{nodeSize:[1,1],siblingGap:1,depthGap:10,orientation:'vertical'}});
const resource=(kind,id)=>program.semanticSpec.resources.find(x=>x.kind===kind&&x.id===id);
program=program.layoutGraph({id:'hierarchy-graph-layout',method:'fixed',options:{positions:[0,1,2].map(key=>{const node=resource('layout','tree-layout').result.nodes.find(node=>node.key===encodeRowKey(key));return {key,x:node.x,y:node.y};})}});
function payload(job){return {inputs:structuredClone(job.inputs),intent:structuredClone(job.intent),input:structuredClone(job.input),...(job.hierarchy?{hierarchy:structuredClone(job.hierarchy)}:{})};}
const reason=Error('cancel staged hash'),records=[];
async function drain(input,viewport,{abortAt,signal,mutate}={}){
 const own=signal?undefined:new AbortController();signal??=own.signal;
 const before=stageCounters().registrations;let iterator,turns=0,terminal=0,published=0;
 try{
  signal.throwIfAborted();iterator=createRouteJobStages(input,viewport,policy);
  while(true){
   signal.throwIfAborted();const next=iterator.next();
   if(next.done){signal.throwIfAborted();terminal++;published++;assert.equal(stageCounters().registrations,before+1);return {job:next.value,turns,published,terminal};}
   turns++;assert.equal(stageCounters().registrations,before);
   if(turns===1&&mutate)setTimeout(mutate,0);
   if(turns===abortAt)setTimeout(()=>own.abort(reason),0);
   await new Promise(resolve=>setTimeout(resolve,0));signal.throwIfAborted();
  }
 }catch(error){terminal++;assert.equal(published,0);assert.equal(stageCounters().registrations,before);throw error;}
 finally{iterator?.return();assert.equal(stageCounters().activeHashes,0);assert.equal(terminal,1);}
}
for(const method of ['edge-path','force-directed','density','hierarchical'])for(const coordinateSpace of ['world','screen']){
 const hierarchical=method==='hierarchical';
 const intent=normalizeRouteIntent(method,hierarchical?{mapping:[0,1,2].map(id=>({nodeKey:id,hierarchyKey:id}))}:{},coordinateSpace);
 const native=edgeRouteJob(program,resource('graph','graph'),resource('layout',hierarchical?'hierarchy-graph-layout':'layout'),intent,
  ...(hierarchical?[resource('hierarchy','hierarchy'),resource('layout','tree-layout')]:[]));
 const raw=payload(native),view=structuredClone(native.viewport);
 const completed=await drain(raw,view,{mutate:()=>{raw.input.positions[0].x=999;raw.inputs[0].revision++;if(view)view.x=999;}});
 assert.deepEqual(completed.job,native);assert.equal(validateRouteJob(completed.job),completed.job);
 const checked=canonicalValidate(completed.job);assert.notEqual(checked,completed.job);assert.deepEqual(checked,native);
 for(const at of [1,completed.turns])await assert.rejects(drain(payload(native),structuredClone(native.viewport),{abortAt:at}),error=>error===reason);
 records.push({method,coordinateSpace,hash:native.inputHash,turns:completed.turns,mutationIsolated:true,exactSameModuleProof:true,crossModuleFullValidation:true,cancelAt:[1,completed.turns]});
}
let getters=0;
const hostile={get input(){getters++;throw Error('getter');}};
await assert.rejects(drain(hostile,null,{signal:AbortSignal.abort(reason)}),error=>error===reason);
await assert.rejects(drain(hostile,null),/accessor/);assert.equal(getters,0);
const report={source:'207e18ac7e87aab25ff2c56f8e3eeacf10186d81',node:process.version,status:'small-native-job-stage-exact',records,counters:stageCounters(),getters,
 scope:'evidence-only original v1 body generator in temporary module; no product modifications or v2 admission',
 finalNativeHandlePublished:false,largeFixtureRun:false,latencyQualified:false,
 remaining:['snapshot and validation before first yield','numeric v2 policy integration','result validation and final materialization','full native update closure','whole preparation100ms']};
await writeFile(process.argv[2]??'.artifacts/route-v2-proposal/audit22.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,records.length,report.counters);
