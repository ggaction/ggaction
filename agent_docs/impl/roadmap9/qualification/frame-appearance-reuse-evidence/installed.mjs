import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {root,run,tscCommand} from '../../../../../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';

const archive=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(createHash('sha256').update(await readFile(archive.file)).digest('hex'),archive.sha256);
const consumer=await preparePackageConsumer({packageSpec:archive.file});
const receipt={node:process.version,sha256:archive.sha256,checks:[],bundles:[]};
try{
 await testOptionalDependencies(consumer);
 for(const file of ['animation-appearance.mjs','animation-cartesian-completion.mjs'])await copyFile(path.join(root,'scripts/consumers/fixtures/node',file),path.join(consumer.directory,file));
 await writeFile(path.join(consumer.directory,'runner.mjs'),`import {cases as appearance} from './animation-appearance.mjs';import {cases as cartesian} from './animation-cartesian-completion.mjs';import {writeFile} from 'node:fs/promises';const checks=[];for(const entry of [...appearance,...cartesian]){const start=performance.now();await entry.run();checks.push({id:entry.id,status:'passed',durationMs:performance.now()-start});}await writeFile('results.json',JSON.stringify(checks));`);
 run(process.execPath,['runner.mjs'],consumer.directory,{stdio:'inherit'});
 receipt.checks=JSON.parse(await readFile(path.join(consumer.directory,'results.json'),'utf8'));
 assert.equal(receipt.checks.length,6);
 await copyFile(path.join(root,'scripts/consumers/fixtures/animation.ts'),path.join(consumer.directory,'animation.mts'));
 run(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','animation.mts'],consumer.directory);
 receipt.types='passed';
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/graph','ggaction/animation','ggaction/interaction'])receipt.bundles.push(await measureMinimalBrowserBundle(consumer.directory,{specifier}));
 receipt.peers=consumer.resolvedPeers;
 receipt.status=receipt.bundles.every(bundle=>bundle.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier])?'passed':'bundle-limit-failed';
}finally{
 await writeFile(process.argv[3],JSON.stringify(receipt,null,2)+'\n');
 await consumer.cleanup();
}
console.log(JSON.stringify(receipt));
assert.equal(receipt.status,'passed');
