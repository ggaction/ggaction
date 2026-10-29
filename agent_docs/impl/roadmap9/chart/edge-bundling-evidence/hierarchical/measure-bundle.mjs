import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {preparePackageConsumer} from '../../scripts/package-consumer.js';
const root=process.cwd();
const artifact=JSON.parse(await fs.readFile(root+'/.artifacts/routes/measure-tar.json','utf8'));
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
await fs.writeFile(root+'/.artifacts/routes/consumer-directory.txt',consumer.directory);
const temporary=root+'/scripts/.routes-bundle-measure.mjs';
try {
 const source=(await fs.readFile(root+'/scripts/browser-bundle-size.js','utf8')).replace('    specifier,\n    chunks:', '    code: chunks.map(chunk => chunk.code),\n    specifier,\n    chunks:');
 await fs.writeFile(temporary,source);const {measureMinimalBrowserBundle}=await import(pathToFileURL(temporary));
 const runtimes=['/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node','/opt/homebrew/Cellar/node@22/22.23.1/bin/node','/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node'];const records=[];
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction']) {
  const {code,...bundle}=await measureMinimalBrowserBundle(consumer.directory,{specifier});
  const gzip=runtimes.map(node=>JSON.parse(execFileSync(node,['--input-type=module','-e',`import{readFileSync}from'node:fs';import{gzipSync}from'node:zlib';const code=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify({node:process.version,zlib:process.versions.zlib,gzipBytes:code.reduce((s,c)=>s+gzipSync(c,{level:9}).length,0)}))`],{input:JSON.stringify(code),encoding:'utf8'})));
  records.push({...bundle,gzip});
 }
 await fs.writeFile(root+'/.artifacts/routes/bundles.json',JSON.stringify({artifact:artifact.sha256,records},null,2));console.log(records);
} finally {await fs.unlink(temporary).catch(()=>{}); await consumer.cleanup();}
