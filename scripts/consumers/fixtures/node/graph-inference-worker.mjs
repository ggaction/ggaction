import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { chart } from 'ggaction';
import { chart as basicChart } from 'ggaction/basic';
import { createGraphInferenceExecutor, prepareInferredGraphData } from 'ggaction/graph';
import { serializeProgram, deserializeProgram } from 'ggaction/persistence';

const resource=p=>p.semanticSpec.resources.find(r=>r.kind==='graph');
function host() {
  const workers=[];
  const executor=createGraphInferenceExecutor({createWorker(){
    const worker=new Worker(`const {parentPort}=require('node:worker_threads');import('ggaction/graph').then(({computeGraphInference})=>parentPort.on('message',({job})=>parentPort.postMessage(computeGraphInference(job))));`,{eval:true});
    const listeners=new Map(),record={terminated:0,listeners};workers.push(record);
    return {postMessage(message){worker.postMessage(message)},addEventListener(type,fn){const wrapped=value=>fn(type==='message'?{data:value}:{error:value});listeners.set(fn,wrapped);worker.on(type,wrapped)},removeEventListener(type,fn){worker.off(type,listeners.get(fn));listeners.delete(fn)},terminate(){record.terminated++;void worker.terminate();}};
  }});
  return {executor,workers};
}
export const cases=[{id:'data/inferred-graph-worker-lifecycle',async run(){
  const base=chart().createData({id:'d',keyField:'id',values:[{id:2,x:0},{id:'b',x:2},{id:1,x:2}]}),snapshot=serializeProgram(base),{executor,workers}=host();
  const args={id:'network',nodeKey:'id',ruleId:'near',rule:'knn',features:['x'],metric:'manhattan',options:{k:1}};
  try{
    const prepared=await prepareInferredGraphData(base,{kind:'create',...args},{executor,requestToken:'create'});
    const created=base.createInferredGraphData({prepared,requestToken:'create'});
    assert.deepEqual(resource(created),resource(base.createInferredGraphData(args)));
    assert.throws(()=>deserializeProgram(snapshot).createInferredGraphData({prepared,requestToken:'create'}),/receiver/);
    assert.throws(()=>base.createInferredGraphData({prepared:{...prepared},requestToken:'create'}),/authentic/);
    const edit=await prepareInferredGraphData(created,{kind:'edit',target:'network',definition:{options:{k:2}}},{executor,requestToken:'edit'});
    const updated=created.editInferredGraphData({prepared:edit,requestToken:'edit'});
    assert.deepEqual(resource(updated),resource(created.editInferredGraphData({definition:{options:{k:2}}})));
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(updated))),serializeProgram(updated));
    const c=new AbortController(),pending=prepareInferredGraphData(base,{kind:'create',...args},{executor,requestToken:'cancel',signal:c.signal});c.abort(Error('cancelled'));
    await assert.rejects(pending,/cancelled/);assert.equal(serializeProgram(base),snapshot);
    assert.ok(workers.every(w=>w.terminated===1&&w.listeners.size===0));
    await assert.rejects(prepareInferredGraphData(basicChart(),{kind:'create',...args},{executor,requestToken:'basic'}),/Full/);
  }finally{executor.dispose();}
}},{id:'data/inferred-graph-worker-complete-grid',async run(){
  const count=10000,rows=Array.from({length:count},(_,i)=>{const id=count-1-i;return{id,x:id%100,y:Math.floor(id/100)};});
  const base=chart().createData({id:'d',keyField:'id',values:rows}),{executor,workers}=host();
  try{
    const prepared=await prepareInferredGraphData(base,{kind:'create',id:'network',nodeKey:'id',ruleId:'nearest',rule:'knn',features:['x','y'],metric:'manhattan',options:{k:10,search:{algorithm:'kd-tree'}},maxEdges:100000,execution:{policy:'bounded-inference@1',maxWork:100000000,maxBytes:134217728}},{executor,requestToken:'large'});
    const program=base.createInferredGraphData({prepared,requestToken:'large'}),graph=resource(program),model=graph.result.model;
    assert.equal(model.nodes.length,count);assert.equal(model.edges.length,count*10);
    for(let id=0;id<count;id++){
      const x=id%100,y=Math.floor(id/100),candidates=[];
      for(let radius=1;candidates.length<10;radius++)for(let dx=-radius;dx<=radius;dx++){
        const dy=radius-Math.abs(dx);for(const oy of dy===0?[0]:[-dy,dy])if(x+dx>=0&&x+dx<100&&y+oy>=0&&y+oy<100)candidates.push({id:(y+oy)*100+x+dx,weight:radius});
      }
      const wanted=candidates.sort((a,b)=>a.weight-b.weight||a.id-b.id).slice(0,10).sort((a,b)=>a.id-b.id);
      model.edges.slice(id*10,(id+1)*10).forEach((edge,j)=>{
        assert.deepEqual(edge.sourceRows,[9999-id,9999-wanted[j].id]);assert.equal(edge.weight,wanted[j].weight);
        assert.equal(edge.sourceKey,model.nodes[9999-id].key);assert.equal(edge.targetKey,model.nodes[9999-wanted[j].id].key);assert.equal(edge.directed,true);
      });
    }
    assert.equal(graph.result.diagnostics.search.work,31318394);assert.equal(graph.algorithmVersion,'1');
    assert.equal(program.graphicSpec,base.graphicSpec);assert.equal(base.semanticSpec.resources?.length??0,0);
    assert.ok(workers.every(w=>w.terminated===1&&w.listeners.size===0));
  }finally{executor.dispose();}
}}];
