import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {root,run,tscCommand} from '../../../../../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
import {documentationPrograms,copyDocumentationSupportFiles} from '../../../../../scripts/doc-snippets.js';
const fixed=JSON.parse(await readFile('.artifacts/json-string-count/fixed.json','utf8'));
const sha256=createHash('sha256').update(await readFile(fixed.frozenFile)).digest('hex');assert.equal(sha256,fixed.sha256);
const consumer=await preparePackageConsumer({packageSpec:fixed.frozenFile}),receipt={node:process.version,sha256,checks:[],bundles:[]};
try{
 await testOptionalDependencies(consumer);
 const selections = {"images": ["images/resource-lifecycle", "images/renderer-scene-offline"], "fonts": ["fonts/resource-metrics-offline"], "animation": ["animation/offline-fresh-process", "animation/embedded-assets-fresh-process", "animation/immutable-schedules-and-corruption"], "edge-routes": ["edge-routes/packed-density-samples", "edge-routes/ordered-force-storage", "edge-routes/worker-authority-and-cache", "edge-routes/offline-restore-and-revision"], "inferred-graphs": ["data/inferred-graph-lifecycle"], "graph-inference-worker": ["data/inferred-graph-worker-lifecycle"]};
 for(const name of Object.keys(selections)) await copyFile(path.join(root,`scripts/consumers/fixtures/node/${name}.mjs`),path.join(consumer.directory,`${name}.mjs`));
 await writeFile(path.join(consumer.directory,'runner.mjs'),`import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';const selections=${JSON.stringify(selections)};const checks=[];for(const [name,ids] of Object.entries(selections)){const {cases}=await import('./'+name+'.mjs');for(const id of ids){const entry=cases.find(value=>value.id===id);assert.ok(entry,id);const start=performance.now();try{await entry.run();checks.push({id,status:'passed',durationMs:performance.now()-start});}catch(error){checks.push({id,status:'failed',error:error.stack});process.exitCode=1;}}}await writeFile('result.json',JSON.stringify(checks));`);
 run(process.execPath,['runner.mjs'],consumer.directory,{stdio:'inherit'});receipt.checks=JSON.parse(await readFile(path.join(consumer.directory,'result.json'),'utf8'));assert.equal(receipt.checks.length,12);
 await copyFile(path.join(root,'scripts/consumers/fixtures/edge-routes.ts'),path.join(consumer.directory,'edge-routes.mts'));
 run(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','edge-routes.mts'],consumer.directory);receipt.types='passed';
 const snippet=(await documentationPrograms()).find(value=>value.id==='edge-route-analytical-comparison');assert.ok(snippet);
 await copyDocumentationSupportFiles(snippet,consumer.directory);
 await writeFile(path.join(consumer.directory,'snippet.mjs'),snippet.code);
 run(process.execPath,['snippet.mjs'],consumer.directory);receipt.snippet={status:'passed',sha256:snippet.sha256};
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction']) receipt.bundles.push(await measureMinimalBrowserBundle(consumer.directory,{specifier}));
 receipt.peers=consumer.resolvedPeers;receipt.status=receipt.bundles.every(value=>value.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[value.specifier])?'passed':'bundle-limit-failed';
}catch(error){receipt.error=error.stack;receipt.status='failed';throw error;}finally{await writeFile('.artifacts/json-string-count/installed-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(receipt,null,2)+'\n');await consumer.cleanup();}
console.log(JSON.stringify(receipt,null,2));assert.equal(receipt.status,'passed');
