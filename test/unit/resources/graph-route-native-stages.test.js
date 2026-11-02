import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } from "../../../src/graph.js";
import { computePreparedRoute } from "../../../src/resources/graphRouteExecutor.js";
import { createRouteLedger, ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { createGraphLayoutResource } from "../../../src/materialization/graph/layoutResource.js";
import { createEdgeRouteResourceStages } from "../../../src/materialization/graph/routeResource.js";
import { prepareEdgeRouteRevisions, prepareEdgeRouteRevisionStages } from "../../../src/actions/graphs/routeClosure.js";
import { planSourceResourceRevision, planSourceResourceRevisionStages } from "../../../src/actions/data/resourcePlan.js";
const execution = { policy: "bounded-route@1", ...ROUTE_EXECUTION_MAXIMA };
const get = (p,kind,id) => p.semanticSpec.resources.find(r=>r.kind===kind&&r.id===id);
const source = () => chart().createCanvas({width:200,height:100})
  .createData({id:"n",values:[{id:0},{id:1}]}).createData({id:"e",values:[{id:0,s:0,t:1}]})
  .createGraphData({id:"g",nodes:"n",edges:"e",nodeKey:"id",edgeKey:"id",source:"s",target:"t"})
  .layoutGraph({id:"l",method:"fixed",options:{positions:[{key:0,x:0,y:0},{key:1,x:10,y:10}]}});
function workerExecutor() {
  return createGraphRouteExecutor({createWorker(){
    const listeners=new Map();return {addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),terminate:()=>listeners.clear(),
      postMessage:({job})=>computeGraphEdgeRoutesAsync(structuredClone(job)).then(data=>listeners.get("message")?.({data}),error=>listeners.get("error")?.({error}))};
  }});
}
async function bounded(p,executor,id="r",coordinateSpace="world") {
  const prepared=await prepareGraphEdgeRoutes(p,{kind:"create",id,graph:"g",layout:"l",method:"edge-path",coordinateSpace,options:{execution}},{executor,requestToken:"t",deadlineMs:30000});
  return p.bundleGraphEdges({prepared,requestToken:"t"});
}
// Test-only driver: production B dispatch is intentionally not exposed yet.
async function advance(iterator,executor,scope) {
  let completion, jobs=0;
  try { while(true){
    const next=iterator.next(completion);completion=undefined;
    if(next.done)return {value:next.value,jobs};
    if(next.value===undefined)await new Promise(resolve=>setTimeout(resolve,0));
    else {assert.equal(next.value.kind,"edge-route-computation");jobs++;completion=await computePreparedRoute(executor,next.value.job,{signal:scope.signal,deadlineMs:30000},scope);}
  }}finally{iterator.return();}
}
function changedLayout(p) {
  const previous=get(p,"layout","l"),graph=get(p,"graph","g");
  const next=createGraphLayoutResource({id:"l",revision:1,graph,intent:{method:"fixed",options:{positions:[{key:0,x:0,y:0},{key:1,x:20,y:5}]}}});
  return p.semanticSpec.resources.map(r=>r===previous?next:r);
}

test("native route continuation preserves v1 synchronous results and suspends only owned v2 jobs",async()=>{
  const base=source(),ordinary=base.bundleGraphEdges({id:"r",method:"edge-path"}),executor=workerExecutor();
  try{
    const p=await bounded(base,executor),before=serializeProgram(p),scope={execution,ledger:createRouteLedger(execution)};
    const expected=prepareEdgeRouteRevisions(ordinary,changedLayout(ordinary));
    const sync=prepareEdgeRouteRevisionStages(ordinary,changedLayout(ordinary));assert.deepEqual(sync.next(),{done:true,value:expected});
    const {value,jobs}=await advance(prepareEdgeRouteRevisionStages(p,changedLayout(p),scope),executor,scope);
    assert.equal(jobs,1);assert.equal(value.entries[0].resource.revision,1);
    assert.deepEqual(value.entries[0].resource.result.routes,expected.entries[0].resource.result.routes);
    assert.deepEqual(value.entries[0].previous,{kind:"edge-route",id:"r",revision:0});
    assert.equal(serializeProgram(p),before);assert.equal(scope.ledger.buffers(),0);
    assert.throws(()=>prepareEdgeRouteRevisions(p,changedLayout(p)),/prepareGraphEdgeRoutes/);
  }finally{executor.dispose();}
});

test("source DAG stages preserve mixed v1 guards, data references and exact revision order",async()=>{
  const base=source().bundleGraphEdges({id:"legacy",method:"edge-path",coordinateSpace:"screen"}),executor=workerExecutor();
  try{
    const p=(await bounded(base,executor)).createData({id:"next",values:[{id:0},{id:1}]}),before=serializeProgram(p),replacements=new Map([["n","next"]]);
    const scope={execution,ledger:createRouteLedger(execution)};
    const {value,jobs}=await advance(planSourceResourceRevisionStages(p,replacements,scope),executor,scope);
    assert.equal(jobs,1);assert.deepEqual(value.entries.map(e=>[e.resource.kind,e.resource.id]),[["graph","g"],["layout","l"],["edge-route","legacy"],["edge-route","r"]]);
    assert.equal(value.entries[0].resource.inputs[0].id,"next");
    for(const entry of value.entries)assert.equal(entry.resource.revision,1);
    assert.equal(value.entries[2].resource.algorithmVersion,"1");assert.equal(value.entries[3].resource.algorithmVersion,"2");
    assert.ok(scope.ledger.diagnostics().work>value.entries[3].resource.result.diagnostics.work);
    assert.equal(scope.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
    const ordinary=base.createData({id:"next",values:[{id:0},{id:1}]});
    assert.deepEqual(planSourceResourceRevisionStages(ordinary,replacements).next(),{done:true,value:planSourceResourceRevision(ordinary,replacements)});
    const limited={execution,ledger:createRouteLedger({...execution,maxWork:1})};
    await assert.rejects(advance(planSourceResourceRevisionStages(p,replacements,limited),executor,limited),/maxWork/);
    assert.equal(limited.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});

test("native stage cancellation clears the active hash and rejects unmatched completion before any write",async()=>{
  const executor=workerExecutor();
  try{
    const p=await bounded(source(),executor),controller=new AbortController(),scope={execution,ledger:createRouteLedger(execution,controller.signal),signal:controller.signal};
    const iterator=prepareEdgeRouteRevisionStages(p,changedLayout(p),scope);
    assert.equal(iterator.next().done,false);assert.ok(scope.ledger.buffers()>0);controller.abort(Error("cancel native stage"));iterator.return();assert.equal(scope.ledger.buffers(),0);
    const route=get(p,"edge-route","r"),resolved={id:"r",revision:1,program:p,graph:get(p,"graph","g"),layout:get(p,"layout","l"),intent:route.options};
    const forgedScope={execution,ledger:createRouteLedger(execution)},forged=createEdgeRouteResourceStages(resolved,forgedScope);
    let pending;do{pending=forged.next();}while(pending.value===undefined&&!pending.done);
    assert.equal(pending.value.kind,"edge-route-computation");assert.throws(()=>forged.next({}),/completion|version|header|fields/i);forged.return();assert.equal(forgedScope.ledger.buffers(),0);
  }finally{executor.dispose();}
});
