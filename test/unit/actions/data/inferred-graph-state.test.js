import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";
import { resolveGraphSourceData } from "../../../../src/selectors/graphs.js";

const graph = p => p.semanticSpec.resources.find(r => r.kind === "graph" && r.id === "network");
const request = { id: "network", nodeKey: "id", ruleId: "near", rule: "knn", features: ["x"], metric: "euclidean" };
const make = (values, patch = {}) => chart().createData({ id: "rows", values }).createInferredGraphData({ ...request, ...patch });
const pairs = p => graph(p).result.model.edges.map(e => [e.sourceKey, e.targetKey, e.weight]);
const expected = triples => triples.map(([a,b,w]) => [encodeRowKey(a), encodeRowKey(b), w]);
function rejects(program, mutations) {
  const encoded = serializeProgram(program), envelope = JSON.parse(encoded), state = decodeValue(envelope.payload);
  for (const mutate of mutations) {
    const forged = structuredClone(state); mutate(graph(forged));
    assert.throws(() => deserializeProgram(JSON.stringify({ ...envelope, payload: encodeValue(forged) })));
    assert.equal(serializeProgram(program), encoded);
  }
}
function roundtrip(program) { assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec, program.semanticSpec); }

test("stored exact and approximate search proofs reject inconsistent counters and qualification", () => {
  const rows = [{id:3,x:null},{id:"b",x:1},{id:1,x:0},{id:"a",x:2}];
  for (const search of [{}, {algorithm:"kd-tree"}, {mode:"approximate",seed:7}]) {
    const p = make(rows,{options:{missing:"omit-node",search}}); roundtrip(p);
    rejects(p,[r=>{r.result.diagnostics.search.algorithmVersion="unknown@9";},
      r=>{r.result.diagnostics.search.distanceEvaluations=-1;},
      r=>{r.result.diagnostics.search.distanceEvaluations=9999;},
      r=>{r.result.diagnostics.search.extra=true;}]);
    if (search.algorithm === "kd-tree" || search.mode === "approximate") rejects(p,[
      r=>{r.result.diagnostics.search.work=-1;},r=>{r.result.diagnostics.search.work=1e8;}]);
    if (search.mode === "approximate") {
      assert.deepEqual(graph(p).result.diagnostics.search.holdoutSourceIndices,[2,3,1]);
      rejects(p,[r=>{r.result.diagnostics.search.candidateCount=1;},r=>{r.result.diagnostics.search.candidateCounts[0]=3;},
        r=>{r.result.diagnostics.search.candidateCounts.pop();},r=>{r.result.diagnostics.search.fallbackQueries=[0];},
        r=>{r.result.diagnostics.search.holdoutCount=1;},r=>{r.result.diagnostics.search.holdoutSourceIndices=[0,1,2];},
        r=>{r.result.diagnostics.search.measuredRecall=.9;},r=>{r.result.diagnostics.search.measuredRecall=1.01;},
        r=>{r.result.diagnostics.search.measuredRecall=.99;},r=>{r.result.diagnostics.search.seed=9;}]);
    }
  }
  for (const values of [[],[{id:"a",x:0}]]) roundtrip(make(values,{options:{search:{mode:"approximate",seed:9}}}));
  const fallback=make([{id:"a",x:0},{id:"b",x:1},{id:"c",x:2}],{options:{search:{mode:"approximate",seed:9,trees:1,leafSize:1,searchLeaves:1,fallback:"exact"}}});
  assert.deepEqual(graph(fallback).result.diagnostics.search.fallbackQueries,[0,1,2]); roundtrip(fallback);
  const grid=make([{id:"a",x:0},{id:"b",x:0},{id:"c",x:2}],{rule:"radius",options:{radius:0,search:{algorithm:"grid"}}});
  assert.deepEqual(pairs(grid),expected([["a","b",0]])); roundtrip(grid);
});

test("structural graph restore preserves typed ties, explicit hubs and omitted row reasons", () => {
  const structural = { id:"network",nodeKey:"id",ruleId:"relations" };
  const values = [{id:"b",g:"one",order:1},{id:2,g:"one",order:1},{id:"a",g:"one",order:1},{id:"missing",g:null,order:0},{id:"noOrder",g:"one",order:null}];
  const p = chart().createData({id:"rows",values}).createInferredGraphData({...structural,rule:"sequence",options:{orderField:"order",groupBy:["g"],missing:"omit-node"}});
  assert.deepEqual(pairs(p),expected([[2,"a",1],["a","b",1]]));
  assert.deepEqual(graph(p).result.diagnostics.omitted,[{index:3,reason:"missing-group"},{index:4,reason:"missing-order"}]); roundtrip(p);
  rejects(p,[r=>{r.result.diagnostics.omitted.reverse();},r=>{r.result.diagnostics.sourceIndices=[0,1];},
    r=>{r.options.definition.options.lag=2;r.result.diagnostics.options.lag=2;}]);
  const star = chart().createData({id:"rows",values:values.slice(0,3)}).createInferredGraphData({...structural,rule:"group",options:{fields:["g"],mode:"star",hubs:[{group:["one"],key:"a"}]}});
  assert.deepEqual(pairs(star),expected([[2,"a",1],["a","b",1]])); roundtrip(star);
  rejects(star,[r=>{r.options.definition.options.hubs[0].key=2;r.result.diagnostics.options.hubs[0].key=2;},
    r=>{r.options.definition.options.mode="clique";delete r.options.definition.options.hubs;r.result.diagnostics.options={ruleId:"relations",missing:"error",mode:"clique"};}]);
  const included = chart().createData({id:"rows",values:[{id:1,g:null},{id:2,g:null}]}).createInferredGraphData({...structural,rule:"group",options:{fields:["g"],missing:"include",mode:"star",hubKey:2}});
  assert.deepEqual(pairs(included),expected([[1,2,1]])); roundtrip(included);
  const temporal=chart().createData({id:"rows",values:[{id:"a",year:2020},{id:"b",year:2021},{id:"c",year:2024}]}).createInferredGraphData({...structural,rule:"sequence",options:{orderField:"year",temporalUnit:"year",maxGap:370*86400000}});
  assert.deepEqual(pairs(temporal),expected([["a","b",1]])); roundtrip(temporal);
});

test("metric-specific public inputs retain set, geographic, negative similarity and spanning semantics", () => {
  const set = make([{id:"a",tags:[1,"1"]},{id:"b",tags:[1]},{id:"c",tags:[]}],{rule:"similarity",metric:"jaccard",features:{set:"tags"},options:{threshold:.5}});
  assert.deepEqual(pairs(set),expected([["a","b",.5]])); roundtrip(set);
  const geographical=make([{id:"a",lon:179,lat:0},{id:"b",lon:-179,lat:0}],{metric:"great-circle",features:{longitude:"lon",latitude:"lat"},rule:"mst"});
  assert.ok(Math.abs(graph(geographical).result.diagnostics.cost - 222390.1604670658)<1e-7); roundtrip(geographical);
  const cosine=make([{id:"a",x:1},{id:"b",x:-1},{id:"c",x:0}],{rule:"similarity",metric:"cosine",options:{threshold:-1,zeroVector:"zero-similarity"}});
  assert.deepEqual(pairs(cosine),expected([["a","b",-1],["a","c",0],["b","c",0]])); roundtrip(cosine);
  rejects(geographical,[r=>{r.result.diagnostics.cost=0;},r=>{r.result.diagnostics.candidateCount=0;},
    r=>{r.result.diagnostics.componentNodes=[[0,0]];},r=>{r.result.diagnostics.components=2;}]);
});

test("public inference validates own data without invoking getters and rejects ambiguous selectors", () => {
  const base=chart().createData({id:"rows",values:[{id:"a",x:0},{id:"b",x:1}]}), before=serializeProgram(base);
  let getters=0;
  const accessor=Object.defineProperty({},"k",{enumerable:true,get(){getters++;return 1;}});
  for(const run of [()=>base.createInferredGraphData({...request,options:accessor}),
    ()=>base.createInferredGraphData({...request,unknown:true}),()=>base.createInferredGraphData({...request,features:undefined}),
    ()=>base.createInferredGraphData({...request,rule:"mst",candidateGraph:"absent"}),
    ()=>base.createInferredGraphData({...request,rule:"knn",options:{search:{algorithm:"grid"}}})]) assert.throws(run);
  assert.equal(getters,0); assert.equal(serializeProgram(base),before);
  const p=base.createInferredGraphData(request);
  assert.throws(()=>p.editInferredGraphData({definition:null}));
  assert.throws(()=>p.editInferredGraphData({definition:accessor})); assert.equal(getters,0);
  assert.throws(()=>resolveGraphSourceData(chart()),/explicit graph data/);
  const multiple=base.createData({id:"other",values:[{id:"a",x:2}]})._clone({context:{}});
  assert.throws(()=>resolveGraphSourceData(multiple),/explicit graph data/);
  assert.equal(resolveGraphSourceData(multiple,"rows").id,"rows");
  assert.equal(resolveGraphSourceData(base).id,"rows");
});
