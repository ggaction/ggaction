import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../scripts/package-consumer.js';
import {testOptionalDependencies} from '../scripts/consumers/optional-peers.js';
import {run,runConsumerCases,tscCommand} from '../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../scripts/browser-bundle-size.js';
import {documentationPrograms} from '../scripts/doc-snippets.js';
const version=process.versions.node.split('.')[0];
const out=path.resolve('.artifacts/'+(process.env.GEO_EVIDENCE_PREFIX??'geo-capacity-installed')+'-'+version);
await mkdir(out,{recursive:true});
const archive=JSON.parse(await readFile('.artifacts/geo-capacity-archive.json','utf8'));
const bytes=await readFile(archive.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),archive.sha256);
const consumer=await preparePackageConsumer({packageSpec:archive.file});
await writeFile(path.join(out,'installation.json'),JSON.stringify({node:process.version,archive,installed:consumer.directory},null,2));
const dir=consumer.directory;
await copyFile('scripts/consumers/fixtures/node/geographic-capacity.mjs',path.join(dir,'geo-capacity.mjs'));
await writeFile(path.join(dir,'run.mjs'),`import {writeFile} from 'node:fs/promises'; import {cases} from './geo-capacity.mjs'; const records=[]; for(const c of cases){const start=performance.now();try{await c.run();records.push({id:c.id,status:'passed',durationMs:performance.now()-start});}catch(e){records.push({id:c.id,status:'failed',error:e.stack,durationMs:performance.now()-start});} await writeFile('runtime.json',JSON.stringify(records,null,2));}if(records.some(x=>x.status==='failed')){console.error(records);process.exitCode=1;}`);
await copyFile('scripts/consumers/fixtures/geographic-capacity.ts',path.join(dir,'geographic-capacity.mts'));
const snippet=(await documentationPrograms()).find(x=>x.id==='geographic-capacity');assert.ok(snippet);
await writeFile(path.join(dir,'documentation.mjs'),snippet.code);
const bundles={};
try{
 await runConsumerCases([
 {id:'optional-peers',run:()=>testOptionalDependencies(consumer)},
 {id:'runtime',run:async()=>{try{run(process.execPath,['run.mjs'],dir);}finally{await copyFile(path.join(dir,'runtime.json'),path.join(out,'runtime.json')).catch(()=>{});}}},
 {id:'strict-types',run:()=>run(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','geographic-capacity.mts'],dir)},
 {id:'documentation',run:()=>run(process.execPath,['documentation.mjs'],dir)},
 ...Object.keys(BROWSER_BUNDLE_GZIP_LIMITS).map(specifier=>({id:'bundle:'+specifier,run:async()=>{const value=await measureMinimalBrowserBundle(dir,{specifier});bundles[specifier]=value;await writeFile(path.join(out,'bundles.json'),JSON.stringify(bundles,null,2));assert.ok(value.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[specifier],`${specifier}: ${value.gzipBytes} > ${BROWSER_BUNDLE_GZIP_LIMITS[specifier]}`);return value;}}))
 ],path.join(out,'qualification.json'));
 console.log(JSON.stringify({node:process.version,sha256:archive.sha256,directory:dir,bundles},null,2));
}finally{await writeFile(path.join(out,'retained-installation.txt'),dir+'\n');}
