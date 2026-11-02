import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const baseline='4c12b132612e7b83da36daceba7c259d03c826f6',directory=await mkdtemp(path.join(tmpdir(),'ggaction-density-previous-'));
const owners=['src/grammar/graph/routes/density.js','src/grammar/graph/routes/densityField.js'];
const module=p=>import(pathToFileURL(path.join(root,p)));
try {
  for(const owner of owners){
    const text=execFileSync('git',['show',`${baseline}:${owner}`],{cwd:root,encoding:'utf8'});
    const rewritten=text.replace(/from "(\.[^"]+)"/g,(_,relative)=>{
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(owner),relative));
      return `from ${JSON.stringify(pathToFileURL(owners.includes(target)?path.join(directory,path.basename(target)+'.mjs'):path.join(root,target)).href)}`;
    });
    await writeFile(path.join(directory,path.basename(owner)+'.mjs'),rewritten);
  }
  const {bundleDensityRoutes:before}=await import(pathToFileURL(path.join(directory,'density.js.mjs')));
  const {bundleDensityRoutes:after}=await module(owners[0]);
  const {normalizeObservedGraph}=await module('src/grammar/graph/normalize.js');
  const {routeValueHash}=await module('src/grammar/graph/routes/job.js');
  const {getErrorDetails}=await module('src/core/diagnostics.js');
  const results=[];
  for(const directed of [false,true]){
    const points=[{x:-0,y:0},{x:1,y:0},{x:0,y:.02},{x:1,y:.02}];
    const edges=[{key:10,sourceKey:0,targetKey:1},{key:2,sourceKey:3,targetKey:2},{key:3,sourceKey:0,targetKey:0}];
    const model=normalizeObservedGraph(points.map((_,key)=>({key})),edges,{directed,selfLoops:true});
    const input={model,positions:model.nodes.map((node,i)=>({key:node.key,...points[i]})),order:{nodes:[0,1,2,3],edges:[10,2,3]}};
    const old=before(input),current=after(input);assert.deepEqual(current,old);assert.equal(routeValueHash(current),routeValueHash(old));
    results.push({directed,hash:routeValueHash(old),diagnostics:old.diagnostics});
  }
  const failures=[];
  for(const count of (process.env.GGACTION_DENSITY_FAILURE_SIZES??'').split(',').filter(Boolean).map(Number)){
    assert.ok([100,1000,10000].includes(count));
    const {chart}=await module('src/index.js'),{edgeRouteJob}=await module('src/materialization/graph/routeResource.js'),{normalizeRouteIntent}=await module('src/grammar/graph/routes/options.js');
    const nodes=Array.from({length:count},(_,id)=>({id})),edges=nodes.map(({id})=>({id,source:id,target:(id+Math.floor(count/3))%count}));
    const positions=nodes.map(({id})=>({key:id,x:200+150*Math.cos(2*Math.PI*id/count),y:200+150*Math.sin(2*Math.PI*id/count)}));
    const base=chart().createData({id:'nodes',values:nodes,keyField:'id'}).createData({id:'edges',values:edges,keyField:'id'})
      .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'source',target:'target'})
      .layoutGraph({id:'layout',method:'fixed',options:{positions}});
    const graph=base.semanticSpec.resources.find(r=>r.id==='graph'),layout=base.semanticSpec.resources.find(r=>r.id==='layout');
    const job=edgeRouteJob(base,graph,layout,normalizeRouteIntent('density',{},'world'));
    const failed=solver=>{try{solver(job.input);assert.fail('Original large fixture must retain its guard rejection');}catch(error){return{name:error.name,message:error.message,details:getErrorDetails(error)};}};
    const old=failed(before),current=failed(after);assert.equal(old.details?.code,'resource-limit');assert.deepEqual(current,old);
    failures.push({count,...current});
  }
  const sourceSHA256=Object.fromEntries(await Promise.all([...owners,'src/grammar/graph/routes/densitySamples.js'].map(async owner=>[owner,createHash('sha256').update(await readFile(path.join(root,owner))).digest('hex')])));
  const report={node:process.version,baseline,results,failures,sourceSHA256,scope:'same-engine old complete kernel vs new; original guard failures remain failures, no P95 claim'};
  await mkdir(path.join(root,'.artifacts/density-storage'),{recursive:true});
  await writeFile(path.join(root,`.artifacts/density-storage/exact-${process.versions.node.split('.')[0]}${failures.length?'-guards':''}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally {await rm(directory,{recursive:true,force:true});}
