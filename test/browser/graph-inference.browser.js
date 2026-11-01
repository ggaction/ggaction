import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from '../support/browser.js';
import { startStaticServer } from '../support/static-server.js';

let browser,server;
test.before(async()=>{server=await startStaticServer(fileURLToPath(new URL('../../',import.meta.url)),{dependencies:'repository'});browser=await chromium.launch({headless:true});});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();});
test('actual inference workers retain every original node, exact neighbor, weight and row at all admitted sizes', {timeout:240000}, async t=>{
 const context=await browser.newContext();
 try {
  const {page,errors}=await openBrowserPage(context,new URL('examples/browser-host/?chart=graph-plots',server.baseUrl).href,{waitFor:()=>!/^Loading/.test(document.querySelector('#status')?.textContent??'Loading')});
  const results=await page.evaluate(async()=>{
   const {chart}=await import('/src/index.js');
   const {createGraphInferenceExecutor,prepareInferredGraphData}=await import('/src/graph.js');
   const {expectedGridNeighbors}=await import('/test/oracles/inference-grid.js');
   const results=[];
   for(const count of [100,1000,10000]){
    const side=Math.ceil(Math.sqrt(count)), rows=Array.from({length:count},(_,i)=>{const id=count-1-i;return{id,x:id%side,y:Math.floor(id/side)};});
    const source=chart().createData({id:'points',keyField:'id',values:rows});
    let terminated=0;
    const executor=createGraphInferenceExecutor({createWorker(){const worker=new Worker('/examples/graph-inference/browser-worker.js',{type:'module'});const terminate=worker.terminate.bind(worker);worker.terminate=()=>{terminated++;terminate();};return worker;}});
    try {
     const start=performance.now();
     const prepared=await prepareInferredGraphData(source,{kind:'create',id:'network',nodeKey:'id',ruleId:'nearest',rule:'knn',features:['x','y'],metric:'manhattan',options:{k:10,search:{algorithm:'kd-tree'}},maxEdges:count*10,execution:{policy:'bounded-inference@1',maxWork:100000000,maxBytes:134217728}},{executor,requestToken:'create'});
     const preparedAt=performance.now(),program=source.createInferredGraphData({prepared,requestToken:'create'}),committedAt=performance.now();
     const resource=program.semanticSpec.resources.find(r=>r.kind==='graph'),model=resource.result.model,expected=expectedGridNeighbors(rows);
     if(model.nodes.length!==count||model.edges.length!==count*10||terminated!==1)throw Error('worker cardinality/lifetime');
     for(let i=0;i<expected.length;i++){
      const e=model.edges[i],want=expected[i];
      if(e.sourceKey!==model.nodes[want.sourceIndex].key||e.targetKey!==model.nodes[want.targetIndex].key||e.weight!==want.weight||e.directed!==true||e.sourceRows.length!==2||e.sourceRows[0]!==want.sourceIndex||e.sourceRows[1]!==want.targetIndex)throw Error(`oracle ${count}/${i}`);
     }
     if(program.graphicSpec!==source.graphicSpec||(source.semanticSpec.resources?.length??0)!==0)throw Error('source mutation');
     results.push({count,edges:model.edges.length,terminated,prepareMs:preparedAt-start,commitMs:committedAt-preparedAt,searchWork:resource.result.diagnostics.search.work});
    }finally{executor.dispose();}
   }
   return results;
  });
  assert.deepEqual(results.map(r=>[r.count,r.edges,r.terminated]),[[100,1000,1],[1000,10000,1],[10000,100000,1]]);
  t.diagnostic(JSON.stringify({kind:'functional-single-run-not-P95',results}));assertNoBrowserErrors(errors,'inference worker');await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});
