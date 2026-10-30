import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {testOptionalDependencies} from '../../../../../scripts/consumers/optional-peers.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
import {tscCommand} from '../../../../../scripts/consumers/runtime.js';
const artifact=JSON.parse(await readFile(process.argv[2]));
assert.equal(createHash('sha256').update(await readFile(artifact.file)).digest('hex'),artifact.sha256);
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
const report={node:process.version,archive:artifact.sha256,cases:[],bundles:{},errors:[]};
try {
 await testOptionalDependencies(consumer);report.peers=consumer.resolvedPeers;
 for(const name of ['animation','animation-graph','animation-partition','animation-geo','animation-appearance','animation-timeline','interaction-animation']){
  await writeFile(consumer.directory+'/'+name+'.mjs',await readFile(new URL('../../../../../scripts/consumers/fixtures/node/'+name+'.mjs',import.meta.url)));
  const code=`const {cases}=await import('./${name}.mjs');const passed=[];for(const item of cases){await item.run();passed.push(item.id);}console.log(JSON.stringify(passed));`;
  try{report.cases.push(...JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:consumer.directory,encoding:'utf8',timeout:120000,maxBuffer:1048576})));}catch(error){report.errors.push({owner:name,message:error.stack});}
 }
 await writeFile(consumer.directory+'/animation.mts',await readFile(new URL('../../../../../scripts/consumers/fixtures/animation.ts',import.meta.url)));
 try {execFileSync(process.execPath,[tscCommand,'--noEmit','--strict','--exactOptionalPropertyTypes','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',consumer.directory+'/animation.mts'],{cwd:consumer.directory,stdio:'pipe',timeout:120000});report.types='passed';}catch(error){report.errors.push({owner:'types',message:error.stack,stdout:error.stdout?.toString(),stderr:error.stderr?.toString()});}
 const doc=await readFile(new URL('../../../../../docs/api/animation.md',import.meta.url),'utf8'),snippet=doc.match(/```javascript\n([\s\S]*?)```/)[1];
 await writeFile(consumer.directory+'/doc.mjs',snippet);
 try {execFileSync(process.execPath,['doc.mjs'],{cwd:consumer.directory,stdio:'pipe',timeout:30000});report.doc='passed';}catch(error){report.errors.push({owner:'doc',message:error.stack});}
 for(const specifier of Object.keys(BROWSER_BUNDLE_GZIP_LIMITS)){
  try {const result=await measureMinimalBrowserBundle(consumer.directory,{specifier});report.bundles[specifier]={gzipBytes:result.gzipBytes,limit:BROWSER_BUNDLE_GZIP_LIMITS[specifier]};if(result.gzipBytes>BROWSER_BUNDLE_GZIP_LIMITS[specifier])report.errors.push({owner:specifier,message:'bundle limit exceeded'});}catch(error){report.errors.push({owner:specifier,message:error.stack});}
 }
}finally{
 await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');
 await consumer.cleanup();
}
console.log(JSON.stringify(report));assert.deepEqual(report.errors,[]);
