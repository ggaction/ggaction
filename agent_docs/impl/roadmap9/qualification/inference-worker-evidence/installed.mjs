import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {root,run,tscCommand} from '../../../../../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
import {documentationPrograms,copyDocumentationSupportFiles} from '../../../../../scripts/doc-snippets.js';
const fixed=JSON.parse(await readFile(process.argv[2],'utf8'));
const sha256=createHash('sha256').update(await readFile(fixed.file)).digest('hex');assert.equal(sha256,fixed.sha256);
const consumer=await preparePackageConsumer({packageSpec:fixed.file}), receipt={node:process.version,sha256,checks:[],bundles:[]};
try{
 await testOptionalDependencies(consumer);
 for(const file of ['inferred-graphs.mjs','graph-inference-worker.mjs'])await copyFile(path.join(root,'scripts/consumers/fixtures/node',file),path.join(consumer.directory,file));
 await writeFile(path.join(consumer.directory,'runner.mjs'),`import {cases as native} from './inferred-graphs.mjs';import {cases as worker} from './graph-inference-worker.mjs';const cases=[...native,...worker];import {writeFile} from 'node:fs/promises';const checks=[];for(const entry of cases){const start=performance.now();try{await entry.run();checks.push({id:entry.id,status:'passed',durationMs:performance.now()-start});}catch(error){checks.push({id:entry.id,status:'failed',error:error.stack});process.exitCode=1;}}await writeFile('result.json',JSON.stringify(checks));`);
 run(process.execPath,['runner.mjs'],consumer.directory,{stdio:'inherit'});receipt.checks=JSON.parse(await readFile(path.join(consumer.directory,'result.json'),'utf8'));assert.equal(receipt.checks.length,5);
 await copyFile(path.join(root,'scripts/consumers/fixtures/graph-inference.ts'),path.join(consumer.directory,'graph-inference.mts'));
 run(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','graph-inference.mts'],consumer.directory);receipt.types='passed';
 receipt.snippets=[];
 for(const id of ['graph-inference','graph-inference-worker']){
  const snippet=(await documentationPrograms()).find(value=>value.id===id);assert.ok(snippet);
  const dir=path.join(consumer.directory,id);await mkdir(dir,{recursive:true});await copyDocumentationSupportFiles(snippet,dir);
  await writeFile(path.join(dir,'snippet.mjs'),snippet.code);
  run(process.execPath,['snippet.mjs'],dir);receipt.snippets.push({id,status:'passed',sha256:snippet.sha256});
 }
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction']) receipt.bundles.push(await measureMinimalBrowserBundle(consumer.directory,{specifier}));
 receipt.peers=consumer.resolvedPeers;receipt.status=receipt.bundles.every(value=>value.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[value.specifier])?'passed':'bundle-limit-failed';
}finally{await writeFile(process.argv[3],JSON.stringify(receipt,null,2)+'\n');await consumer.cleanup();}
console.log(JSON.stringify(receipt,null,2));assert.equal(receipt.status,'passed');
