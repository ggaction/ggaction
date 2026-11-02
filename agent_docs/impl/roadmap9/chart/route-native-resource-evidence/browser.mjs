import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';import{createHash}from'node:crypto';
import {build} from 'esbuild';import {chromium} from 'playwright';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {documentationCodeBlocks} from '../../../../../scripts/doc-snippets.js';
import {startStaticServer} from '../../../../../test/support/static-server.js';
const prefix=process.env.ROUTE_QUALIFICATION_DIRECTORY??'.artifacts/route-native-resource',frozen=JSON.parse(await readFile(`${prefix}/frozen.json`,'utf8'));
assert.equal(createHash('sha256').update(await readFile(frozen.file)).digest('hex'),frozen.sha256);
if (!process.env.npm_execpath) process.env.npm_execpath=await realpath('/opt/homebrew/bin/npm');
const directory=await mkdtemp(path.join(tmpdir(),'ggaction-bounded-routes-'));let consumer,server,browser;
try{
 consumer=await preparePackageConsumer({packageSpec:frozen.file});const installed=await realpath(path.join(consumer.directory,'node_modules/ggaction'));
 const blocks=documentationCodeBlocks(await readFile('docs/api/edge-routes.md','utf8')).filter(block=>block.language==='js'&&block.heading==='Explicit bounded execution');
 assert.equal(blocks.length,2);
 const updateBlock=documentationCodeBlocks(await readFile("docs/api/edge-routes.md","utf8")).find(block=>block.language==="js"&&block.heading==="`applyGraphEdgeRoutesUpdate`");assert.ok(updateBlock);
 const definitions={host:'export{chart,render}from"ggaction";export{prepareGraphEdgeRoutes,createGraphRouteExecutor,prepareInferredGraphData,createGraphInferenceExecutor}from"ggaction/graph";export{serializeProgram,deserializeProgram}from"ggaction/persistence";export{renderToSVG}from"ggaction/svg";',worker:blocks[1].code,'inference-worker':`import{computeGraphInference}from'ggaction/graph';self.onmessage=({data:{job}})=>self.postMessage(computeGraphInference(job));`,'doc-host':`import {chart} from 'ggaction';let program=chart().createCanvas({width:200,height:120}).createData({id:'n',values:[{id:0},{id:1}]}).createData({id:'e',values:[{id:0,s:0,t:1}]}).createGraphData({id:'g',nodes:'n',edges:'e',nodeKey:'id',edgeKey:'id',source:'s',target:'t'}).layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:0,y:0},{key:1,x:20,y:20}]}});${blocks[0].code.replace("} finally {", updateBlock.code+"\n} finally {")};export{program};`};
 const modules={};
 for(const[name,contents]of Object.entries(definitions)){
  const result=await build({stdin:{contents,resolveDir:consumer.directory},bundle:true,format:'esm',platform:'browser',write:false,minify:true,metafile:true});
  const inputs=Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,v])=>v.bytesInOutput>0).map(([k])=>k).filter(k=>k!=='<stdin>');
  for(const input of inputs){const resolved=await realpath(path.resolve(input));assert.ok(resolved.startsWith((await realpath(path.join(consumer.directory,'node_modules')))+path.sep),input);if(name==='worker')assert.ok(resolved.startsWith(installed+'/'),input);}
  if(name==='worker')assert.deepEqual(inputs.filter(x=>/\/src\/(actions|materialization|renderers|selectors)\//.test(x)),[]);
  modules[name]=inputs.length;await writeFile(path.join(directory,`${name}.js`),result.outputFiles[0].contents);if(name==='worker')await writeFile(path.join(directory,'route-worker.js'),result.outputFiles[0].contents);
 }
 await writeFile(path.join(directory,'index.html'),'<!doctype html><title>Bounded native routes</title><link rel="icon" href="data:,"><canvas width="200" height="120"></canvas>');
 server=await startStaticServer(directory);browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(server.baseUrl);
 const result=await page.evaluate(async()=>{
  const documentation=await import('/doc-host.js');if(documentation.program.semanticSpec.resources.find(x=>x.kind==='edge-route')?.algorithmVersion!=='2'||documentation.program.semanticSpec.resources.find(x=>x.kind==='edge-route')?.revision!==1)throw Error('documentation route missing');
  const {chart,render,prepareGraphEdgeRoutes,createGraphRouteExecutor,prepareInferredGraphData,createGraphInferenceExecutor,serializeProgram,deserializeProgram,renderToSVG}=await import('/host.js');
  const execution={policy:'bounded-route@1',maxWork:8000000000,maxCandidatePairs:50000000,maxSamples:16777216,maxBufferBytes:134217728,maxBytes:134217728};
  const source=()=>chart().createCanvas({width:200,height:120}).createData({id:'n',values:[{id:0},{id:1},{id:2}]}).createData({id:'e',values:[{id:0,s:0,t:1},{id:1,s:1,t:2}]}).createGraphData({id:'g',nodes:'n',edges:'e',nodeKey:'id',edgeKey:'id',source:'s',target:'t'}).layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:-0,y:0},{key:1,x:10,y:10},{key:2,x:20,y:0}]}});
  const get=p=>p.semanticSpec.resources.find(x=>x.kind==='edge-route');
  let workers=0,terminated=0,listeners=0;const jobs=[],completions=[];
  function factory(afterPost,file='/worker.js'){return()=>{
   workers++;const worker=new Worker(file,{type:'module'}),adapters=new Map();
   return{postMessage(value){jobs.push(structuredClone(value.job));worker.postMessage(value);afterPost?.();},addEventListener(type,fn){const adapter=type==='message'?e=>{completions.push(e.data);fn(e);}:fn;adapters.set(fn,adapter);listeners++;worker.addEventListener(type,adapter);},removeEventListener(type,fn){worker.removeEventListener(type,adapters.get(fn));adapters.delete(fn);listeners--;},terminate(){terminated++;worker.terminate();}};
  };}
  const executor=createGraphRouteExecutor({createWorker:factory()}),records=[];let lastProgram;
  try{for(const method of ['edge-path','force-directed','density']){
   const p=source(),before=serializeProgram(p),prepared=await prepareGraphEdgeRoutes(p,{kind:'create',id:'r',method,options:{execution},coordinateSpace:'screen'},{executor,deadlineMs:30000,requestToken:'t'});
   const q=p.bundleGraphEdges({prepared,requestToken:'t'}).createGraphPlot({id:'plot',routes:'r',nodes:{radius:1}});
   lastProgram=q;
   const edit=await prepareGraphEdgeRoutes(q,{kind:'edit',target:'r',options:{zeroLength:'point'}},{executor,deadlineMs:30000,requestToken:'e'});
   const routeEdited=q.editEdgeRoute({prepared:edit,requestToken:'e'});
   const native=await prepareGraphEdgeRoutes(routeEdited,{kind:'update',edit:{action:'editLayout',args:{target:'l',node:{key:0,x:3,y:4}}}},{executor,deadlineMs:30000,requestToken:'u'});
   const next=routeEdited.applyGraphEdgeRoutesUpdate({prepared:native,requestToken:'u'}),restored=deserializeProgram(serializeProgram(next));
   if(get(next).revision!==2||JSON.stringify(restored.graphicSpec)!==JSON.stringify(next.graphicSpec)||serializeProgram(p)!==before)throw Error('immutable apply/restore mismatch');
   if(!renderToSVG(next).includes('<path'))throw Error('missing vector path');
   const ctx=document.querySelector('canvas').getContext('2d');render(next,ctx);const pixels=ctx.getImageData(0,0,200,120).data;
   const ink=Array.from(pixels).filter((x,i)=>i%4!==3&&x<240).length;if(ink===0)throw Error('missing Canvas output');
   records.push({method,revision:get(next).revision,hash:get(next).result.resultHash,ink});
  }}finally{executor.dispose();}
  const tagged=v=>v===undefined?['undefined']:typeof v==='bigint'?['bigint',String(v)]:typeof v==='number'&&(!Number.isFinite(v)||Object.is(v,-0))?['number',Object.is(v,-0)?'-0':String(v)]:v===null||typeof v!=='object'?v:Array.isArray(v)?['array',Array.from({length:v.length},(_,i)=>Object.hasOwn(v,i)?tagged(v[i]):['hole'])]:['object',Object.entries(v).map(([k,x])=>[k,tagged(x)])];
  const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(tagged(v))))),b=>b.toString(16).padStart(2,'0')).join('');
  const resource=(p,kind,id)=>p.semanticSpec.resources.find(x=>x.kind===kind&&x.id===id);
  const nativeSource=()=>chart().createCanvas({width:200,height:120}).createData({id:'n',values:[0,1,2].map(id=>({id,meta:{label:'é😀',values:[null,-0,123n]}}))}).createData({id:'e',values:[{id:0,s:0,t:1},{id:1,s:1,t:2}]})
    .createGraphData({id:'g',nodes:'n',edges:'e',nodeKey:'id',edgeKey:'id',source:'s',target:'t',attributes:['meta']}).layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:0,y:0},{key:1,x:10,y:10},{key:2,x:20,y:0}]}});
  const assert={equal(a,b){if(a!==b)throw Error('native browser scalar mismatch');},deepEqual(a,b){if(JSON.stringify(tagged(a))!==JSON.stringify(tagged(b)))throw Error('native browser value mismatch');},
   throws(run,expected){let caught;try{run();}catch(error){caught=error;}if(!caught||(typeof expected==='function'?!expected(caught):!expected.test(caught.message)))throw Error('native browser rejection mismatch');},
   async rejects(promise,expected){let caught;try{await promise;}catch(error){caught=error;}if(!caught||!expected.test(caught.message))throw Error('native browser async rejection mismatch');}};
  const nativeExecutor=createGraphRouteExecutor({createWorker:factory()}),inference=createGraphInferenceExecutor({createWorker:factory(undefined,'/inference-worker.js')});let nativeResources;
  try{
 nativeResources=[];
 for(const mode of ['observed','flow','hierarchy','inferred-raw','inferred-prepared']){
  let base=nativeSource(),method='edge-path',options={},action='editGraphData',args={target:'g',definition:{attributes:['meta']}};
  if(mode==='flow'){
   base=chart().createCanvas({width:200,height:120}).createData({id:'n',values:[{id:0},{id:1}]}).createData({id:'e',values:[{id:0,s:0,t:1,v:1}]})
    .createFlowData({id:'g',nodes:'n',edges:'e',nodeKey:'id',edgeKey:'id',source:'s',target:'t',value:'v'}).layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:0,y:0},{key:1,x:20,y:20}]}});
   action='editFlowData';args={target:'g',definition:{balance:'allow'}};
  }else if(mode==='hierarchy'){
   base=base.createData({id:'tree',values:[{id:'root',parent:null,v:0},...[0,1,2].map(id=>({id,parent:'root',v:1}))]})
    .createHierarchyData({id:'h',data:'tree',key:'id',parent:'parent',value:'v'}).layoutHierarchy({id:'hl',method:'tree',options:{nodeSize:[1,1],siblingGap:1,depthGap:10,orientation:'vertical'}});
   const nodes=resource(base,'layout','hl').result.nodes,keys=resource(base,'graph','g').result.model.nodes.map(n=>n.key);
   base=base.editLayout({target:'l',options:{positions:[0,1,2].map((key,index)=>{const n=nodes.find(n=>n.key===keys[index]);return{key,x:n.x,y:n.y};})}});
   method='hierarchical';options={hierarchy:'h',hierarchyLayout:'hl',mapping:[0,1,2].map(nodeKey=>({nodeKey,hierarchyKey:nodeKey}))};
   action='editHierarchyData';args={target:'h',valueMode:'leaf-sum'};
  }else if(mode.startsWith('inferred')){
   base=chart().createCanvas({width:200,height:120}).createData({id:'n',values:[{id:0,x:0},{id:1,x:2},{id:2,x:6}]})
    .createInferredGraphData({id:'g',data:'n',nodeKey:'id',ruleId:'near',rule:'knn',features:['x'],metric:'manhattan',options:{k:1}})
    .layoutGraph({id:'l',method:'fixed',options:{positions:[{key:0,x:0,y:0},{key:1,x:10,y:10},{key:2,x:20,y:0}]}});
   action='editInferredGraphData';args={target:'g',definition:{options:{k:2}}};
  }
  const create={id:'r',graph:'g',layout:'l',method,options};
  const ordinary=base.bundleGraphEdges(create).createGraphPlot({id:'plot',routes:'r'}),expected=ordinary[action](args);
  const prepared=await prepareGraphEdgeRoutes(base,{kind:'create',...create,options:{...options,execution}},{executor:nativeExecutor,deadlineMs:30000,requestToken:'create-resource'});
  const program=base.bundleGraphEdges({prepared,requestToken:'create-resource'}).createGraphPlot({id:'plot',routes:'r'}),before=serializeProgram(program);
  const signal=new AbortController();let nativeArgs=args;
  if(mode==='inferred-prepared'){
   const prepared=await prepareInferredGraphData(program,{kind:'edit',...args},{executor:inference,requestToken:'inference',signal:signal.signal});
   nativeArgs={prepared,requestToken:'inference'};
   await assert.rejects(prepareGraphEdgeRoutes(program,{kind:'update',edit:{action,args:{...nativeArgs,prepared:structuredClone(prepared)}}},{executor:nativeExecutor,deadlineMs:30000,requestToken:'native-resource'}),/authentic/);
  }
  const update=await prepareGraphEdgeRoutes(program,{kind:'update',edit:{action,args:nativeArgs}},{executor:nativeExecutor,deadlineMs:30000,requestToken:'native-resource'});
  const result=program.applyGraphEdgeRoutesUpdate({prepared:update,requestToken:'native-resource'});
  assert.deepEqual(result.graphicSpec,expected.graphicSpec);assert.deepEqual(resource(result,'edge-route','r').result.routes,resource(expected,'edge-route','r').result.routes);
  assert.equal(result.trace.children.at(-1).children[0].op,action);assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec,result.graphicSpec);
  assert.equal(serializeProgram(program),before);
  if(mode==='inferred-prepared'){const reason=Error('inference revoked');signal.abort(reason);assert.throws(()=>program.applyGraphEdgeRoutesUpdate({prepared:update,requestToken:'native-resource'}),error=>error===reason);}
  nativeResources.push({mode,action,status:'passed',geometryHash:await hash(resource(result,'edge-route','r').result.routes)});
 }
  }finally{nativeExecutor.dispose();inference.dispose();}
  for(const job of jobs){const{inputHash,...body}=job;if(inputHash!==await hash(body))throw Error('job bytes differ');}
  for(const completion of completions)if(completion.resultHash!==await hash(completion.result))throw Error('completion bytes differ');
  const jobHashes=jobs.length,completionHashes=completions.length;
  const cancelled=[];
  for(const phase of ['create','update'])for(const mode of ['abort','deadline']){
   const controller=new AbortController(),reason=Error('browser abort');let publications=0,terminals=0;
   const own=createGraphRouteExecutor({createWorker:factory(mode==='abort'?()=>setTimeout(()=>controller.abort(reason),0):undefined)});
   try{await prepareGraphEdgeRoutes(phase==='create'?source():lastProgram,phase==='create'?{kind:'create',id:'r',method:'edge-path',options:{execution}}:{kind:'update',edit:{action:'editLayout',args:{target:'l',node:{key:0,x:5,y:3}}}},{executor:own,deadlineMs:mode==='deadline'?1:30000,requestToken:'t',signal:controller.signal});publications++;}
   catch(error){if(mode==='abort'?error!==reason:!error.message.includes('deadline'))throw error;}
   finally{terminals++;own.dispose();}
   cancelled.push({phase,mode,publications,terminals});
  }
  return{records,nativeResources,cancelled,workers,terminated,listeners,jobHashes,completionHashes,sourceFree:true,productionMinified:true,userAgent:navigator.userAgent,latencyQualification:false};
 });
 assert.deepEqual(errors,[]);assert.equal(result.records.length,3);assert.equal(result.workers,result.terminated);assert.equal(result.listeners,0);
 for(const entry of result.cancelled){assert.equal(entry.publications,0);assert.equal(entry.terminals,1);}
 await writeFile(`${prefix}/browser.json`,JSON.stringify({...result,sha256:frozen.sha256,modules,documentation:[...blocks,updateBlock].map(block=>({sha256:createHash('sha256').update(block.code).digest('hex'),status:'passed'}))},null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await server?.close();await consumer?.cleanup();await rm(directory,{recursive:true,force:true});}
