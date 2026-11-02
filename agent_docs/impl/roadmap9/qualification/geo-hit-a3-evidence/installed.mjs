import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {preparePackageConsumer} from '../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../scripts/consumers/optional-peers.js';
import {run,root,tscCommand} from '../../scripts/consumers/runtime.js';
import {documentationPrograms} from '../../scripts/doc-snippets.js';
import {measureMinimalBrowserBundle} from '../../scripts/browser-bundle-size.js';
const artifact=JSON.parse(await readFile('.artifacts/geo-hit-a3/archive.json','utf8'));
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
await writeFile('.artifacts/geo-hit-a3/consumer.json',JSON.stringify({directory:consumer.directory,archiveSHA256:artifact.sha256},null,2));
const result={archiveSHA256:artifact.sha256,directory:consumer.directory,records:[]};
const save=()=>writeFile('.artifacts/geo-hit-a3/installed.json',JSON.stringify(result,null,2));
await testOptionalDependencies(consumer);
await copyFile(path.join(root,'scripts/consumers/fixtures/node/animation-geo.mjs'),path.join(consumer.directory,'animation-geo.mjs'));
await writeFile(path.join(consumer.directory,'runtime.mjs'),"const {cases}=await import('./animation-geo.mjs');for(const c of cases)await c.run();\n");
const example=(await documentationPrograms()).find(v=>v.id==='interaction-path-preparation');assert.ok(example);await writeFile(path.join(consumer.directory,'doc.mjs'),example.code);
await copyFile(path.join(root,'scripts/consumers/fixtures/interaction.ts'),path.join(consumer.directory,'interaction.mts'));
await writeFile(path.join(consumer.directory,'bundles.mjs'),`import {measureMinimalBrowserBundle} from ${JSON.stringify(path.join(root,'scripts/browser-bundle-size.js'))};import {writeFile} from 'node:fs/promises';const records=[];for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction','ggaction/graph','ggaction/animation'])records.push(await measureMinimalBrowserBundle(process.cwd(),{specifier}));await writeFile('bundles-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(records));`);
for(const binary of['/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node','/opt/homebrew/Cellar/node@22/22.23.1/bin/node','/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node']){
 for(const file of['runtime.mjs','doc.mjs','bundles.mjs']){run(binary,[file],consumer.directory);result.records.push({binary,file,status:'passed'});await save();}
 run(binary,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','interaction.mts'],consumer.directory);result.records.push({binary,file:'interaction.mts',status:'passed'});await save();
}
for(const major of[20,22,24])result['bundles'+major]=JSON.parse(await readFile(path.join(consumer.directory,`bundles-${major}.json`),'utf8'));
await save();
const browser=(await readFile('test/browser/interaction-path-capacity.browser.js','utf8')).replace("fileURLToPath(new URL('../../',import.meta.url))",JSON.stringify(consumer.directory)).replaceAll("'../support/","'../../test/support/");
await writeFile('.artifacts/geo-hit-a3/browser-installed.test.mjs',browser);run(process.execPath,['--test','.artifacts/geo-hit-a3/browser-installed.test.mjs'],root);result.records.push({browser:'source-free minified installed artifact',dpr:[1,2],status:'passed'});await save();
console.log(JSON.stringify(result));
// Kept only until final original-scale and retention diagnostics finish.
