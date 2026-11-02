import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
const prefix='.artifacts/route-v2-native',frozen=JSON.parse(await readFile(`${prefix}/frozen.json`,'utf8'));
process.env.npm_execpath=await realpath('/opt/homebrew/bin/npm');
const consumer=await preparePackageConsumer({packageSpec:frozen.file});
try{
 let source=await readFile(new URL('./consumer.mjs',import.meta.url),'utf8');
 source=source.replace("['edge-path','force-directed','density','hierarchical']","['density']").replace("['world','screen']","['world']");
 source=source.replace('records.push({method,','records.push({numeric:{v1:ordinary.result,v2:route.result},method,');
 await writeFile(path.join(consumer.directory,'consumer.mjs'),source);
 await writeFile(path.join(consumer.directory,'worker.mjs'),`import{parentPort}from'node:worker_threads';import{computeGraphEdgeRoutesAsync}from'ggaction/graph';parentPort.on('message',async({job})=>parentPort.postMessage(await computeGraphEdgeRoutesAsync(job)));`);
 const runtimes={20:'/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node',22:process.execPath,24:'/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node'};
 const reports={};for(const [major,node]of Object.entries(runtimes)){reports[major]=JSON.parse(execFileSync(node,['consumer.mjs'],{cwd:consumer.directory,encoding:'utf8',timeout:120000}));await writeFile(`${prefix}/numeric-${major}.json`,JSON.stringify(reports[major],null,2));}
 const differences=(a,b,p='',out=[])=>{if(Object.is(a,b))return out;if(a&&b&&typeof a==='object'&&typeof b==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),p);for(const key of Object.keys(a))differences(a[key],b[key],`${p}/${key}`,out);}else out.push({path:p,a,b,...(typeof a==='number'&&typeof b==='number'?{absoluteDifference:Math.abs(a-b)}:{})});return out;};
 const comparisons=[];
 for(const major of [22,24])for(const version of ['v1','v2']){
  const left=reports[20].records[0].numeric[version],right=reports[major].records[0].numeric[version];
  const all=differences(left,right),groups={coordinates:[],controls:[],provenance:[],schedule:[],other:[]};
  for(const item of all){const group=/\/schedule\//.test(item.path)?'schedule':/\/(commands|bounds|source|target)\//.test(item.path)?'coordinates':/\/controlPoints\//.test(item.path)?'controls':/\/provenance\//.test(item.path)?'provenance':'other';groups[group].push(item);}
  comparisons.push({from:20,to:major,version,groups:Object.fromEntries(Object.entries(groups).map(([key,values])=>[key,{count:values.length,first:values[0]??null,maxAbsoluteDifference:Math.max(0,...values.map(v=>v.absoluteDifference??0)),differences:values}]))});
 }
 const summary={sha256:frozen.sha256,comparisons,nativeExact: Object.fromEntries(Object.entries(reports).map(([major,r])=>[major,r.records[0].geometryHash===r.records[0].nativeGeometryHash])),contract:'EDGE_ROUTES.md explicitly does not guarantee bit-identical solver results across engines. Hashes bind each exact payload; no coordinate/hash tolerance or normalization added.'};
 await writeFile(`${prefix}/numeric-comparison.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}finally{await consumer.cleanup();}
