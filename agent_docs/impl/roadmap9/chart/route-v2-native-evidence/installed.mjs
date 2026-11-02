import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {measureMinimalBrowserBundle} from '../../../../../scripts/browser-bundle-size.js';
const prefix='.artifacts/route-v2-native', frozen=JSON.parse(await readFile(`${prefix}/frozen.json`,'utf8'));
assert.equal(createHash('sha256').update(await readFile(frozen.file)).digest('hex'),frozen.sha256);
process.env.npm_execpath=await realpath('/opt/homebrew/bin/npm');
const consumer=await preparePackageConsumer({packageSpec:frozen.file});
try{
 await copyFile(new URL('./consumer.mjs',import.meta.url),path.join(consumer.directory,'consumer.mjs'));
 await writeFile(path.join(consumer.directory,'worker.mjs'),`import{parentPort}from'node:worker_threads';import{computeGraphEdgeRoutesAsync}from'ggaction/graph';parentPort.on('message',async({job})=>parentPort.postMessage(await computeGraphEdgeRoutesAsync(job)));`);
 const stdout=execFileSync(process.execPath,['consumer.mjs'],{cwd:consumer.directory,encoding:'utf8',timeout:120000});
 const runtime=JSON.parse(stdout);assert.equal(runtime.records.length,8);assert.equal(runtime.status,'passed');
 await writeFile(path.join(consumer.directory,'consumer.mts'),`import{chart,type EdgeRouteExecution,type EdgeRouteResourceV2}from'ggaction';import{createGraphRouteExecutor,prepareGraphEdgeRoutes,computeGraphEdgeRoutes,computeGraphEdgeRoutesAsync,type GraphRouteJob,type GraphRouteJobV2}from'ggaction/graph';
const execution:EdgeRouteExecution={policy:'bounded-route@1',maxWork:8000000000,maxCandidatePairs:50000000,maxSamples:16777216,maxBufferBytes:134217728,maxBytes:134217728};
const p=chart();const executor=createGraphRouteExecutor({createWorker:()=>new Worker('worker.js')});
const prepared=await prepareGraphEdgeRoutes(p,{kind:'create',id:'r',method:'density',options:{execution}},{requestToken:'t',executor,deadlineMs:30000});p.bundleGraphEdges({prepared,requestToken:'t'});
declare const job:GraphRouteJob;declare const jobV2:GraphRouteJobV2;declare const resource:EdgeRouteResourceV2;
const complete=await computeGraphEdgeRoutesAsync(jobV2);const version:2=complete.schemaVersion;const stored:'2'=resource.algorithmVersion;
// @ts-expect-error v1 must keep the synchronous entry
computeGraphEdgeRoutesAsync(job);
// @ts-expect-error v2 must use the async entry
computeGraphEdgeRoutes(jobV2);
// @ts-expect-error v2 needs an explicit deadline
executor.compute(jobV2);
// @ts-expect-error v2 has no duplicate sample limit
p.bundleGraphEdges({id:'r',method:'density',options:{execution,limits:{maxSamples:5}}});`);
 execFileSync(process.execPath,[path.resolve('node_modules/typescript/bin/tsc'),'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','consumer.mts'],{cwd:consumer.directory,encoding:'utf8'});
 const bundles=[];for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction'])bundles.push(await measureMinimalBrowserBundle(consumer.directory,{specifier}));
 const worker=await build({stdin:{contents:'import{computeGraphEdgeRoutesAsync}from"ggaction/graph";globalThis.compute=computeGraphEdgeRoutesAsync;',resolveDir:consumer.directory},bundle:true,format:'esm',platform:'browser',minify:true,write:false,metafile:true});
 const installedReal=await realpath(path.join(consumer.directory,'node_modules/ggaction'));
 const inputs=Object.entries(Object.values(worker.metafile.outputs)[0].inputs).filter(([,v])=>v.bytesInOutput>0).map(([k])=>k).filter(k=>k!=='<stdin>');
 for(const input of inputs){const resolved=await realpath(path.resolve(input));assert.ok(resolved.startsWith(installedReal+'/'),input);assert.ok(!/\/src\/(actions|materialization|renderers|selectors)\//.test(resolved),input);}
 const result={status:'passed',node:process.version,sha256:frozen.sha256,runtime,types:'passed',bundles,worker:{gzipBytes:gzipSync(worker.outputFiles[0].contents,{level:9}).length,modules:inputs.length,sourceFree:true}};
 await writeFile(`${prefix}/installed-${process.versions.node.split('.')[0]}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await consumer.cleanup();}
