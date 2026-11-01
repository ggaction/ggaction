import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {documentationPrograms} from '../../../../../scripts/doc-snippets.js';
import {testTutorialConsumers} from '../../../../../scripts/tutorial-consumer.js';
const artifact=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(createHash('sha256').update(await readFile(artifact.file)).digest('hex'),artifact.sha256);
const examples=(await documentationPrograms()).filter(example=>example.id==='resource-analytical-comparison');
assert.equal(examples.length,1);
const consumer=await preparePackageConsumer({packageSpec:artifact.file});
try{await testTutorialConsumers(consumer.directory,{examples,evidenceFile:process.argv[3]});}
finally{await consumer.cleanup();}
console.log(JSON.stringify({archive:artifact.sha256,node:process.version,examples:examples.map(x=>x.id),status:'passed'}));
