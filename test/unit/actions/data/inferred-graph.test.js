import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { encodeRowKey } from "../../../../src/core/itemIdentity.js";

const rows = [{ id: "a", x: 0, group: "first" }, { id: "b", x: 1, group: "first" },
  { id: "c", x: 3, group: "second" }, { id: "d", x: 10, group: "second" }];
const base = () => chart().createData({ id: "points", values: rows, keyField: "id" });
const request = { id: "network", nodeKey: "id", ruleId: "neighbors", rule: "knn", features: ["x"], metric: "euclidean" };
const graph = (program, id = "network") => program.semanticSpec.resources.find(resource => resource.kind === "graph" && resource.id === id);
const pairs = program => graph(program).result.model.edges.map(edge => [edge.sourceKey, edge.targetKey, edge.weight]);
const expected = values => values.map(([a,b,w]) => [encodeRowKey(a), encodeRowKey(b), w]);

test("inferred graphs expose six rules with literal topology and exact row lineage", () => {
  const variants = [
    [{}, [["a","b",1],["b","a",1],["c","b",2],["d","c",7]]],
    [{rule:"radius",options:{radius:2}}, [["a","b",1],["b","c",2]]],
    [{rule:"mst"}, [["a","b",1],["b","c",2],["c","d",7]]]
  ];
  for (const [patch, edges] of variants) {
    const before=base(), program=before.createInferredGraphData({...request,...patch}), resource=graph(program);
    assert.deepEqual(pairs(program),expected(edges));
    assert.deepEqual(resource.options.roles,{nodes:0,edges:0});
    assert.equal(resource.inputs.length,1); assert.equal(resource.provenance.origin,"inferred");
    assert.equal(resource.result.model.edges[0].ruleId,"neighbors");
    assert.deepEqual(resource.result.model.edges[0].sourceRows,[0,1]);
    assert.equal(program.graphicSpec,before.graphicSpec);
    assert.ok(Object.isFrozen(resource.result.diagnostics));
    assert.equal(program.trace.children.at(-1).children[0].op,"editSemantic");
    assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec,program.semanticSpec);
  }
  const structural={id:"network",nodeKey:"id",ruleId:"structural"};
  assert.deepEqual(pairs(base().createInferredGraphData({...structural,rule:"group",options:{fields:["group"]}})),expected([["a","b",1],["c","d",1]]));
  assert.deepEqual(pairs(base().createInferredGraphData({...structural,rule:"sequence",options:{orderField:"x",lag:2}})),expected([["a","c",1],["b","d",1]]));
  const similar=chart().createData({id:"vectors",values:[{id:"a",x:1,y:0},{id:"b",x:2,y:0},{id:"c",x:-1,y:0}]})
    .createInferredGraphData({...request,rule:"similarity",features:["x","y"],metric:"cosine",options:{threshold:1}});
  assert.deepEqual(pairs(similar),expected([["a","b",1]]));
  assert.equal(typeof basicChart().createInferredGraphData,"undefined");
});

test("inference preserves source revisions, resolved statistics and explicit omitted node reasons", () => {
  const program=chart().createData({id:"points",values:[...rows,{id:"absent",x:null}],keyField:"id"})
    .createInferredGraphData({...request,preprocess:"standardize",options:{missing:"omit-node"}});
  const result=graph(program).result;
  assert.equal(result.model.nodes.length,4);
  assert.deepEqual(result.diagnostics.preparation.sourceIndices,[0,1,2,3]);
  assert.deepEqual(result.diagnostics.preparation.omitted,[{index:4,feature:0,reason:"missing-value"}]);
  assert.equal(result.diagnostics.preparation.statistics.length,1);
  assert.equal(Object.hasOwn(result.diagnostics.preparation,"vectors"),false);
  assert.equal(Object.hasOwn(result.diagnostics,"edges"),false);
  const restored=deserializeProgram(serializeProgram(program));
  assert.deepEqual(graph(restored).result,result);
});

test("inferred edits and source revisions refresh layouts and plots while view edits retain topology", () => {
  const before=base().createInferredGraphData(request).layoutGraph({id:"positions",method:"circular"})
    .createCanvas({width:240,height:180}).createGraphPlot({id:"networkPlot",layout:"positions"});
  const snapshot=serializeProgram(before), model=graph(before).result.model;
  const styled=before.editGraphPlot({nodes:{radius:8}}).editLayout({options:{radius:40}}).editCanvas({width:260});
  assert.equal(graph(styled).result.model,model);
  const changed=before.editInferredGraphData({definition:{options:{k:2}}});
  assert.equal(graph(changed).revision,1); assert.equal(graph(changed).result.model.edges.length,8);
  assert.equal(changed.semanticSpec.resources.find(item=>item.kind==="layout").revision,1);
  assert.equal(getMarkItems(changed, {target:"networkPlot"}).length,12);
  const revised=before.reviseData({source:"points",id:"updated",values:rows.map(row=>({...row,x:row.x*2}))});
  assert.equal(graph(revised).revision,1);
  assert.deepEqual(graph(revised).result.model.edges.map(edge=>edge.key),model.edges.map(edge=>edge.key));
  assert.deepEqual(graph(revised).result.model.edges.map(edge=>edge.weight),[2,2,4,14]);
  assert.equal(serializeProgram(before),snapshot);
});

test("candidate MST stores and updates exact graph dependencies without changing unrelated graphs", () => {
  const before=base().createData({id:"links",values:[{from:"a",to:"b",weight:1},{from:"b",to:"c",weight:2},{from:"c",to:"d",weight:7}]})
    .createGraphData({id:"observed",nodes:"points",edges:"links",nodeKey:"id",source:"from",target:"to",weight:"weight"})
    .createInferredGraphData({id:"network",data:"points",nodeKey:"id",ruleId:"backbone",rule:"mst",candidateGraph:"observed"});
  assert.deepEqual(pairs(before),expected([["a","b",1],["b","c",2],["c","d",7]]));
  assert.deepEqual(graph(before).inputs[1],{kind:"graph",id:"observed",revision:0});
  const edited=before.reviseData({source:"links",id:"nextLinks",values:[{from:"a",to:"b",weight:0},{from:"b",to:"c",weight:4},{from:"c",to:"d",weight:2}]});
  assert.equal(graph(edited).revision,1); assert.equal(graph(edited).inputs[1].revision,1);
  assert.equal(graph(edited).result.diagnostics.cost,6);
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).semanticSpec,edited.semanticSpec);
});

test("invalid inference requests and altered persisted diagnostics fail atomically", () => {
  const before=base().createInferredGraphData(request),snapshot=serializeProgram(before);
  for(const run of [()=>before.createInferredGraphData(request),()=>before.editInferredGraphData({}),
    ()=>before.editInferredGraphData({definition:{options:{k:4}}}),
    ()=>before.editInferredGraphData({definition:{metric:undefined}}),
    ()=>before.editInferredGraphData({candidateGraph:"network"}),
    ()=>before.editGraphData({target:"network",definition:{directed:true}})]) {
    assert.throws(run); assert.equal(serializeProgram(before),snapshot);
  }
  const envelope=JSON.parse(snapshot),state=decodeValue(envelope.payload);
  for(const mutate of [r=>{r.options.roles.edges=1;},r=>{r.result.model.nodes[0].sourceRows=[3];},
    r=>{r.result.model.edges[0].ruleId="changed";},r=>{r.result.diagnostics.effectiveK=90;},
    r=>{r.result.diagnostics.preparation.sourceIndices=[1,2,3];},r=>{r.provenance.sourceRows=[];}]) {
    const changed=structuredClone(state);mutate(graph(changed));
    assert.throws(()=>deserializeProgram(JSON.stringify({...envelope,payload:encodeValue(changed)})));
  }
});


test("one source revision updates a candidate chain and every layout only once", () => {
  const before = base().createInferredGraphData({ ...request, rule: "radius", options: { radius: 20 } })
    .createInferredGraphData({ id: "backbone", data: "points", nodeKey: "id", ruleId: "tree", rule: "mst", candidateGraph: "network" })
    .createInferredGraphData({ id: "again", data: "points", nodeKey: "id", ruleId: "next", rule: "mst", candidateGraph: "backbone" })
    .layoutGraph({ id: "placement", graph: "again", method: "circular" });
  const after = before.reviseData({ source: "points", id: "expanded", values: rows.map(row => ({ ...row, x: row.x * 2 })) });
  for (const id of ["network", "backbone", "again"]) {
    assert.equal(graph(after,id).revision,1);
    assert.equal(graph(after,id).inputs[0].id,"expanded");
  }
  assert.equal(after.semanticSpec.resources.find(resource=>resource.kind==="layout").revision,1);
  assert.deepEqual(deserializeProgram(serializeProgram(after)).semanticSpec,after.semanticSpec);
  assert.throws(()=>before.editInferredGraphData({target:"network",candidateGraph:"again",definition:{rule:"mst",ruleId:"cycle"}}),/cyclic/i);
});


test("empty and singleton graph rules remain explicit and store positive zero pair counts", () => {
  for(const values of [[],[rows[0]]]) for(const [rule, options] of [["knn",{}],["radius",{radius:0}],["mst",{}]]) {
    const program=chart().createData({id:"points",values}).createInferredGraphData({...request,rule,options});
    assert.equal(graph(program).result.model.edges.length,0);
    assert.ok(Object.is(graph(program).result.diagnostics.pairCount,0));
    if(rule==="knn") assert.equal(graph(program).result.diagnostics.effectiveK,0);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).semanticSpec,program.semanticSpec);
  }
});

test("exact search and explicit seeded approximate search preserve public identities and qualification", () => {
  const exact=base().createInferredGraphData(request);
  const spatial=base().createInferredGraphData({...request,options:{search:{algorithm:"kd-tree"}}});
  assert.deepEqual(graph(spatial).result.model,graph(exact).result.model);
  const approximate=base().createInferredGraphData({...request,options:{search:{mode:"approximate",seed:23}}});
  const search=graph(approximate).result.diagnostics.search;
  assert.equal(search.mode,"approximate");assert.equal(search.seed,23);assert.equal(search.measuredRecall,1);
  assert.deepEqual(graph(approximate).result.model,graph(exact).result.model);
  assert.deepEqual(deserializeProgram(serializeProgram(approximate)).semanticSpec,approximate.semanticSpec);
  assert.throws(()=>base().createInferredGraphData({...request,options:{search:{mode:"approximate"}}}),/seed/);
});

test("rule replacement removes inapplicable intent and retained source attributes remain immutable", () => {
  const before=base().createInferredGraphData({...request,attributes:["group"]});
  const after=before.editInferredGraphData({definition:{rule:"group",ruleId:"groups",options:{fields:["group"]}}});
  assert.deepEqual(pairs(after),expected([["a","b",1],["c","d",1]]));
  assert.equal(Object.hasOwn(graph(after).options.definition,"metric"),false);
  assert.deepEqual(graph(after).options.definition.attributes,["group"]);
  assert.equal(graph(before).options.definition.rule,"knn");
});


test("candidate removal switches to a metric spanning tree with an explicit new source",()=>{
  const source=base().createInferredGraphData({...request,rule:"radius",options:{radius:20}})
    .createInferredGraphData({id:"backbone",data:"points",nodeKey:"id",ruleId:"tree",rule:"mst",candidateGraph:"network"});
  const changed=source.editInferredGraphData({target:"backbone",data:"points",candidateGraph:null,definition:{features:["x"],metric:"manhattan"}});
  assert.equal(graph(changed,"backbone").inputs.length,1);
  assert.equal(graph(changed,"backbone").result.diagnostics.cost,10);
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).semanticSpec,changed.semanticSpec);
  assert.throws(()=>base().createInferredGraphData());
  assert.throws(()=>source.editInferredGraphData());
});
