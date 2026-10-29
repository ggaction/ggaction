// Run from the repository root with an absolute package tar path.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=process.cwd();
const entry=file=>import(pathToFileURL(path.join(root,file)));
const {preparePackageConsumer}=await entry('scripts/package-consumer.js');
const {testOptionalDependencies}=await entry('scripts/consumers/optional-peers.js');
const {testTypeScriptConsumer}=await entry('scripts/consumers/types.js');
const {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS}=await entry('scripts/browser-bundle-size.js');
const consumer=await preparePackageConsumer({packageSpec:path.resolve(process.argv[2])});
try {
 await testOptionalDependencies(consumer);
 const files=['observed-graphs.mjs','inferred-graphs.mjs','contours.mjs','interaction.mjs'];
 for(const file of files) await writeFile(path.join(consumer.directory,file),await readFile(path.join(root,'scripts/consumers/fixtures/node',file)));
 await writeFile(path.join(consumer.directory,'verify.mjs'),'const records=[];for(const file of '+JSON.stringify(files)+'){const {cases}=await import("./"+file);for(const entry of cases){await entry.run();records.push({id:entry.id,status:"passed"})}}console.log(JSON.stringify(records));');
 const records=JSON.parse(execFileSync(process.execPath,['verify.mjs'],{cwd:consumer.directory,encoding:'utf8'}));
 await testTypeScriptConsumer(consumer.directory);
 const bundles={};
 for(const specifier of Object.keys(BROWSER_BUNDLE_GZIP_LIMITS)) {
  const measured=await measureMinimalBrowserBundle(consumer.directory,{specifier});
  assert.ok(measured.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[specifier],specifier);
  bundles[specifier]=measured;
 }
 console.log(JSON.stringify({node:process.version,packageSpec:consumer.packageSpec,records,types:'passed',optionalPeers:consumer.resolvedPeers,bundles},null,2));
} finally {await consumer.cleanup();}
