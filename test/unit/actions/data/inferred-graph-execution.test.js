import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { chart as basicChart } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { encodeValue, decodeValue } from '../../../../src/persistence/codec.js';
import { resolveInferredGraphInput } from '../../../../src/grammar/graph/input.js';
import { validateInferenceBytes } from '../../../../src/grammar/graph/inferenceBudget.js';
import { expectedGridNeighbors } from '../../../oracles/inference-grid.js';

const execution={policy:'bounded-inference@1',maxWork:100_000_000,maxBytes:128*1024*1024};
const request={id:'g',data:'d',nodeKey:'id',ruleId:'nearest',rule:'knn',features:['x','y'],metric:'manhattan',options:{k:10,search:{mode:'exact',algorithm:'kd-tree'}}};
const grid=n=>Array.from({length:n},(_,i)=>{const id=n-1-i,side=Math.ceil(Math.sqrt(n));return{id,x:id%side,y:Math.floor(id/side),group:'all'};});
const graph=(program,id='g')=>program.semanticSpec.resources.find(r=>r.kind==='graph'&&r.id===id);
const roundtrip=program=>{const saved=serializeProgram(program);assert.equal(serializeProgram(deserializeProgram(saved)),saved);};

test('explicit inference execution preserves all 10000 nodes and 100000 exact directed neighbors with original rows', () => {
  const rows=grid(10000), expected=expectedGridNeighbors(rows), base=chart().createData({id:'d',keyField:'id',values:rows});
  const args={...request,maxNodes:10000,maxEdges:100000};
  assert.throws(()=>base.createInferredGraphData(args),/Graph exact search work must not exceed 10000000/);
  const program=base.createInferredGraphData({...args,execution}),resource=graph(program),model=resource.result.model;
  assert.equal(model.nodes.length,10000);assert.equal(model.edges.length,100000);assert.equal(resource.provenance.sourceRows.length,10000);
  model.edges.forEach((edge,i)=>{
    const truth=expected[i];assert.deepEqual(edge.sourceRows,[truth.sourceIndex,truth.targetIndex]);assert.equal(edge.weight,truth.weight);
    assert.equal(edge.sourceKey,model.nodes[truth.sourceIndex].key);assert.equal(edge.targetKey,model.nodes[truth.targetIndex].key);
    assert.equal(edge.directed,true);assert.equal(edge.origin,'inferred');assert.equal(edge.ruleId,'nearest');
  });
  assert.equal(resource.result.diagnostics.search.work,31318394);assert.equal(resource.result.diagnostics.search.distanceEvaluations,415782);
  assert.equal(resource.algorithmVersion,'1');assert.equal(resource.result.diagnostics.search.algorithmVersion,'kd-tree@1');
  assert.equal(program.graphicSpec,base.graphicSpec);assert.ok(Object.isFrozen(model.edges));assert.equal(base.semanticSpec.resources?.length??0,0);
  assert.throws(()=>program.layoutGraph({id:'positions',graph:'g',method:'circular',options:{maxEdges:100000}}),/Graph model work must not exceed 10000000/);
  assert.equal(rows[0].id,9999);assert.equal(rows.at(-1).id,0);
});

test('execution leaves legacy results exact and follows source revisions, edits, rule replacement and codec', () => {
  const rows=grid(100),base=chart().createData({id:'d',keyField:'id',values:rows}),legacy=base.createInferredGraphData(request);
  const program=base.createInferredGraphData({...request,execution}),resource=graph(program);
  assert.deepEqual(resource.result,graph(legacy).result);assert.equal(Object.hasOwn(graph(legacy).options.definition,'execution'),false);
  const edited=program.editInferredGraphData({target:'g',definition:{options:{k:5,search:{mode:'exact',algorithm:'kd-tree'}}}});
  assert.deepEqual(graph(edited).options.definition.execution,execution);assert.equal(graph(edited).result.model.edges.length,500);
  const revised=program.reviseData({source:'d',id:'next',values:rows.map(row=>({...row,x:row.x+5}))});
  assert.equal(graph(revised).inputs[0].id,'next');assert.equal(graph(revised).revision,1);assert.deepEqual(graph(revised).result.model,resource.result.model);
  assert.deepEqual(graph(revised).options.definition.execution,execution);roundtrip(revised);
  const sequence=program.editInferredGraphData({definition:{rule:'sequence',ruleId:'ordered',options:{orderField:'id'}}});
  assert.deepEqual(graph(sequence).options.definition.execution,execution);assert.equal(graph(sequence).result.model.edges.length,99);roundtrip(sequence);
  assert.equal(typeof basicChart().createInferredGraphData,'undefined');
});

test('every inference rule retains its exact results with an explicit execution policy', () => {
  const rows=[{id:2,x:1,group:'a'},{id:'a',x:1,group:'a'},{id:0,x:2,group:'a'}];
  for(const variant of [
    {rule:'knn',features:['x'],metric:'manhattan',options:{k:1}},
    {rule:'knn',features:['x'],metric:'manhattan',options:{k:1,search:{mode:'approximate',seed:3}}},
    {rule:'radius',features:['x'],metric:'manhattan',options:{radius:1,search:{algorithm:'grid'}}},
    {rule:'similarity',features:['x'],metric:'cosine',options:{threshold:1}},
    {rule:'mst',features:['x'],metric:'manhattan'},
    {rule:'group',options:{fields:['group'],mode:'star',hubKey:2}},
    {rule:'sequence',options:{orderField:'x'}}
  ]){
    const definition={nodeKey:'id',ruleId:'r',...variant};
    const old=resolveInferredGraphInput(rows,definition),bounded=resolveInferredGraphInput(rows,{...definition,execution});
    assert.deepEqual(bounded.model,old.model);assert.deepEqual(bounded.inference,old.inference);
    roundtrip(chart().createData({id:'d',values:rows}).createInferredGraphData({id:'g',...definition,execution}));
  }
});

test('candidate validation uses its own execution budget while the spanning output retains a smaller policy', () => {
  const rows=grid(160),base=chart().createData({id:'d',values:rows});
  const candidate=base.createInferredGraphData({id:'candidate',nodeKey:'id',ruleId:'groups',rule:'group',options:{fields:['group']},maxEdges:12720,execution});
  const program=candidate.createInferredGraphData({id:'g',nodeKey:'id',ruleId:'tree',rule:'mst',candidateGraph:'candidate',maxEdges:159,
    execution:{...execution,maxWork:10_000_000}});
  assert.equal(graph(program).result.model.edges.length,159);assert.equal(graph(program).result.diagnostics.candidateCount,12720);roundtrip(program);
  const changed=program.reviseData({source:'d',id:'updated',values:rows.map(row=>({...row,x:row.x+1}))});
  assert.equal(graph(changed).inputs[1].revision,1);assert.deepEqual(graph(changed).result.model,graph(program).result.model);
  assert.deepEqual(graph(changed,'candidate').options.definition.execution,execution);roundtrip(changed);
  const shown=program.createCanvas().layoutGraph({id:'placement',graph:'g',method:'circular'}).createGraphPlot();
  const subset=shown.filterMarks({recompute:true,field:'key',op:'oneOf',values:[0,1,2]});
  assert.equal(graph(subset).result.model.edges.length,2);assert.equal(graph(subset).result.diagnostics.candidateCount,3);roundtrip(subset);
});

test('byte and work admission failures are atomic and stored execution cannot bypass binding or diagnostics', () => {
  const base=chart().createData({id:'d',values:grid(20)}),snapshot=serializeProgram(base);
  for(const patch of [{maxWork:1},{maxBytes:1}])assert.throws(()=>base.createInferredGraphData({...request,execution:{...execution,...patch}}),/must not exceed/);
  const program=base.createInferredGraphData({...request,execution}),saved=serializeProgram(program),envelope=JSON.parse(saved),state=decodeValue(envelope.payload);
  const resultBytes=validateInferenceBytes(graph(program).result,execution);
  assert.throws(()=>program.editInferredGraphData({definition:{execution:{...execution,maxBytes:resultBytes-1}}}),/result bytes/);
  for(const mutation of [
    r=>{r.options.definition.execution.maxWork=100_000_001;},r=>{r.options.definition.execution.maxBytes=0;},
    r=>{r.options.definition.execution.policy='other';},r=>{r.result.diagnostics.search.work=100_000_001;},
    r=>{r.result.model.edges[0].weight+=1;},r=>{r.options.definition.execution.maxBytes=resultBytes-1;}
  ]){
    const next=structuredClone(state);mutation(graph(next));
    assert.throws(()=>deserializeProgram(JSON.stringify({...envelope,payload:encodeValue(next)})));
  }
  assert.equal(serializeProgram(base),snapshot);assert.equal(serializeProgram(program),saved);
});

test('absent execution never reads an inherited getter during creation or restore', () => {
  let calls=0;Object.defineProperty(Object.prototype,'execution',{configurable:true,get(){calls++;throw Error('inherited execution');}});
  try {roundtrip(chart().createData({id:'d',values:grid(20)}).createInferredGraphData(request));}finally{delete Object.prototype.execution;}
  assert.equal(calls,0);
});
