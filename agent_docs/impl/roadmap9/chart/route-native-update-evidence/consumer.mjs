import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { chart } from 'ggaction';
import { chart as basicChart } from 'ggaction/basic';
import { prepareGraphEdgeRoutes, createGraphRouteExecutor, computeGraphEdgeRoutes, computeGraphEdgeRoutesAsync } from 'ggaction/graph';
import { serializeProgram, deserializeProgram } from 'ggaction/persistence';
import { renderToSVG } from 'ggaction/svg';
const execution = {policy:'bounded-route@1',maxWork:8000000000,maxCandidatePairs:50000000,maxSamples:16777216,maxBufferBytes:134217728,maxBytes:134217728};
const resource = (p,kind,id) => p.semanticSpec.resources.find(x=>x.kind===kind&&x.id===id);
const source = () => chart().createCanvas({width:200,height:120})
 .createData({id:'n',values:[0,1,2].map(id=>({id,meta:{'é😀':'\ud800',array:[null,-0,123n]}}))}).createData({id:'e',values:[{id:0,s:0,t:1},{id:1,s:1,t:2}]})
 .createGraphData({id:'g',nodes:'n',edges:'e',nodeKey:'id',edgeKey:'id',source:'s',target:'t',attributes:['meta']})
 .layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:-0,y:0},{key:1,x:10,y:10},{key:2,x:20,y:0}]}});
const tagged = value => value === undefined ? ['undefined'] : typeof value==='bigint' ? ['bigint',String(value)]
 : typeof value==='number'&&(!Number.isFinite(value)||Object.is(value,-0)) ? ['number',Object.is(value,-0)?'-0':String(value)]
 : value===null||typeof value!=='object' ? value : Array.isArray(value)
 ? ['array',Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)?tagged(value[i]):['hole'])]
 : ['object',Object.entries(value).map(([k,v])=>[k,tagged(v)])];
const digest = value => createHash('sha256').update(JSON.stringify(tagged(value))).digest('hex');
assert.equal(JSON.stringify(tagged([,undefined,-0,1n])), '["array",[["hole"],["undefined"],["number","-0"],["bigint","1"]]]');
let workers=0,terminated=0,listeners=0; const packets=[];
const executor=createGraphRouteExecutor({createWorker(){
 workers++;const worker=new Worker(new URL('./worker.mjs',import.meta.url)), adapters=new Map();
 return {postMessage(message){packets.push(structuredClone(message.job));worker.postMessage(message);},
 addEventListener(type,fn){const listener=type==='message'?data=>fn({data}):error=>fn({error});adapters.set(fn,listener);listeners++;worker.on(type,listener);},
 removeEventListener(type,fn){worker.off(type,adapters.get(fn));adapters.delete(fn);listeners--;},terminate(){terminated++;worker.terminate();}};
}});
const records=[];
try {
 for(const method of ['edge-path','force-directed','density','hierarchical'])for(const coordinateSpace of ['world','screen']){
  let p=source(), options={execution};
  if(method==='hierarchical'){
   p=p.createData({id:'tree',values:[{id:'root',parent:null,v:0},...[0,1,2].map(id=>({id,parent:'root',v:1}))]})
    .createHierarchyData({id:'h',data:'tree',key:'id',parent:'parent',value:'v'}).layoutHierarchy({id:'hl',method:'tree',options:{nodeSize:[1,1],siblingGap:1,depthGap:10,orientation:'vertical'}});
   const nodes=resource(p,'layout','hl').result.nodes;
   const keys=resource(p,'graph','g').result.model.nodes.map(n=>n.key);
   p=p.editLayout({target:'l',options:{positions:[0,1,2].map((key,index)=>{const n=nodes.find(n=>n.key===keys[index]);return {key,x:n.x,y:n.y};})}});
   options={execution,hierarchy:'h',hierarchyLayout:'hl',mapping:[0,1,2].map(nodeKey=>({nodeKey,hierarchyKey:nodeKey}))};
  }
  const before=serializeProgram(p), input={kind:'create',id:'r',method,graph:'g',layout:'l',coordinateSpace,options};
  const prepared=await prepareGraphEdgeRoutes(p,input,{executor,deadlineMs:30000,requestToken:'t'});
  const next=p.bundleGraphEdges({prepared,requestToken:'t'}), route=resource(next,'edge-route','r');
  const job=packets.at(-1), {inputHash,...body}=job;
  assert.equal(job.schemaVersion,2);assert.equal(inputHash,digest(body));
  const completion=await computeGraphEdgeRoutesAsync(job);assert.equal(completion.resultHash,digest(completion.result));
  const mutable=structuredClone(job), pending=computeGraphEdgeRoutesAsync(mutable);mutable.input.positions[0].x=999;mutable.intent.options.execution.maxWork=1;assert.deepEqual(await pending,completion);
  assert.equal(route.result.resultHash,completion.resultHash);assert.ok(!Object.hasOwn(job.input,'limits'));
  const v1options={...options};delete v1options.execution;
  const {kind,...raw}=input;const ordinary=resource(p.bundleGraphEdges({...raw,options:v1options}),'edge-route','r');
  assert.deepEqual(route.result.routes,ordinary.result.routes);
  const plotted=next.createGraphPlot({id:'plot',routes:'r',nodes:{radius:1}});
  assert.match(renderToSVG(plotted),/<path/);assert.deepEqual(deserializeProgram(serializeProgram(plotted)).graphicSpec,plotted.graphicSpec);
  const edit=await prepareGraphEdgeRoutes(plotted,{kind:'edit',target:'r',options:{zeroLength:'point'}},{executor,deadlineMs:30000,requestToken:'e'});
  assert.equal(resource(plotted.editEdgeRoute({prepared:edit,requestToken:'e'}),'edge-route','r').revision,1);
  assert.equal(serializeProgram(p),before);assert.throws(()=>p.bundleGraphEdges({prepared:{...prepared},requestToken:'t'}),/authentic/);
  assert.throws(()=>computeGraphEdgeRoutes(job),/Async/);await assert.rejects(computeGraphEdgeRoutesAsync(job,AbortSignal.abort(Error('stop'))),/stop/);
  const hostile=structuredClone(job);Object.defineProperty(hostile.input,'positions',{enumerable:true,get(){throw Error('getter invoked');}});
  await assert.rejects(computeGraphEdgeRoutesAsync(hostile),/accessor/);
  const position = resource(plotted,'layout','l').options.options.positions[0];
  const nativeArgs = { target:'l', node:{...position,x:position.x+(method==='hierarchical'?0:3)} };
  const nativePrepared = await prepareGraphEdgeRoutes(plotted,{kind:'update',edit:{action:'editLayout',args:nativeArgs}},{executor,deadlineMs:30000,requestToken:'native'});
  const revised = plotted.applyGraphEdgeRoutesUpdate({prepared:nativePrepared,requestToken:'native'});
  const direct = p.bundleGraphEdges({...raw,options:v1options}).createGraphPlot({id:'plot',routes:'r',nodes:{radius:1}}).editLayout(nativeArgs);
  assert.deepEqual(revised.graphicSpec,direct.graphicSpec);
  assert.deepEqual(resource(revised,'edge-route','r').result.routes,resource(direct,'edge-route','r').result.routes);
  assert.equal(revised.trace.children.at(-1).children[0].op,'editLayout');
  assert.deepEqual(deserializeProgram(serializeProgram(revised)).graphicSpec,revised.graphicSpec);
  assert.throws(()=>plotted.applyGraphEdgeRoutesUpdate({prepared:structuredClone(nativePrepared),requestToken:'native'}),/authentic/);
  assert.throws(()=>revised.applyGraphEdgeRoutesUpdate({prepared:nativePrepared,requestToken:'native'}),/different/);
  records.push({nativeUpdate:true,nativeUpdateGeometryHash:digest(resource(revised,'edge-route','r').result.routes),method,coordinateSpace,nativeGeometryHash:digest(ordinary.result.routes),geometryHash:digest(route.result.routes),inputHash,resultHash:route.result.resultHash,jobBytes:Buffer.byteLength(JSON.stringify(tagged(job))),completionBytes:Buffer.byteLength(JSON.stringify(tagged(completion))),work:route.result.diagnostics.work});
 }
 await assert.rejects(prepareGraphEdgeRoutes(basicChart(),{kind:'create',id:'x',method:'density',options:{execution}},{executor,deadlineMs:30000,requestToken:'x'}),/Full/);
 assert.equal(typeof basicChart().applyGraphEdgeRoutesUpdate,"undefined");
 assert.equal(workers,terminated);assert.equal(listeners,0);
 console.log(JSON.stringify({status:'passed',node:process.version,records,workers,terminated,listeners,sourceFreePublicEntries:true},null,2));
}finally{executor.dispose();}
