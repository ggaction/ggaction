import test from 'node:test';
import assert from 'node:assert/strict';
import { createInferenceJob, validateInferenceJob, computeInferenceJob, validateInferenceCompletion, inferenceValueHash, validateCompletedInferenceModel } from '../../../../src/grammar/graph/inferenceJob.js';
import { resolveInferredGraphInput } from '../../../../src/grammar/graph/input.js';
import { resolvedInferenceResult } from '../../../../src/grammar/graph/inferenceResult.js';
import { validateInferenceBytes } from '../../../../src/grammar/graph/inferenceBudget.js';

const definition={nodeKey:'id',ruleId:'near',rule:'knn',features:['x'],metric:'manhattan',options:{k:1,search:{algorithm:'kd-tree'}}};
const payload=()=>({inputs:[{kind:'data',id:'d',logicalId:'d',revision:0}],rows:[{id:2,x:1},{id:'b',x:1},{id:0,x:3}],definition});
const execution={policy:'bounded-inference@1',maxWork:100_000_000,maxBytes:134_217_728};

test('inference jobs own all input and reproduce exact synchronous results after structured cloning',()=>{
 const input=payload(),job=createInferenceJob(input);assert.equal(validateInferenceJob(job),job);
 input.rows[0].x=999;assert.equal(job.rows[0].x,1);assert.ok(Object.isFrozen(job.rows[0]));
 const copied=validateInferenceJob(structuredClone(job));assert.deepEqual(copied,job);assert.notEqual(copied,job);
 const result=computeInferenceJob(copied);assert.deepEqual(result.result,resolvedInferenceResult(resolveInferredGraphInput(job.rows,definition)));
 assert.equal(result.complete,true);assert.deepEqual(validateInferenceCompletion(job,structuredClone(result)),result);
});

test('job schemas, revision vectors, candidate roles and hashes remain closed',()=>{
 const job=createInferenceJob(payload());
 for(const patch of [{schemaVersion:2},{algorithmVersion:'other'},{inputHash:'x'},{inputHash:'0'.repeat(64)},{extra:1},{rows:[]}])assert.throws(()=>validateInferenceJob({...job,...patch}));
 for(const patch of [{inputs:[]},{inputs:[{kind:'graph',id:'x',revision:0}]},{inputs:[{kind:'data',id:'d',logicalId:'d',revision:-1}]},{candidateLimits:{}},{candidateExecution:execution},{candidate:undefined}])assert.throws(()=>createInferenceJob({...payload(),...patch}));
 const missing={...payload()};delete missing.rows;assert.throws(()=>createInferenceJob(missing));
 assert.throws(()=>createInferenceJob({...payload(),definition:{...definition,execution:{...execution,maxBytes:1}}}),/bytes/);
});

test('candidate jobs retain candidate policies independently from the output work policy',()=>{
 const candidate=resolveInferredGraphInput(payload().rows,{...definition,rule:'radius',options:{radius:3}}).model;
 const input={...payload(),definition:{nodeKey:'id',ruleId:'tree',rule:'mst'},inputs:[...payload().inputs,{kind:'graph',id:'candidate',revision:1}],candidate,candidateLimits:{maxNodes:3,maxEdges:3},candidateExecution:execution};
 const job=createInferenceJob(input),result=computeInferenceJob(job);assert.equal(result.result.model.edges.length,2);
 assert.deepEqual(validateInferenceCompletion(job,result),result);
 const missing={...input};delete missing.candidateLimits;assert.throws(()=>createInferenceJob(missing));
 assert.throws(()=>createInferenceJob({...input,candidateLimits:{maxEdges:1}}));
});

test('completion validation rejects unknown, incomplete, altered, oversized and malformed output before retention',()=>{
 const job=createInferenceJob(payload()),complete=computeInferenceJob(job);
 for(const patch of [{schemaVersion:2},{complete:false},{inputHash:'0'.repeat(64)},{extra:1},{resultHash:'bad'},{result:{model:complete.result.model}}])assert.throws(()=>validateInferenceCompletion(job,{...complete,...patch}));
 const missing={...complete};delete missing.complete;assert.throws(()=>validateInferenceCompletion(job,missing));
 const forged=structuredClone(complete);forged.result.model.edges[0].weight=NaN;forged.resultHash=inferenceValueHash(forged.result);assert.throws(()=>validateInferenceCompletion(job,forged));
 const bounded=createInferenceJob({...payload(),definition:{...definition,execution:{...execution,maxBytes:2000}}});
 assert.throws(()=>computeInferenceJob(bounded),/bytes/);
 const bytes=validateInferenceBytes(complete,execution);assert.ok(bytes>2000);
});

test('abort wins before hostile input and all own-data checks avoid invoking accessors',()=>{
 let reads=0;const hostile={};Object.defineProperty(hostile,'rows',{enumerable:true,get(){reads++;throw Error('getter');}});
 const c=new AbortController();c.abort(new Error('stop'));
 assert.throws(()=>computeInferenceJob(hostile,c.signal),/stop/);assert.throws(()=>createInferenceJob(hostile),/accessor/);
 const job=createInferenceJob(payload()),result=computeInferenceJob(job);const bad={...result};Object.defineProperty(bad,'result',{enumerable:true,get(){reads++;return result.result;}});
 assert.throws(()=>validateInferenceCompletion(job,bad),/accessor/);assert.equal(reads,0);
 let calls=0;Object.defineProperty(Object.prototype,'candidate',{configurable:true,get(){calls++;throw Error('inherited');}});
 try {assert.deepEqual(computeInferenceJob(createInferenceJob(payload())),result);}finally{delete Object.prototype.candidate;}
 assert.equal(calls,0);
});

test('a real signal is checked repeatedly without changing successful numeric work counters',()=>{
 const job=createInferenceJob(payload()),expected=computeInferenceJob(job),signal=new AbortController().signal;
 assert.deepEqual(computeInferenceJob(job,signal),expected);
 const original=AbortSignal.prototype.throwIfAborted,c=new AbortController();let checks=0;
 AbortSignal.prototype.throwIfAborted=function(){if(this===c.signal&&++checks===8)c.abort(new Error('checkpoint'));return original.call(this);};
 try {assert.throws(()=>computeInferenceJob(job,c.signal),/checkpoint/);assert.equal(checks,8);}finally{AbortSignal.prototype.throwIfAborted=original;}
});


test('worker definition admission validates every inactive rule field before computation',()=>{
  for(const patch of [{rule:'unknown'},{options:{k:undefined}},{options:{features:['x']}},{rule:'group',options:{fields:['x']}},{rule:'sequence',features:undefined,options:{orderField:['x']}}])assert.throws(()=>createInferenceJob({...payload(),definition:{...definition,...patch}}));
  const structural={nodeKey:'id',ruleId:'sequence',rule:'sequence',options:{orderField:'x'}};
  assert.equal(computeInferenceJob(createInferenceJob({...payload(),definition:structural})).result.model.edges.length,2);
  assert.throws(()=>createInferenceJob({...payload(),definition:{...structural,options:{orderField:['x']}}}),/one field/);
  assert.throws(()=>createInferenceJob({...payload(),definition:{...structural,metric:'manhattan'}}),/metric features/);
});

test('completion reuse requires the exact validated job and owned completion, never a hash or caller freeze',()=>{
 const job=createInferenceJob(payload()),raw=structuredClone(computeInferenceJob(job));
 const owned=validateInferenceCompletion(job,Object.freeze(raw));
 assert.notEqual(owned,raw);assert.equal(validateInferenceCompletion(job,owned),owned);
 raw.result.model.edges[0].weight=99;
 assert.notEqual(owned.result.model.edges[0].weight,99);
 assert.throws(()=>validateInferenceCompletion(job,raw),/hash/);
 const copied=structuredClone(owned);copied.result.model.adjacency[0].outgoing=[];
 assert.throws(()=>validateInferenceCompletion(job,copied),/adjacency/);
 const replacement={...owned,result:{...owned.result,diagnostics:{...owned.result.diagnostics,pairCount:0}}};
 assert.throws(()=>validateInferenceCompletion(job,replacement),/hash/);
 const another=createInferenceJob({...payload(),inputs:[{...payload().inputs[0],revision:1}]});
 assert.throws(()=>validateInferenceCompletion(another,owned),/stale/);
 // Equal transport inputs remain valid but cannot grant identity to a clone.
 const sameJob=structuredClone(job),sameCompletion=structuredClone(owned);
 const checked=validateInferenceCompletion(sameJob,sameCompletion);
 assert.deepEqual(checked,owned);assert.notEqual(checked,sameCompletion);
 let reads=0;const accessor={...owned};Object.defineProperty(accessor,'result',{enumerable:true,get(){reads++;return owned.result;}});
 assert.throws(()=>validateInferenceCompletion(job,Object.freeze(accessor)),/accessor/);assert.equal(reads,0);
});


test('completed model proof requires its exact object and normalized limits and execution', () => {
 const job=createInferenceJob({...payload(),definition:{...definition,maxNodes:3,maxEdges:3,execution}});
 const completed=validateInferenceCompletion(job,structuredClone(computeInferenceJob(job))),model=completed.result.model;
 const limits={maxNodes:3,maxEdges:3};
 validateCompletedInferenceModel(model,limits,{...execution});
 validateCompletedInferenceModel(model,{maxNodes:4,maxEdges:3},execution);
 validateCompletedInferenceModel(model,{maxNodes:3,maxEdges:4},execution);
 validateCompletedInferenceModel(model,limits,undefined);
 validateCompletedInferenceModel(model,limits,{...execution,maxBytes:execution.maxBytes-1});
 validateCompletedInferenceModel(structuredClone(model),limits,execution);
 assert.throws(()=>validateCompletedInferenceModel(model,{maxNodes:2,maxEdges:3},execution),/nodes/);
 assert.throws(()=>validateCompletedInferenceModel(model,{maxNodes:3,maxEdges:2},execution),/edges/);
 assert.throws(()=>validateCompletedInferenceModel(model,limits,{...execution,maxWork:1}),/work/);
 assert.throws(()=>validateCompletedInferenceModel(model,{...limits,extra:1},execution),/Unknown/);
 assert.throws(()=>validateCompletedInferenceModel(model,limits,{...execution,extra:1}),/Unknown/);
 const malformed=structuredClone(model);malformed.adjacency[0].outgoing=[];
 assert.throws(()=>validateCompletedInferenceModel(Object.freeze(malformed),limits,execution),/adjacency/);
 const replaced={...model,edges:model.edges.slice(1)};
 assert.throws(()=>validateCompletedInferenceModel(replaced,limits,execution),/adjacency/);
 let reads=0;const hostile={...model};Object.defineProperty(hostile,'nodes',{enumerable:true,get(){reads++;return model.nodes;}});
 assert.throws(()=>validateCompletedInferenceModel(hostile,limits,execution),/accessors/);assert.equal(reads,0);
 // Default-policy proofs cannot carry explicit bounded execution authority.
 const ordinary=createInferenceJob(payload()),plain=validateInferenceCompletion(ordinary,computeInferenceJob(ordinary));
 validateCompletedInferenceModel(plain.result.model,{maxNodes:ordinary.definition.maxNodes,maxEdges:ordinary.definition.maxEdges});
 assert.throws(()=>validateCompletedInferenceModel(plain.result.model,{maxNodes:ordinary.definition.maxNodes,maxEdges:ordinary.definition.maxEdges},{...execution,maxWork:1}),/work/);
});
