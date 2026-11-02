import assert from 'node:assert/strict';
import {writeFile,mkdtemp,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {build} from 'esbuild';import {chromium} from 'playwright';
import {startStaticServer} from '../../../../../test/support/static-server.js';
const directory=await mkdtemp(path.join(tmpdir(),'ggaction-tagged-cursor-'));let browser,server,consumer;
const frozen=JSON.parse(await readFile('.artifacts/strict-value-cursor/frozen.json','utf8'));
assert.equal(createHash('sha256').update(await readFile(frozen.file)).digest('hex'),frozen.sha256);
try{
 consumer=await preparePackageConsumer({packageSpec:frozen.file});
 const installed=path.join(consumer.directory,'node_modules/ggaction');
 const bundle=await build({stdin:{contents:`export * from './src/core/encodedValueCursor.js';export {cloneAndFreeze} from './src/core/immutable.js';export * from './src/core/sha256.js';export {encodeValue} from './src/core/valueEncoding.js';export {canonicalJSON} from './src/core/contentDigest.js';`,resolveDir:installed},bundle:true,format:'esm',platform:'browser',write:false,minify:true,metafile:true});
 const installedReal=await realpath(installed);
 for(const input of Object.keys(bundle.metafile.inputs)){if(input==='<stdin>')continue;assert.ok((await realpath(path.resolve(input))).startsWith(installedReal+'/'),input);}
 await writeFile(path.join(directory,'prototype.js'),bundle.outputFiles[0].contents);
 await writeFile(path.join(directory,'index.html'),'<!doctype html><title>Tagged cursor research</title><link rel="icon" href="data:,">');
 server=await startStaticServer(directory);browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(server.baseUrl);
 const result=await page.evaluate(async()=>{
  const {createEncodedValueCursor:create,advanceEncodedValueCursor:advance,clearEncodedValueCursor:clear,cloneAndFreeze,createSha256State,updateSha256,finishSha256,clearSha256,encodeValue,canonicalJSON}=await import('/prototype.js');
  const limits={maxBytes:100000,maxDepth:64,maxSteps:100000};
  const value=cloneAndFreeze({text:'🌍\ud800é'.repeat(8),zero:-0,array:Object.freeze([undefined,Infinity,1n])});
  const expected=new TextEncoder().encode(canonicalJSON(encodeValue(value)));
  const oracle=[...new Uint8Array(await crypto.subtle.digest('SHA-256',expected))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const controller=new AbortController(),cursor=create(value,limits),sha=createSha256State();const parts=[];let size=0,done=false;
  while(!done){const chunk=advance(cursor,{maxBytes:1,maxSteps:3});parts.push(...chunk.bytes);size+=chunk.bytes.length;updateSha256(sha,chunk.bytes);done=chunk.done;}
  const hash=finishSha256(sha);clear(cursor);clearSha256(sha);
  const aborts=[];
  for(const at of [1,2,4]){
   const c=new AbortController(),reason=Error('timer abort'),handle=create(value,limits),state=createSha256State();let calls=0,publications=0,terminals=0,timerRuns=0,requested,observed;
   try{while(true){AbortSignal.prototype.throwIfAborted.call(c.signal);const chunk=advance(handle,{maxBytes:7,maxSteps:7});calls++;updateSha256(state,chunk.bytes);if(chunk.done){publications++;break;}
    if(calls===at)setTimeout(()=>{timerRuns++;requested=performance.now();c.abort(reason);},0);
    await new Promise(resolve=>setTimeout(resolve,0));AbortSignal.prototype.throwIfAborted.call(c.signal);
   }}catch(error){if(error!==reason)throw error;observed=performance.now();}finally{terminals++;clear(handle);clearSha256(state);}
   let cleared=false;try{advance(handle,{maxBytes:1,maxSteps:1});}catch{cleared=true;}
   aborts.push({at,calls,publications,terminals,timerRuns,cleared,latencyMs:observed-requested});
  }
  return {bytesEqual:size===expected.length&&parts.every((x,i)=>x===expected[i]),hash,oracle,aborts,userAgent:navigator.userAgent,privateProductCursor:true,productionMinified:true,performanceQualification:false};
 });
 assert.deepEqual(errors,[]);assert.equal(result.bytesEqual,true);assert.equal(result.hash,result.oracle);
 for(const x of result.aborts){assert.equal(x.calls,x.at);assert.equal(x.publications,0);assert.equal(x.terminals,1);assert.equal(x.timerRuns,1);assert.equal(x.cleared,true);assert.ok(Number.isFinite(x.latencyMs));}
 await writeFile('.artifacts/strict-value-cursor/browser.json',JSON.stringify({...result,sha256:frozen.sha256,inputs:Object.keys(bundle.metafile.inputs)},null,2)+'\n');console.log(JSON.stringify({...result,sha256:frozen.sha256,inputs:Object.keys(bundle.metafile.inputs)},null,2));
}finally{await browser?.close();await server?.close();await rm(directory,{recursive:true,force:true});await consumer?.cleanup();}
