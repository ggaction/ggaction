import { preparePackageConsumer } from '../../../../../scripts/package-consumer.js';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const consumer = await preparePackageConsumer();
try {
  const script = path.join(consumer.directory, 'point-capacity.mjs');
  await writeFile(script, `
import assert from 'node:assert/strict';
import {chart} from 'ggaction';
import {chart as basicChart} from 'ggaction/basic';
const results=[];
for (const [entry,factory] of [['ggaction',chart],['ggaction/basic',basicChart]]) {
 const values=Array.from({length:100000},(_,x)=>({x}));
 const p=factory().createData({values}).createPointMark({maxItems:100000});
 for(let i=0;i<values.length;i++) {
  assert.equal(p.semanticSpec.datasets[0].values[i].x,i);
  assert.equal(p.graphicSpec.objects.point.items[i].id,'point:'+i);
 }
 assert.equal(p.markConfigs.point.maxItems,100000);
 assert.throws(()=>factory().createData({values:values.concat({x:100000})}).createPointMark({maxItems:100000}),/100000/);
 results.push({entry,raw:values.length,items:p.graphicSpec.objects.point.items.length,maxItems:p.markConfigs.point.maxItems});
}
console.log(JSON.stringify(results));
`);
  const results = JSON.parse(execFileSync(process.execPath, [script], { cwd: consumer.directory, encoding: 'utf8' }));
  const receipt = { node: process.version, platform: process.platform, arch: process.arch,
    sha256: consumer.artifact.sha256, entries: consumer.artifact.entryCount,
    packedBytes: consumer.artifact.size, unpackedBytes: consumer.artifact.unpackedSize, results };
  console.log(JSON.stringify(receipt, null, 2));
  await writeFile(new URL('./packed.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
} finally { await consumer.cleanup(); }
