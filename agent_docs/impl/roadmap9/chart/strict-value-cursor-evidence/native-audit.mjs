// Small native input audit of the private product cursor; no large or timing claim.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chart} from '../../../../../src/index.js';
import {cloneAndFreeze,freezeOwned,isOwned} from '../../../../../src/core/immutable.js';
import {prepareGraphEdgeRoutes,createGraphRouteExecutor} from '../../../../../src/graph.js';
import {encodeValue} from '../../../../../src/core/valueEncoding.js';
import {canonicalJSON} from '../../../../../src/core/contentDigest.js';
import {createSha256State,updateSha256,finishSha256,clearSha256} from '../../../../../src/core/sha256.js';
import {edgeRouteJob} from '../../../../../src/materialization/graph/routeResource.js';
import {createRouteJob,validateRouteJob,computeRouteJob,routeValueHash} from '../../../../../src/grammar/graph/routes/job.js';
import {validateRouteResult} from '../../../../../src/grammar/graph/routes/result.js';
import {createEncodedValueCursor as createStrictTaggedCursor,advanceEncodedValueCursor as advanceStrictTaggedCursor,clearEncodedValueCursor as clearStrictTaggedCursor} from '../../../../../src/core/encodedValueCursor.js';

const encoder=new TextEncoder(),records=[];
function deeplyOwned(value){
  if(value===null||typeof value!=='object')return;
  assert.equal(isOwned(value),true);assert.equal(Object.isFrozen(value),true);
  for(const child of Object.values(value))deeplyOwned(child);
}
const limits={maxBytes:100_000,maxDepth:64,maxSteps:100_000};
function cursor(snapshot,chunk=64,maxBytes=limits.maxBytes){
  const handle=createStrictTaggedCursor(snapshot,{...limits,maxBytes}),state=createSha256State(),chunks=[];
  let result,turns=0;
  try{
    do{result=advanceStrictTaggedCursor(handle,{maxBytes:chunk,maxSteps:4096});turns++;
      updateSha256(state,result.bytes);chunks.push(Buffer.from(result.bytes));}while(!result.done);
    return {bytes:Buffer.concat(chunks),hash:finishSha256(state),turns,stats:result.stats};
  }finally{clearStrictTaggedCursor(handle);clearSha256(state);}
}
function equal(snapshot,label){
  const bytes=Buffer.from(encoder.encode(canonicalJSON(encodeValue(snapshot))));
  const hash=createHash('sha256').update(bytes).digest('hex');
  for(const chunk of [1,7,64,1024]){
    const actual=cursor(snapshot,chunk,bytes.length);
    assert.deepEqual(actual.bytes,bytes);assert.equal(actual.hash,hash);assert.equal(actual.stats.bytes,bytes.length);
  }
  assert.throws(()=>cursor(snapshot,64,bytes.length-1),/exceed/i);
  records.push({label,encodedBytes:bytes.length,sha256:hash,chunks:[1,7,64,1024],exactQuota:true,oneByteShortRejected:true});
}
const shared={z:-0,text:'quote"\\\u0000\b\t\n\f\r\ud800😀\udfff',bigint:12345678901234567890n};
const p=chart().createCanvas({width:200,height:100})
  .createData({id:'nodes',values:[{key:10,payload:shared},{key:2,payload:{shared}},{key:'2',payload:{}}]})
  .createData({id:'edges',values:[{id:10,s:10,t:'2'},{id:2,s:10,t:2},{id:'2',s:2,t:'2'}]})
  .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'key',source:'s',target:'t',edgeKey:'id',attributes:['payload'],directed:true})
  .layoutGraph({id:'layout',method:'circular'});
const resource=(kind,id)=>p.semanticSpec.resources.find(value=>value.kind===kind&&value.id===id);
const graph=resource('graph','graph'),layout=resource('layout','layout');
const jobs=[];
for(const coordinateSpace of ['world','screen']){
  const job=edgeRouteJob(p,graph,layout,{method:'edge-path',coordinateSpace});jobs.push(job);
  const {inputHash,...fields}=job,body=cloneAndFreeze(fields);
  assert.equal(routeValueHash(body),inputHash);
  const completion=computeRouteJob(job);
  deeplyOwned(job);deeplyOwned(body);deeplyOwned(completion.result);
  equal(body,`${coordinateSpace} native job body`);
  equal(completion.result,`${coordinateSpace} solver result`);
  equal(validateRouteResult(job,structuredClone(completion)),`${coordinateSpace} validated completion`);
}
const job=jobs[0],completion=computeRouteJob(job);
const external=structuredClone(job),validated=validateRouteJob(external);
assert.notEqual(validated,external);assert.equal(validateRouteJob(validated),validated);
external.inputs[0].revision++;external.input.positions[0].x++;
assert.equal(validated.inputs[0].revision,job.inputs[0].revision);
assert.equal(routeValueHash(validated),routeValueHash(job));
for(const change of [x=>x.inputs[0].revision++,x=>x.inputHash='0'.repeat(64),x=>x.input.positions[0].x++]){
  const bad=structuredClone(job);change(bad);assert.throws(()=>validateRouteJob(Object.freeze(bad)));
}
const rawPayload={inputs:structuredClone(job.inputs),intent:structuredClone(job.intent),input:structuredClone(job.input)};
const ownedJob=createRouteJob(rawPayload);
rawPayload.input.model.nodes[0].attributes.payload.text='later mutation';
assert.equal(ownedJob.inputHash,job.inputHash);

let getters=0;
for(const kind of ['position','attribute','completion']){
  const bad=structuredClone(kind==='completion'?completion:job);
  const target=kind==='position'?bad.input.positions[0]:kind==='attribute'?bad.input.model.nodes[0].attributes:bad.result.routes[0].commands[0];
  Object.defineProperty(target,kind==='attribute'?'payload':'x',{enumerable:true,get(){getters++;return 0;}});
  assert.throws(()=>kind==='completion'?validateRouteResult(job,bad):validateRouteJob(bad),/accessor/);
}
const hostile={get input(){getters++;throw Error('must not read');}};
const reason=new Error('abort before input');
assert.throws(()=>computeRouteJob(hostile,AbortSignal.abort(reason)),error=>error===reason);
assert.equal(getters,0);
// Legacy encoder intentionally reads own getters; the strict domain rejects
// them. Do not present the cursor as an encodeValue-compatible replacement.
const accessor=freezeOwned({get value(){getters++;return 3;}});
assert.equal(canonicalJSON(encodeValue(accessor)),'["object",[["value",3]]]');
assert.equal(getters,1);getters=0;assert.throws(()=>cursor(accessor),/accessor/);assert.equal(getters,0);
// Legacy Object.entries snapshots sibling values before recursive validation.
const legacy={bad:()=>0,get later(){getters++;return 1;}};
assert.throws(()=>encodeValue(legacy),/function/);assert.equal(getters,1);
getters=0;assert.throws(()=>cursor(freezeOwned(legacy)),/accessor/);assert.equal(getters,0);

const hole=[];hole.length=3;hole[1]=undefined;freezeOwned(hole);
const pair=cloneAndFreeze({value:-0});
equal(cloneAndFreeze({b:pair,a:pair,'2':2,'10':10,hole,big:42n}),'ordered record, shared DAG, holes and tags');
const cycle={};cycle.self=cycle;freezeOwned(cycle);
assert.throws(()=>cursor(cycle),/cycle/);
assert.throws(()=>cursor(cloneAndFreeze({unknown:Symbol('x')})),/symbol/);
assert.throws(()=>cursor({mutable:true}),/deep-owned/);
const wide={};for(let i=0;i<128;i++)wide[`field${i}`]=i;equal(cloneAndFreeze(wide),'small wide-record example only');

// This driver models only hash-stage lifetime. It does not publish a native job,
// resource or program and does not implement the proposed product connection.
async function scheduled(snapshot,{signal,abortTurn=0,mutate}={}){
  let handle,state,turns=0,publications=0,terminal=0;
  const controller=signal?undefined:new AbortController();signal??=controller.signal;
  try{
    AbortSignal.prototype.throwIfAborted.call(signal);
    handle=createStrictTaggedCursor(snapshot,limits);state=createSha256State();
    while(true){
      signal.throwIfAborted();const part=advanceStrictTaggedCursor(handle,{maxBytes:64,maxSteps:256});turns++;
      updateSha256(state,part.bytes);
      if(mutate&&turns===1)setTimeout(mutate,0);
      if(abortTurn===turns)setTimeout(()=>controller.abort(reason),0);
      // Even the last chunk yields before publication so a queued cancellation
      // gets a chance to run. A resolved Promise would not prove this.
      await new Promise(resolve=>setTimeout(resolve,0));signal.throwIfAborted();
      if(part.done){const hash=finishSha256(state);signal.throwIfAborted();publications++;terminal++;return {hash,turns,publications,terminal};}
    }
  }catch(error){terminal++;assert.equal(publications,0);assert.equal(terminal,1);throw error;}
  finally{if(handle)clearStrictTaggedCursor(handle);if(state){clearSha256(state);assert.equal(state.hash,null);assert.equal(state.tail,null);}}
}
const received=structuredClone(completion),snapshot=validateRouteResult(job,received);
const completed=await scheduled(snapshot,{mutate:()=>{received.resultHash='mutated';received.result.routes[0].commands[0].x=123;}});
assert.equal(completed.hash,routeValueHash(completion));assert.equal(completed.publications,1);assert.equal(completed.terminal,1);
assert.equal(received.resultHash,'mutated');assert.deepEqual(snapshot,completion);
for(const abortTurn of [1,2,completed.turns])await assert.rejects(scheduled(snapshot,{abortTurn}),error=>error===reason);
await assert.rejects(scheduled(hostile,{signal:AbortSignal.abort(reason)}),error=>error===reason);assert.equal(getters,0);

// Actual current host path: all input snapshot/validation precedes its first
// await. A custom worker can deliver a mutable object; onMessage validates and
// clones it synchronously before another callback can mutate that same object.
const listeners=new Map();let deliveredJob,terminated=0;
const executor=createGraphRouteExecutor({createWorker:()=>({
  postMessage({job}){deliveredJob=job;},
  addEventListener(type,listener){listeners.set(type,listener);},
  removeEventListener(type){listeners.delete(type);},
  terminate(){terminated++;}
})});
const request={kind:'create',id:'routes',method:'edge-path',options:{exponent:2}},
  control=new AbortController(),host={requestToken:'original',signal:control.signal,executor};
const pending=prepareGraphEdgeRoutes(p,request,host);
assert.ok(deliveredJob);deeplyOwned(deliveredJob); // synchronous, before awaiting pending
request.id='changed';request.options.exponent=3;host.requestToken='changed';
const incoming=structuredClone(computeRouteJob(deliveredJob));
assert.equal(Object.isFrozen(incoming),false);
listeners.get('message')({data:incoming});
incoming.resultHash='changed';incoming.result.routes[0].commands[0].x=123;
const handle=await pending;
const applied=p.bundleGraphEdges({prepared:handle,requestToken:'original'});
assert.deepEqual(applied.semanticSpec,p.bundleGraphEdges({id:'routes',method:'edge-path',options:{exponent:2}}).semanticSpec);
let authorityRejections=0;
for(const run of [
  ()=>p.bundleGraphEdges({prepared:{...handle},requestToken:'original'}),
  ()=>p.bundleGraphEdges({prepared:handle,requestToken:'changed'}),
  ()=>p.editEdgeRoute({prepared:handle,requestToken:'original'}),
  ()=>p.editCanvas({background:'white'}).bundleGraphEdges({prepared:handle,requestToken:'original'})
]){assert.throws(run);authorityRejections++;}
control.abort(reason);
assert.throws(()=>p.bundleGraphEdges({prepared:handle,requestToken:'original'}),error=>error===reason);
assert.equal(terminated,1);assert.equal(listeners.size,0);executor.dispose();

const report={node:process.version,scope:'private product cursor; actual native immutable inputs; no native async commit',
  native:{nodes:3,edges:3,methods:['edge-path'],coordinateSpaces:['world','screen']},records,
  proofs:{externalMutationIsolated:true,exactJobProofOnly:true,forgedFrozenJobsRejected:3,
    hostileRouteGetters:0,legacyGetterDifferenceObserved:true,legacySiblingErrorOrderDifferenceObserved:true,
    nativeHost:{jobAvailableBeforeFirstAwait:true,jobDeepOwned:true,requestMutationIsolated:true,mutableWorkerCompletionIsolated:true,authorityRejections,abortAfterPrepareRejected:true,workerTerminated:terminated,listenersRemaining:listeners.size},
    realMacrotaskCompleted:completed,abortedTurns:[1,2,completed.turns],abortBeforeInput:true,clearedSHA:true},
  limits:{fixtureBytes:limits.maxBytes,fixtureSteps:limits.maxSteps,productionPolicyChanged:false,
    largeFixture:false,packageConsumer:false,browserRun:false,latencyOr100msClaim:false,
    unresolved:['BigInt decimal conversion','wide record descriptors/keys','mutable external snapshot acquisition','domain validation/clone/structured clone','full route v2 closed update union']}};
await writeFile(process.argv[2]??'.artifacts/strict-value-cursor/native.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
