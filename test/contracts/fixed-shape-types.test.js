import { compileTypeScript } from '../support/typescript.js';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
test('shape fixed and field branches are mutually exclusive in public types', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ggaction-fixed-shape-'));
  try {
    const file = path.join(dir, 'consumer.mts');
    await writeFile(file, `
import { chart } from ${JSON.stringify(path.join(root, 'types/index.js'))};
const p = chart();
p.encodeShape({value:'circle'});
p.encodeShape({value:{polygon:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]}});
p.encodeShape({field:'g',fieldType:'nominal'});
p.encodeChannels({target:'point',channels:{shape:{value:'diamond'}}});
p.encodeStrokeWidth({target:'point',value:2});
// @ts-expect-error field and value are exclusive
p.encodeShape({field:'g',value:'circle'});
// @ts-expect-error fixed shapes do not have scales
p.encodeShape({value:'circle',scale:{type:'ordinal'}});
// @ts-expect-error unsupported shape
p.encodeShape({value:'invalid'});
// @ts-expect-error one branch is required
p.encodeShape({});
`);
    const result = compileTypeScript(['--noEmit', '--strict', '--exactOptionalPropertyTypes', '--skipLibCheck', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
