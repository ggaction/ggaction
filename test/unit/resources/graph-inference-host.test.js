import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { chart } from '../../../src/index.js';
import { chart as basicChart } from '../../../src/basic.js';
import { prepareInferredGraphData, createGraphInferenceExecutor, computeGraphInference } from '../../../src/graph.js';
import { serializeProgram, deserializeProgram } from '../../../src/persistence.js';
import { inferredGraphJob } from '../../../src/materialization/graph/inferredResource.js';
import { normalizeInferenceRequest } from '../../../src/materialization/graph/inferenceRequest.js';
import { inferenceValueHash } from '../../../src/grammar/graph/inferenceJob.js';

const base=()=>chart().createCanvas().createData({id:'d',keyField:'id',values:[{id:'a',x:0},{id:'b',x:2},{id:'c',x:6}]});
const args={id:'g',nodeKey:'id',ruleId:'near',rule:'knn',features:['x'],metric:'manhattan',options:{k:1}};
const graph=p=>p.semanticSpec.resources.find(r=>r.kind==='graph'&&r.id==='g');
function controlled(){
 const workers=[];
 return {workers,createWorker(){const listeners=new Map(),worker={listeners,terminated:0,job:undefined,
  addEventListener(type,fn){listeners.set(type,fn)},removeEventListener(type){listeners.delete(type)},
  terminate(){this.terminated++},postMessage({job}){this.job=structuredClone(job)},
  complete(result=computeGraphInference(this.job)){listeners.get('message')?.({data:result})},fail(error){listeners.get('error')?.({error})}};
  workers.push(worker);return worker;}};
}
function automatic(){const state=controlled();return {...state,createWorker(){const w=state.createWorker();const post=w.postMessage;w.postMessage=function(m){post.call(this,m);queueMicrotask(()=>{try{w.complete();}catch(error){w.fail(error);}});};return w;}};}

// Host callbacks are lifecycle fixtures, never an alternative inference implementation.
test('prepared create and edit reuse native resolution, exact output, dependency closure and immutable trace',async()=>{
 const p=base(),snapshot=serializeProgram(p),host=automatic(),executor=createGraphInferenceExecutor({createWorker:host.createWorker});
 const handle=await prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'create'});
 assert.ok(Object.isFrozen(handle));assert.equal(serializeProgram(p),snapshot);
 const first=p.createInferredGraphData({prepared:handle,requestToken:'create'}),ordinary=p.createInferredGraphData(args);
 assert.deepEqual(first.semanticSpec,ordinary.semanticSpec);assert.deepEqual(first.graphicSpec,ordinary.graphicSpec);
 const shown=first.layoutGraph({id:'l',method:'circular'}).createGraphPlot({id:'view'}),request={target:'g',definition:{options:{k:2}}};
 const edit=await prepareInferredGraphData(shown,{kind:'edit',...request},{executor,requestToken:'edit'});
 const actual=shown.editInferredGraphData({prepared:edit,requestToken:'edit'}),expected=shown.editInferredGraphData(request);
 assert.deepEqual(actual.semanticSpec,expected.semanticSpec);assert.deepEqual(actual.graphicSpec,expected.graphicSpec);
 assert.equal(graph(actual).revision,1);assert.equal(serializeProgram(deserializeProgram(serializeProgram(actual))),serializeProgram(actual));
 assert.ok(host.workers.every(w=>w.terminated===1&&w.listeners.size===0));executor.dispose();
});

test('receiver, kind, token, constructor and handle identity are exact capabilities',async()=>{
 const p=base(),host=automatic(),executor=createGraphInferenceExecutor({createWorker:host.createWorker}),handle=await prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'t'});
 for(const run of [()=>p.createInferredGraphData({prepared:{...handle},requestToken:'t'}),()=>p.createInferredGraphData({prepared:structuredClone(handle),requestToken:'t'}),
 ()=>p.createInferredGraphData({prepared:handle,requestToken:'other'}),()=>p.editInferredGraphData({prepared:handle,requestToken:'t'}),
 ()=>p.createInferredGraphData({prepared:handle,requestToken:'t',id:'g'}),()=>p.createInferredGraphData({prepared:handle}),()=>p.createInferredGraphData({...args,requestToken:'t'}),
 ()=>p.editCanvas({width:800}).createInferredGraphData({prepared:handle,requestToken:'t'}),()=>deserializeProgram(serializeProgram(p)).createInferredGraphData({prepared:handle,requestToken:'t'})])assert.throws(run);
 class Derived extends p.constructor {}
 for(const program of [basicChart(),new Derived()])await assert.rejects(prepareInferredGraphData(program,{kind:'create',...args},{executor,requestToken:'t'}),/Full/);
 await assert.rejects(prepareInferredGraphData(p,{kind:'create',...args},{executor:{...executor},requestToken:'t'}),/executor/);
 executor.dispose();
});

test('source revisions and source binding corruption cannot commit prepared results',async()=>{
 const p=base(),snapshot=serializeProgram(p),host=controlled(),executor=createGraphInferenceExecutor({createWorker:host.createWorker});
 const pending=prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'t'});host.workers[0].complete();const handle=await pending;
 const revised=p.reviseData({source:'d',id:'next',values:[{id:'a',x:0},{id:'b',x:5},{id:'c',x:9}]});
 assert.throws(()=>revised.createInferredGraphData({prepared:handle,requestToken:'t'}),/receiver/);
 const bad=prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'bad'}),w=host.workers.at(-1),forged=structuredClone(computeGraphInference(w.job));
 forged.result.model.edges[0].weight+=1;forged.resultHash=inferenceValueHash(forged.result);w.complete(forged);
 await assert.rejects(bad,/weight|binding/);assert.equal(serializeProgram(p),snapshot);executor.dispose();
});

test('abort precedes input reads and prepared publication while host fields are snapshotted',async()=>{
 const p=base(),host=controlled(),executor=createGraphInferenceExecutor({createWorker:host.createWorker}),c=new AbortController();let reads=0;
 const input={};Object.defineProperty(input,'kind',{get(){reads++;throw Error('getter')},enumerable:true});c.abort(new Error('stop'));
 await assert.rejects(prepareInferredGraphData(p,input,{executor,requestToken:'t',signal:c.signal}),/stop/);assert.equal(reads,0);assert.equal(host.workers.length,0);
 const alive=new AbortController(),options={executor,requestToken:'original',signal:alive.signal};
 const pending=prepareInferredGraphData(p,{kind:'create',...args},options);options.requestToken='changed';options.signal=c.signal;options.executor={};host.workers[0].complete();
 const handle=await pending;assert.equal(graph(p.createInferredGraphData({prepared:handle,requestToken:'original'})).id,'g');alive.abort(new Error('revoked'));
 assert.throws(()=>p.createInferredGraphData({prepared:handle,requestToken:'original'}),/revoked/);
 for(const bad of [{kind:'other',...args},{kind:'create',...args,extra:1}])await assert.rejects(prepareInferredGraphData(p,bad,{executor,requestToken:'t'}));
 await assert.rejects(prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:''}),/requestToken/);executor.dispose();
});

test('one pending worker has one terminal event and ignores late events after abort and dispose',async()=>{
 const p=base(),host=controlled(),executor=createGraphInferenceExecutor({createWorker:host.createWorker}),job=inferredGraphJob(normalizeInferenceRequest(p,args,false));
 const c=new AbortController(),promise=executor.compute(job,{signal:c.signal}),w=host.workers[0],late=w.listeners.get('message');
 await assert.rejects(executor.compute(job),/pending/);c.abort(new Error('cancel'));await assert.rejects(promise,/cancel/);
 late({get data(){throw Error('late result read')}});assert.equal(w.terminated,1);assert.equal(w.listeners.size,0);
 const second=executor.compute(job),w2=host.workers[1];executor.dispose();executor.dispose();await assert.rejects(second,/disposed/);assert.equal(w2.terminated,1);assert.equal(w2.listeners.size,0);
 await assert.rejects(executor.compute(job),/disposed/);const aborted=new AbortController();aborted.abort(Error('first'));await assert.rejects(executor.compute(null,{signal:aborted.signal}),/first/);
});

test('worker factory, transport, cleanup and reentrant disposal failures leave no retained pending work',async()=>{
 const p=base(),job=inferredGraphJob(normalizeInferenceRequest(p,args,false));assert.throws(()=>createGraphInferenceExecutor({}),/createWorker/);
 for(const createWorker of [()=>{throw Error('factory')},()=>null,()=>({})]){const e=createGraphInferenceExecutor({createWorker});await assert.rejects(e.compute(job));e.dispose();}
 const host=controlled(),e=createGraphInferenceExecutor({createWorker:host.createWorker}),failed=e.compute(job);host.workers[0].fail('not-error');await assert.rejects(failed,/worker failed/);
 const again=e.compute(job);host.workers[1].fail(Error('worker-error'));await assert.rejects(again,/worker-error/);e.dispose();
 const cleanup=controlled(),bad=createGraphInferenceExecutor({createWorker(){const w=cleanup.createWorker();w.terminate=()=>{throw Error('cleanup')};return w;}}),failure=bad.compute(job);cleanup.workers[0].complete();await assert.rejects(failure,/cleanup/);bad.dispose();
 let reentrant;const workers=controlled();reentrant=createGraphInferenceExecutor({createWorker(){reentrant.dispose();return workers.createWorker();}});await assert.rejects(reentrant.compute(job),/disposed/);assert.equal(workers.workers[0].terminated,1);
});

test('one hundred complete and cancelled requests release worker listeners without a cache',async()=>{
 const p=base(),job=inferredGraphJob(normalizeInferenceRequest(p,args,false)),host=controlled(),executor=createGraphInferenceExecutor({createWorker:host.createWorker});
 for(let i=0;i<100;i++){const c=new AbortController(),pending=executor.compute(job,{signal:c.signal}),w=host.workers[i];if(i%2){c.abort(Error('cycle'));await assert.rejects(pending,/cycle/);}else{w.complete();assert.equal((await pending).complete,true);}assert.equal(w.terminated,1);assert.equal(w.listeners.size,0);}
 assert.equal(host.workers.length,100);executor.dispose();
});

test('an actual worker computes exact native inferred resources and releases its thread',async()=>{
 const p=base();let terminated=0;
 const executor=createGraphInferenceExecutor({createWorker(){const worker=new Worker(new URL('../../support/graph-inference-worker.mjs',import.meta.url)),listeners=new Map();return {
  postMessage(m){worker.postMessage(m)},addEventListener(type,fn){const wrapped=value=>fn(type==='message'?{data:value}:{error:value});listeners.set(fn,wrapped);worker.on(type,wrapped)},
  removeEventListener(type,fn){worker.off(type,listeners.get(fn));listeners.delete(fn)},terminate(){terminated++;void worker.terminate()}};}});
 const handle=await prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'worker'});
 assert.deepEqual(graph(p.createInferredGraphData({prepared:handle,requestToken:'worker'})),graph(p.createInferredGraphData(args)));assert.equal(terminated,1);executor.dispose();
});


test('prepared candidates preserve both input refs and downstream failure is atomic', async () => {
  const executor = createGraphInferenceExecutor({createWorker: automatic().createWorker});
  const original = base().createInferredGraphData({...args,options:{k:1,symmetrize:"union"}});
  const options = {id:'tree',data:'d',nodeKey:'id',ruleId:'mst',rule:'mst',candidateGraph:'g'};
  const prepared = await prepareInferredGraphData(original,{kind:'create',...options},{executor,requestToken:'mst'});
  const created = original.createInferredGraphData({prepared,requestToken:'mst'});
  assert.deepEqual(created.semanticSpec,original.createInferredGraphData(options).semanticSpec);
  assert.deepEqual(created.semanticSpec.resources.at(-1).inputs.map(ref=>[ref.kind,ref.id,ref.revision]),[['data','d',0],['graph','g',0]]);
  const fixed=original.layoutGraph({id:'layout',method:'fixed',options:{positions:[{key:'a',x:0,y:0},{key:'b',x:10,y:10},{key:'c',x:20,y:20}]}})
    .createData({id:'replacement',keyField:'id',values:[{id:'a',x:0},{id:'b',x:2},{id:'new',x:7}]});
  const before=serializeProgram(fixed), edit=await prepareInferredGraphData(fixed,{kind:'edit',target:'g',data:'replacement'},{executor,requestToken:'edit'});
  assert.throws(()=>fixed.editInferredGraphData({prepared:edit,requestToken:'edit'}),/position|coordinate/i);
  assert.equal(serializeProgram(fixed),before);executor.dispose();
});

test('worker admission never evaluates optional inherited or accessor host fields',async()=>{
  let reads=0;
  const hostile={};Object.defineProperty(hostile,'createWorker',{enumerable:true,get(){reads++;throw Error('getter');}});
  assert.throws(()=>createGraphInferenceExecutor(hostile),/accessor/);
  Object.defineProperty(Object.prototype,'createWorker',{configurable:true,get(){reads++;throw Error('inherited');}});
  try {assert.throws(()=>createGraphInferenceExecutor({}),/createWorker/);}finally{delete Object.prototype.createWorker;}
  assert.equal(reads,0);
  const host=controlled(),executor=createGraphInferenceExecutor({createWorker:host.createWorker}),job=inferredGraphJob(normalizeInferenceRequest(base(),args,false));
  const promise=executor.compute(job),worker=host.workers[0],lateError=worker.listeners.get('error');
  worker.complete();await promise;lateError({get error(){reads++;throw Error('late')}});assert.equal(reads,0);
  executor.dispose();
});

test('prepared stored reuse preserves full binding, constructor and restore checks at each native application',async()=>{
 const p=base(),host=automatic(),executor=createGraphInferenceExecutor({createWorker:host.createWorker});
 const prepared=await prepareInferredGraphData(p,{kind:'create',...args},{executor,requestToken:'t'});
 const actual=p.createInferredGraphData({prepared,requestToken:'t'}),resource=graph(actual),before=serializeProgram(p);
 // Reusing a stored proof does not authorize a source with equal IDs/revisions
 // but different field values, nor an absent source or a Basic constructor.
 const changed=p._clone({semanticSpec:{...p.semanticSpec,datasets:p.semanticSpec.datasets.map(data=>({...data,values:data.values.map(row=>({...row,x:row.x*10}))}))}}),snapshot=JSON.stringify(changed.semanticSpec);
 assert.throws(()=>changed.editSemantic({property:'resource[graph:g]',value:resource}),/weight|binding/);
 assert.equal(JSON.stringify(changed.semanticSpec),snapshot);
 assert.throws(()=>chart().editSemantic({property:'resource[graph:g]',value:resource}));
 assert.throws(()=>basicChart().editSemantic({property:'resource[graph:g]',value:resource}),/registered|supported/);
 const malformed=structuredClone(resource);malformed.result.diagnostics.effectiveK=9;
 assert.throws(()=>p.editSemantic({property:'resource[graph:g]',value:Object.freeze(malformed)}),/effective k/);
 // Transport drops all preparation proofs; ordinary restoration validates anew.
 assert.equal(serializeProgram(deserializeProgram(serializeProgram(actual))),serializeProgram(actual));
 assert.deepEqual(p.createInferredGraphData({prepared,requestToken:'t'}).semanticSpec,actual.semanticSpec);
 assert.equal(serializeProgram(p),before);executor.dispose();
});
