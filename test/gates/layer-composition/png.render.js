import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderToPNGBuffer } from '../../../src/renderers/png.js';
import { deserializeProgram, serializeProgram } from '../../../src/persistence.js';
import { build, variants } from './manifest.js';
for (const variant of variants) test(`${variant.id}: reproducible rendered review target`, async () => {
 const program=build(variant), result=await renderToPNGBuffer(program);
 const restored=await renderToPNGBuffer(deserializeProgram(serializeProgram(program)));
 assert.deepEqual(result.buffer,restored.buffer);
 assert.ok(result.bytes>4000);
 const dir=new URL(`../../../.artifacts/test/png/review/layer-composition/${variant.id}/`,import.meta.url);
 await mkdir(dir,{recursive:true});
 await writeFile(new URL('target.png',dir),result.buffer);
 await writeFile(new URL('variant.json',dir),JSON.stringify({id:variant.id,title:variant.title,
  proposedPublicCalls:variant.target, executableCalls:variant.calls, width:result.width,height:result.height},null,2));
});
