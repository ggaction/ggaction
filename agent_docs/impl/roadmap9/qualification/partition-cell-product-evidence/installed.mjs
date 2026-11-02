import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {run,root,tscCommand} from '../../../../../scripts/consumers/runtime.js';
import {documentationPrograms} from '../../../../../scripts/doc-snippets.js';
import {testTutorialConsumers} from '../../../../../scripts/tutorial-consumer.js';
const here=path.dirname(fileURLToPath(import.meta.url));
const [receipt,output,...binaries]=process.argv.slice(2);
assert.ok(path.isAbsolute(receipt)&&path.isAbsolute(output)&&binaries.length===3);
const artifact=JSON.parse(await readFile(receipt));
assert.equal(createHash('sha256').update(await readFile(artifact.file)).digest('hex'),artifact.sha256);
await mkdir(output,{recursive:true});
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
const result={archiveSHA256:artifact.sha256,directory:consumer.directory,records:[]};
const save=()=>writeFile(path.join(output,'installed.json'),JSON.stringify(result,null,2)+'\n');await save();
await testOptionalDependencies(consumer);
await copyFile(path.join(root,'scripts/consumers/fixtures/node/animation-partition.mjs'),path.join(consumer.directory,'animation-partition.mjs'));
await writeFile(path.join(consumer.directory,'runtime.mjs'),"const {cases}=await import('./animation-partition.mjs');for(const c of cases)await c.run();\n");
await copyFile(path.join(root,'scripts/consumers/fixtures/animation.ts'),path.join(consumer.directory,'animation.mts'));
await writeFile(path.join(consumer.directory,'bundles.mjs'),`import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from ${JSON.stringify(path.join(root,'scripts/browser-bundle-size.js'))};import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';const records=[];for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction','ggaction/graph','ggaction/animation']){const r=await measureMinimalBrowserBundle(process.cwd(),{specifier});records.push(r);}await writeFile('bundles-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(records));for(const r of records)assert.ok(r.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[r.specifier],r.specifier+' exceeds gzip budget '+r.gzipBytes);`);
for(const binary of binaries){
 for(const file of ['runtime.mjs','bundles.mjs']){run(binary,[file],consumer.directory);result.records.push({binary,file,status:'passed'});await save();}
 run(binary,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','animation.mts'],consumer.directory);result.records.push({binary,file:'animation.mts',status:'passed'});await save();
}
for(const major of [20,22,24])result['bundles'+major]=JSON.parse(await readFile(path.join(consumer.directory,`bundles-${major}.json`)));
const examples=(await documentationPrograms()).filter(example=>example.file==='tutorials/partition.md');assert.equal(examples.length,1);
await testTutorialConsumers(consumer.directory,{examples,evidenceFile:path.join(output,'tutorial.json')});result.records.push({file:'tutorials/partition.md',status:'passed'});await save();
// Copy test fixtures and independent pixel oracles only; runtime imports use
// the installed public entry points, never the checkout source.
for(const file of ['test/support/animation-partition-frame.js','test/support/partition-frames.js','test/charts/partition-layouts/reference.js','test/charts/partition-layouts/reference-values.js','examples/partition-layouts/fixture.js']){
 let source=await readFile(path.join(root,file),'utf8');source=source.replaceAll('"../../src/index.js"','"ggaction"').replaceAll("'../../src/animation.js'","'ggaction/animation'");
 const target=path.join(consumer.directory,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,source);
}
const browser=(await readFile(path.join(root,'test/browser/animation-partition.browser.js'),'utf8'))
 .replace("import test from 'node:test';","import test from 'node:test';\nimport {realpathSync} from 'node:fs';")
 .replace("fileURLToPath(new URL('../../', import.meta.url))",JSON.stringify(consumer.directory))
 .replace(/from '(\.\.\/support\/[^']+)'/g,(_all,file)=>`from ${JSON.stringify(path.resolve(root,'test/browser',file))}`)
 .replace("'./src/renderers/canvas/index.js'","'ggaction'").replace("'./src/renderers/svg.js'","'ggaction/svg'")
 .replace('write: false });','write: false, metafile: true });\n    assert.ok(Object.keys(bundle.metafile.inputs).filter(file=>file!=="<stdin>").every(file=>realpathSync(path.resolve(process.cwd(),file)).startsWith(realpathSync(root)+path.sep)), "Checkout source entered installed bundle");');
const browserFile=path.join(root,'.artifacts','partition-cell-installed.browser.mjs');await writeFile(browserFile,browser);
run(process.execPath,['--test',browserFile],root);result.records.push({browser:'source-free installed artifact Canvas/SVG',dpr:[1,2],status:'passed'});await save();
await copyFile(path.join(here,'retention.mjs'),path.join(consumer.directory,'retention.mjs'));
run(process.execPath,['--expose-gc','retention.mjs',path.join(output,'retention.json')],consumer.directory);result.records.push({file:'retention.mjs',status:'passed'});await save();
console.log(JSON.stringify(result));
// Preserve this consumer for the separately scheduled original 10k run.
