import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTypeScript } from '../support/typescript.js';
import { chart } from '../../src/index.js';
import { describeAction } from '../../src/inspection.js';

test('composition legend policy has closed public types and inspection choices', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'ggaction-legend-policy-'));
  try {
    const file = path.join(folder, 'policy.mts');
    const types = fileURLToPath(new URL('../../types/index.js', import.meta.url));
    await writeFile(file, `import {chart, hconcat, vconcat} from ${JSON.stringify(types)};
const p = chart();
hconcat({programs:[p,p],legends:'collect'});
vconcat({programs:[p,p],legends:'local'});
p.createAdjacentPlot({legends:'collect'}).editCompositionLayout({legends:'local'});
// @ts-expect-error Closed collection policy.
p.createAdjacentPlot({legends:'shared'});
// @ts-expect-error Boolean is not a collection policy.
p.editCompositionLayout({legends:true});
`);
    const result = compileTypeScript(['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const p = chart().createCanvas({ plot: { width: 220, height: 220 }, margin: 100 })
      .createData({ id: 'd', values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] }).createScatterPlot({ id: 'p', x: 'x', y: 'y' });
    const description = describeAction(p, { action: 'createAdjacentPlot', options: { legends: 'collect' } });
    const definition = description.parameterDefinitions.find(option => option.path === 'legends');
    assert.ok(definition);
    assert.deepEqual(definition.choices, ['collect', 'local']);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
