import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { chart as basicChart } from '../../../../src/basic.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { inferGraphNeighbors } from '../../../../src/grammar/graph/neighbors.js';
import { inferGraphGroups, inferGraphSequence } from '../../../../src/grammar/graph/structural.js';
import { inferGraphMst, selectGraphSpanningForest } from '../../../../src/grammar/graph/spanning.js';
import { subsetGraphCandidate } from '../../../../src/grammar/graph/candidateSubset.js';

const graph = (program, id = 'g') => program.semanticSpec.resources.find(r => r.kind === 'graph' && r.id === id);
const definition = { id: 'g', data: 'd', nodeKey: 'id', ruleId: 'r', rule: 'knn', features: ['x','y'], metric: 'manhattan',
  options: { k: 10, search: { mode: 'exact', algorithm: 'kd-tree' } } };
function expectedPairs(rows, k) {
  return rows.flatMap((source, i) => rows.map((target, j) => ({ i, j, distance: Math.abs(source.x-target.x)+Math.abs(source.y-target.y) }))
    .filter(pair => pair.i !== pair.j).sort((a,b) => a.distance-b.distance || rows[a.j].id-rows[b.j].id)
    .slice(0,k).sort((a,b) => rows[a.j].id-rows[b.j].id));
}

test('inferred graph honors explicit edge capacity through exact search, edit, revision and portable restore', () => {
  const rows = Array.from({length:1001},(_,id)=>({id,x:id%32,y:Math.floor(id/32)}));
  const expected = expectedPairs(rows,10), before = chart().createData({id:'d',keyField:'id',values:rows}), snapshot=serializeProgram(before);
  assert.throws(()=>before.createInferredGraphData(definition),/Graph neighbor edges must not exceed 10000/);
  const program=before.createInferredGraphData({...definition,maxEdges:10010}), resource=graph(program);
  assert.equal(resource.result.model.edges.length,10010);
  resource.result.model.edges.forEach((edge,index)=>{
    const wanted=expected[index];assert.deepEqual(edge.sourceRows,[wanted.i,wanted.j]);assert.equal(edge.weight,wanted.distance);
    assert.equal(edge.sourceKey,resource.result.model.nodes[wanted.i].key);assert.equal(edge.targetKey,resource.result.model.nodes[wanted.j].key);
  });
  assert.equal(resource.options.definition.maxEdges,10010);assert.equal(resource.algorithmVersion,'1');
  assert.equal(resource.result.diagnostics.search.algorithmVersion,'kd-tree@1');assert.equal(program.graphicSpec,before.graphicSpec);
  const changed=program.editInferredGraphData({target:'g',definition:{maxEdges:10011}});
  assert.equal(graph(changed).revision,1);assert.deepEqual(graph(changed).result,resource.result);
  const revised=program.reviseData({source:'d',id:'next',values:rows.map(row=>({...row,x:row.x+5}))});
  assert.equal(graph(revised).revision,1);assert.equal(graph(revised).inputs[0].id,'next');
  assert.deepEqual(graph(revised).result.model,resource.result.model);
  const saved=serializeProgram(revised);assert.equal(serializeProgram(deserializeProgram(saved)),saved);
  assert.throws(()=>program.editInferredGraphData({definition:{maxEdges:10009}}),/Graph neighbor edges must not exceed 10009/);
  assert.equal(serializeProgram(before),snapshot);assert.equal(graph(program),resource);
  assert.equal(typeof basicChart().createInferredGraphData,'undefined');
});

test('radius, similarity and group results retain every edge above the default capacity when explicitly admitted', () => {
  const n=143, rows=Array.from({length:n},(_,id)=>({id,x:1,group:'all'})), count=n*(n-1)/2;
  const before=chart().createData({id:'d',keyField:'id',values:rows});
  for (const variant of [
    {rule:'radius',features:['x'],metric:'manhattan',options:{radius:0,search:{mode:'exact',algorithm:'grid'}}},
    {rule:'similarity',features:['x'],metric:'cosine',options:{threshold:1}},
    {rule:'group',options:{fields:['group']}}
  ]) {
    const args={id:'g',data:'d',nodeKey:'id',ruleId:'r',...variant};
    assert.throws(()=>before.createInferredGraphData(args),/edges must not exceed 10000/);
    const program=before.createInferredGraphData({...args,maxEdges:count}), resource=graph(program);
    assert.equal(resource.result.model.edges.length,count);
    let edgeIndex=0;
    for(let a=0;a<n;a++)for(let b=a+1;b<n;b++) {
      const edge=resource.result.model.edges[edgeIndex++];assert.deepEqual(edge.sourceRows,[a,b]);
      assert.equal(edge.weight,variant.rule==='radius'?0:1);assert.equal(edge.directed,false);
    }
    assert.deepEqual(graph(deserializeProgram(serializeProgram(program))).result,resource.result);
  }
});

test('explicit source-node capacity reaches metric and structural preparation without changing omit-node semantics', () => {
  const rows=Array.from({length:10001},(_,id)=>({id,x:null,group:null,order:null}));
  const before=chart().createData({id:'d',keyField:'id',values:rows});
  for(const variant of [
    {rule:'knn',features:['x'],metric:'manhattan',options:{missing:'omit-node',search:{mode:'exact',algorithm:'kd-tree'}}},
    {rule:'mst',features:['x'],metric:'manhattan',options:{missing:'omit-node'}},
    {rule:'group',options:{fields:['group'],missing:'omit-node'}},
    {rule:'sequence',options:{orderField:'order',missing:'omit-node'}}
  ]) {
    const args={id:'g',data:'d',nodeKey:'id',ruleId:'r',...variant};
    assert.throws(()=>before.createInferredGraphData(args),/Graph source rows must not exceed 10000/);
    const program=before.createInferredGraphData({...args,maxNodes:10001}),resource=graph(program);
    assert.equal(resource.result.model.nodes.length,0);assert.equal(resource.result.model.edges.length,0);
    assert.equal(resource.provenance.sourceRows.length,10001);
    assert.equal((resource.result.diagnostics.preparation?.omitted ?? resource.result.diagnostics.omitted).length,10001);
    assert.deepEqual(graph(deserializeProgram(serializeProgram(program))).result,resource.result);
  }
});

test('all inference rule kernels enforce the supplied smaller edge limit and retain the default work boundary', () => {
  const keys=[0,1,2],vectors=[[0],[1],[3]],limit={maxNodes:3,maxEdges:1};
  assert.throws(()=>inferGraphNeighbors(keys,vectors,{ruleId:'r',rule:'knn',metric:'manhattan'},limit),/edges must not exceed 1/);
  assert.throws(()=>inferGraphGroups(keys,[[0],[0],[0]],{ruleId:'r'},limit),/edges must not exceed 1/);
  assert.throws(()=>inferGraphSequence(keys,[[],[],[]],[0,1,2],{ruleId:'r'},limit),/edges must not exceed 1/);
  assert.throws(()=>inferGraphMst(keys,vectors,{ruleId:'r',metric:'manhattan'},limit),/edges must not exceed 1/);
  assert.throws(()=>selectGraphSpanningForest(keys,[{sourceIndex:0,targetIndex:1,weight:1},{sourceIndex:1,targetIndex:2,weight:2}],{ruleId:'r'},limit),/edges must not exceed 1/);
  const n=10000,rows=Array.from({length:n},(_,id)=>({id,x:id%100,y:Math.floor(id/100)}));
  const program=chart().createData({id:'d',keyField:'id',values:rows});
  assert.throws(()=>program.createInferredGraphData({...definition,maxNodes:n,maxEdges:n*10}),/Graph exact search work must not exceed 10000000/);
  assert.equal(program.semanticSpec.resources?.length ?? 0,0);
});

test('candidate capacity is independent of the smaller inferred spanning output and selected source subset', () => {
  const rows = [{id:0},{id:1},{id:2}];
  const links = Array.from({length:10001}, (_, id) => ({id, from:id===10000?1:0, to:id===10000?2:1, weight:id===10000?2:1}));
  const before = chart().createData({id:'d', keyField:'id', values:rows})
    .createData({id:'links', keyField:'id', values:links})
    .createGraphData({id:'candidate', nodes:'d', edges:'links', nodeKey:'id', edgeKey:'id', source:'from', target:'to', weight:'weight', maxEdges:10001});
  const candidate = graph(before,'candidate'), snapshot = serializeProgram(before);
  const result = before.createInferredGraphData({id:'g', data:'d', nodeKey:'id', ruleId:'r', rule:'mst', candidateGraph:'candidate', maxEdges:2});
  assert.deepEqual(graph(result).result.model.edges.map(edge=>[edge.sourceRows,edge.weight]), [[[0,1],1],[[1,2],2]]);
  assert.deepEqual(graph(result).inputs[1],{kind:'graph',id:'candidate',revision:0});
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(result))),serializeProgram(result));
  const selected = subsetGraphCandidate(candidate.result.model, rows, rows.slice(0,2), 'id', {maxNodes:3,maxEdges:10001});
  assert.equal(selected.nodes.length,2);assert.equal(selected.edges.length,10000);
  assert.deepEqual(candidate.result.model.edges.length,10001);
  assert.equal(serializeProgram(before),snapshot);
  assert.throws(()=>result.editInferredGraphData({target:'g',definition:{maxEdges:1}}),/edges must not exceed 1/);
});
