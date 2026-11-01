import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {root,run,tscCommand} from '../../../../../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
import {documentationPrograms} from '../../../../../scripts/doc-snippets.js';
const fixed=JSON.parse(await readFile(process.argv[2],'utf8'));
const sha256=createHash('sha256').update(await readFile(fixed.file)).digest('hex');assert.equal(sha256,fixed.sha256);
const consumer=await preparePackageConsumer({packageSpec:fixed.file}), receipt={node:process.version,sha256,checks:[],bundles:[]};
try{
 await testOptionalDependencies(consumer);
 await copyFile(path.join(root,'scripts/consumers/fixtures/node/geographic-routes.mjs'),path.join(consumer.directory,'geographic-routes.mjs'));
 await writeFile(path.join(consumer.directory,'runner.mjs'),`import {cases} from './geographic-routes.mjs';import {writeFile} from 'node:fs/promises';const checks=[];for(const entry of cases){const start=performance.now();try{await entry.run();checks.push({id:entry.id,status:'passed',durationMs:performance.now()-start});}catch(error){checks.push({id:entry.id,status:'failed',error:error.stack});process.exitCode=1;}}await writeFile('result.json',JSON.stringify(checks));`);
 run(process.execPath,['runner.mjs'],consumer.directory,{stdio:'inherit'});receipt.checks=JSON.parse(await readFile(path.join(consumer.directory,'result.json'),'utf8'));assert.equal(receipt.checks.length,3);
 await copyFile(path.join(root,'scripts/consumers/fixtures/edge-routes.ts'),path.join(consumer.directory,'edge-routes.mts'));
 run(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','edge-routes.mts'],consumer.directory);receipt.types='passed';
 const snippet=(await documentationPrograms()).find(value=>value.id==='geographic-route-map');assert.ok(snippet);
 await writeFile(path.join(consumer.directory,'snippet.mjs'),snippet.code+`\nif(routeMap.semanticSpec.resources.find(r=>r.id==='routeGeometry').result.features.length!==1)throw Error('Missing retained edge');`);
 run(process.execPath,['snippet.mjs'],consumer.directory);receipt.snippet={status:'passed',sha256:snippet.sha256};
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction']) receipt.bundles.push(await measureMinimalBrowserBundle(consumer.directory,{specifier}));
 receipt.peers=consumer.resolvedPeers;receipt.status=receipt.bundles.every(value=>value.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[value.specifier])?'passed':'bundle-limit-failed';
}finally{await writeFile(process.argv[3],JSON.stringify(receipt,null,2)+'\n');await consumer.cleanup();}
console.log(JSON.stringify(receipt,null,2));assert.equal(receipt.status,'passed');
