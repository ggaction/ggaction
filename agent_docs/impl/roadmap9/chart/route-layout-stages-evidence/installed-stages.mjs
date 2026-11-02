import assert from 'node:assert/strict';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
const prefix='.artifacts/route-layout-stages', frozen=JSON.parse(await readFile(`${prefix}/frozen.json`,'utf8'));
assert.equal(createHash('sha256').update(await readFile(frozen.file)).digest('hex'),frozen.sha256);
process.env.npm_execpath=await realpath('/opt/homebrew/bin/npm');
const consumer=await preparePackageConsumer({packageSpec:frozen.file});
try {
 const installed=await realpath(path.join(consumer.directory,'node_modules/ggaction'));
 assert.ok(installed.startsWith((await realpath(consumer.directory))+path.sep));
 assert.ok(!installed.startsWith(await realpath('src')));
 const files=['test/unit/resources/graph-route-native-stages.test.js','test/unit/core/canvas-resource-revision.test.js'];
 const targets=[];
 for(const file of files){
  const original=await readFile(file,'utf8');
  const source=original.replaceAll('../../../src/',pathToFileURL(path.join(installed,'src')).href+'/');
  assert.ok(!source.includes('../../../src/'));
  const target=path.join(consumer.directory,path.basename(file));targets.push(target);await writeFile(target,source);
 }
 const output=execFileSync(process.execPath,['--test',...targets],{cwd:consumer.directory,encoding:'utf8',timeout:120000});
 assert.match(output,/(?:#|ℹ) tests 11\n/);assert.match(output,/(?:#|ℹ) fail 0\n/);
 const result={status:'passed',node:process.version,sha256:frozen.sha256,sourceFree:true,publicAPI:false,tests:11,output};
 await writeFile(`${prefix}/installed-stages-${process.versions.node.split('.')[0]}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await consumer.cleanup();}
