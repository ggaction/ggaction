import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutesAsync } from "../../../src/graph.js";
import { computePreparedRoute } from "../../../src/resources/graphRouteExecutor.js";
import { createRouteLedger, ROUTE_EXECUTION_MAXIMA } from "../../../src/grammar/graph/routes/execution.js";
import { createGraphLayoutResource } from "../../../src/materialization/graph/layoutResource.js";
import { createEdgeRouteResourceStages } from "../../../src/materialization/graph/routeResource.js";
import { prepareEdgeRouteRevisions, prepareEdgeRouteRevisionStages, reviseEdgeRouteResource } from "../../../src/actions/graphs/routeClosure.js";
import { planSourceResourceRevision, planSourceResourceRevisionStages } from "../../../src/actions/data/resourcePlan.js";
import { prepareScreenRouteRevisionStages } from "../../../src/actions/graphs/screenRoutes.js";
import { applyCanvasResourceRevision } from "../../../src/materialization/canvasResourceRevision.js";
import { editCanvasStages } from "../../../src/actions/canvas/actions.js";
import { editGraphLayoutStages, prepareGraphResourceStages, writePreparedGraphResource } from "../../../src/actions/graphs/layouts.js";
import { editHierarchyLayoutStages, writeHierarchyResourceStages } from "../../../src/actions/hierarchy/resources.js";
import { createObservedGraphResource } from "../../../src/materialization/graph/resources.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";
import { createHierarchyResource } from "../../../src/materialization/hierarchy/resources.js";
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
    const revisedLayout=changedLayout(ordinary).find(r=>r.kind==="layout");
    assert.deepEqual(reviseEdgeRouteResource(ordinary,get(ordinary,"edge-route","r"),[get(ordinary,"graph","g"),revisedLayout]),expected.entries[0].resource);
    assert.throws(()=>reviseEdgeRouteResource(p,get(p,"edge-route","r"),[get(p,"graph","g"),revisedLayout]),/prepareGraphEdgeRoutes/);
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


test("screen continuation retains its original one-use plan and primitive scope",async()=>{
  const base=source(),ordinary=base.bundleGraphEdges({id:"r",method:"edge-path",coordinateSpace:"screen"}),executor=workerExecutor();
  try{
    const p=await bounded(base,executor,"r","screen"),before=serializeProgram(p);
    assert.equal(prepareScreenRouteRevisionStages(base).next().value,undefined);
    assert.equal(prepareScreenRouteRevisionStages(p).next().value,undefined);
    const candidate=p.editGraphics({target:"canvas",property:"width",value:240});
    const scope={execution,ledger:createRouteLedger(execution)},start=scope.ledger.diagnostics().work;
    const {value:plan,jobs}=await advance(prepareScreenRouteRevisionStages(candidate,scope),executor,scope);
    assert.equal(jobs,1);const preparedWork=scope.ledger.diagnostics().work;assert.ok(preparedWork>start);
    assert.throws(()=>applyCanvasResourceRevision(p,plan),/different Canvas/);
    const actual=applyCanvasResourceRevision(candidate,plan),expected=ordinary.editCanvas({width:240});
    assert.deepEqual(get(actual,"edge-route","r").result.routes,get(expected,"edge-route","r").result.routes);
    assert.equal(get(actual,"edge-route","r").revision,1);assert.deepEqual(get(actual,"edge-route","r").result.viewport,get(expected,"edge-route","r").result.viewport);
    assert.ok(scope.ledger.diagnostics().work>preparedWork);
    assert.throws(()=>applyCanvasResourceRevision(candidate,plan),/different Canvas/);
    assert.throws(()=>candidate.refreshScreenEdgeRoutes({}),/exact private/);
    assert.equal(serializeProgram(p),before);
    const cancel=new AbortController(),cancelScope={execution,ledger:createRouteLedger(execution,cancel.signal),signal:cancel.signal};
    const {value:cancelPlan}=await advance(prepareScreenRouteRevisionStages(candidate,cancelScope),executor,cancelScope);
    cancel.abort(Error("cancel screen application"));assert.throws(()=>applyCanvasResourceRevision(candidate,cancelPlan),/cancel screen/);
  }finally{executor.dispose();}
});


test("fixed Canvas stages continue through original graphic and route children after the worker",async()=>{
  const base=source().editCanvas({height:200,margin:10}),executor=workerExecutor();
  try{
    const ordinary=base.bundleGraphEdges({id:"r",method:"edge-path",coordinateSpace:"screen"}).createGraphPlot({id:"plot",routes:"r"});
    const p=(await bounded(base,executor,"r","screen")).createGraphPlot({id:"plot",routes:"r"}),before=serializeProgram(p);
    const scope={execution,ledger:createRouteLedger(execution)};
    const {value,jobs}=await advance(editCanvasStages(p,{width:260},scope),executor,scope);
    assert.equal(jobs,1);assert.deepEqual(value.graphicSpec,ordinary.editCanvas({width:260}).graphicSpec);
    assert.equal(get(value,"edge-route","r").revision,1);assert.equal(serializeProgram(p),before);
    const ops=value.trace.children.slice(p.trace.children.length).map(x=>x.op);
    assert.ok(ops.includes("refreshScreenEdgeRoutes"));assert.ok(ops.includes("materializeGraphPlot")||ops.includes("rematerializeGraphPlot")||ops.includes("materializeGraphEdges"));
    const controller=new AbortController(),stopped={execution,ledger:createRouteLedger(execution,controller.signal),signal:controller.signal};
    const iterator=editCanvasStages(p,{width:280},stopped);assert.equal(iterator.next().done,false);controller.abort(Error("cancel Canvas stage"));iterator.return();assert.equal(stopped.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});

test("responsive Canvas stages recompute every native viewport pass and preserve failure atomicity",async()=>{
  const base=source().editCanvas({width:400,height:300,margin:20,responsive:{}}),executor=workerExecutor();
  try{
    const ordinary=base.bundleGraphEdges({id:"r",method:"edge-path",coordinateSpace:"screen"}).createGraphPlot({id:"plot",routes:"r"});
    const p=(await bounded(base,executor,"r","screen")).createGraphPlot({id:"plot",routes:"r"}),before=serializeProgram(p);
    const scope={execution,ledger:createRouteLedger(execution)};
    const {value,jobs}=await advance(editCanvasStages(p,{width:460},scope),executor,scope);
    const expected=ordinary.editCanvas({width:460});
    assert.equal(jobs,expected.materializationConfigs.canvas.responsiveResult.iterations);
    assert.ok(jobs>=2);assert.deepEqual(value.graphicSpec,expected.graphicSpec);
    assert.deepEqual(value.materializationConfigs.canvas,expected.materializationConfigs.canvas);
    assert.deepEqual(value.context,expected.context);assert.equal(get(value,"edge-route","r").revision,1);
    assert.equal(scope.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
    const failed={execution,ledger:createRouteLedger(execution)};
    await assert.rejects(advance(editCanvasStages(p,{width:100},failed),executor,failed),/unsatisfied/);
    assert.equal(failed.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});

test("exact-plot Canvas stages retain authored plot and native guide layout",async()=>{
  const base=source().editCanvas({plot:{width:200,height:180},margin:20}),executor=workerExecutor();
  try{
    const ordinary=base.bundleGraphEdges({id:"r",method:"edge-path",coordinateSpace:"screen"}).createGraphPlot({id:"plot",routes:"r"});
    const p=(await bounded(base,executor,"r","screen")).createGraphPlot({id:"plot",routes:"r"}),before=serializeProgram(p);
    const scope={execution,ledger:createRouteLedger(execution)};
    const {value,jobs}=await advance(editCanvasStages(p,{margin:30},scope),executor,scope);
    const expected=ordinary.editCanvas({margin:30});
    assert.equal(jobs,1);assert.deepEqual(value.graphicSpec,expected.graphicSpec);
    assert.deepEqual(value.materializationConfigs.canvas,expected.materializationConfigs.canvas);
    assert.equal(scope.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});


test("graph layout and graph resource continuations preserve native revision, child materialization and failure order",async()=>{
  const base=source().editCanvas({width:400,height:300,margin:30}),executor=workerExecutor();
  try{
    const ordinary=base.bundleGraphEdges({id:"r",method:"edge-path"}).createGraphPlot({id:"plot",routes:"r"});
    const p=(await bounded(base,executor)).createGraphPlot({id:"plot",routes:"r"}),before=serializeProgram(p);
    const args={node:{key:0,x:2,y:4}},scope={execution,ledger:createRouteLedger(execution)};
    const changed=await advance(editGraphLayoutStages(p,args,get(p,"layout","l"),scope),executor,scope);
    assert.equal(changed.jobs,1);assert.deepEqual(changed.value.graphicSpec,ordinary.editLayout({target:"l",...args}).graphicSpec);
    assert.equal(get(changed.value,"layout","l").revision,1);assert.equal(get(changed.value,"edge-route","r").revision,1);
    const graph=get(p,"graph","g"),dataset=id=>p.semanticSpec.datasets.find(d=>d.id===id);
    const candidate=createObservedGraphResource({id:"g",revision:1,nodes:dataset("n"),edges:dataset("e"),definition:{...graph.options.definition,directed:true}});
    const graphScope={execution,ledger:createRouteLedger(execution)};
    const plan=await advance(prepareGraphResourceStages(p,candidate,undefined,graphScope),executor,graphScope);
    const preparedWork=graphScope.ledger.diagnostics().work;
    const revised={jobs:plan.jobs,value:writePreparedGraphResource(p,plan.value)};
    assert.ok(graphScope.ledger.diagnostics().work>preparedWork);
    assert.equal(revised.jobs,1);assert.deepEqual(revised.value.graphicSpec,ordinary.editGraphData({target:"g",definition:{directed:true}}).graphicSpec);
    assert.deepEqual(["graph","layout","edge-route"].map((kind,index)=>get(revised.value,kind,["g","l","r"][index]).revision),[1,1,1]);
    assert.equal(scope.ledger.buffers()+graphScope.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
    const failing={execution,ledger:createRouteLedger(execution)};
    await assert.rejects(advance(editGraphLayoutStages(p,{order:{}},get(p,"layout","l"),failing),executor,failing),/hierarchy order/);
    assert.equal(failing.ledger.diagnostics().work,0);assert.equal(serializeProgram(p),before);
    assert.throws(()=>p.editLayout({target:"l",...args}),/prepareGraphEdgeRoutes/);
    const controller=new AbortController(),cancelled={execution,ledger:createRouteLedger(execution,controller.signal),signal:controller.signal};
    const pending=await advance(prepareGraphResourceStages(p,candidate,undefined,cancelled),executor,cancelled);
    controller.abort(Error("cancel graph apply"));assert.throws(()=>writePreparedGraphResource(p,pending.value),/cancel graph apply/);
    assert.equal(cancelled.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});

test("hierarchy layout and hierarchy resource continuations retain route provenance and native consumer order",async()=>{
  let base=source().editCanvas({width:400,height:300,margin:30})
    .createData({id:"tree",values:[{key:"root",parent:null,value:0},{key:0,parent:"root",value:1},{key:1,parent:"root",value:1}]})
    .createHierarchyData({id:"h",data:"tree",key:"key",parent:"parent",value:"value"})
    .layoutHierarchy({id:"hl",hierarchy:"h",method:"tree",options:{nodeSize:[10,10],siblingGap:20,depthGap:30,orientation:"vertical"}});
  base=base.editLayout({target:"l",options:{positions:[0,1].map(key=>{const n=get(base,"layout","hl").result.nodes.find(n=>n.key===encodeRowKey(key));return {key,x:n.x,y:n.y};})}});
  const options={hierarchy:"h",hierarchyLayout:"hl",mapping:[0,1].map(key=>({nodeKey:key,hierarchyKey:key}))},executor=workerExecutor();
  try{
    const ordinary=base.bundleGraphEdges({id:"r",graph:"g",layout:"l",method:"hierarchical",options}).createGraphPlot({id:"plot",routes:"r"}).createTreePlot({id:"treePlot",layout:"hl"});
    const prepared=await prepareGraphEdgeRoutes(base,{kind:"create",id:"r",graph:"g",layout:"l",method:"hierarchical",options:{...options,execution}},{executor,requestToken:"h",deadlineMs:30000});
    const p=base.bundleGraphEdges({prepared,requestToken:"h"}).createGraphPlot({id:"plot",routes:"r"}).createTreePlot({id:"treePlot",layout:"hl"}),before=serializeProgram(p);
    const args={target:"hl",options:{nodeSize:[10,10]}},scope={execution,ledger:createRouteLedger(execution)};
    const changed=await advance(editHierarchyLayoutStages(p,args,get(p,"layout","hl"),scope),executor,scope);
    assert.equal(changed.jobs,1);assert.deepEqual(changed.value.graphicSpec,ordinary.editLayout(args).graphicSpec);
    assert.deepEqual(get(changed.value,"edge-route","r").result.routes[0].provenance,get(ordinary.editLayout(args),"edge-route","r").result.routes[0].provenance);
    const previous=get(p,"hierarchy","h"),dataset=p.semanticSpec.datasets.find(d=>d.id==="tree");
    const candidate=createHierarchyResource({id:"h",revision:1,dataset,options:{...previous.options,valueMode:"own-plus-children"}}),nextScope={execution,ledger:createRouteLedger(execution)};
    const revised=await advance(writeHierarchyResourceStages(p,candidate,nextScope),executor,nextScope);
    assert.equal(revised.jobs,1);assert.deepEqual(revised.value.graphicSpec,ordinary.editHierarchyData({target:"h",valueMode:"own-plus-children"}).graphicSpec);
    assert.equal(get(revised.value,"layout","hl").revision,1);assert.equal(get(revised.value,"edge-route","r").revision,1);
    const failed={execution,ledger:createRouteLedger(execution)};
    await assert.rejects(advance(editHierarchyLayoutStages(p,{target:"hl",options:{depthGap:40}},get(p,"layout","hl"),failed),executor,failed),/anchors must match/);
    assert.equal(failed.ledger.buffers(),0);
    assert.equal(scope.ledger.buffers()+nextScope.ledger.buffers(),0);assert.equal(serializeProgram(p),before);
  }finally{executor.dispose();}
});
