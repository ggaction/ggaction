import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {root,run} from '../../../../../scripts/consumers/runtime.js';
const archive=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(createHash('sha256').update(await readFile(archive.file)).digest('hex'),archive.sha256);
const consumer=await preparePackageConsumer({packageSpec:archive.file});
try{
 const packageRoot=path.join(consumer.directory,'node_modules','ggaction');
 run(process.execPath,['scripts/run-tests.js','browser','browser/animation-offline.browser.js'],root,{stdio:'inherit',env:{...process.env,GGACTION_ANIMATION_PACKAGE_ROOT:packageRoot}});
 await writeFile(process.argv[3],JSON.stringify({node:process.version,status:'passed',archive:archive.sha256,browser:'Chromium',versions:[3,4],ratios:[1,2],sourceFree:true,sourcePrefixExclusion:'asserted by esbuild metafile'},null,2)+'\n');
}finally{await consumer.cleanup();}
