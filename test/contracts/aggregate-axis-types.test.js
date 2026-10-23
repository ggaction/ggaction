import { compileTypeScript } from "../support/typescript.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));

test('declares aggregate axes with existing edit types and closed resource selectors', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'ggaction-aggregate-axis-'));
  try {
    const file = path.join(directory, 'axes.mts');
    await writeFile(file, `
import type { ChartProgram, EditAxesOptions } from ${JSON.stringify(path.join(root, 'types/index.js'))};
declare const p: ChartProgram;
const options: EditAxesOptions = { x: { labels: { fontSize: 11 } }, y: { title: false } };
p.editAxes(options).editAxes({ x: [{ target: 'bottom', labels: { fontSize: 11 } }] });
p.editAxes({ theta: { labels: { fontSize: 11 } }, radius: { angle: 0.5 } });
p.editAxes({ parallel: [{ field: 'a', labels: { fontSize: 11 } }, { field: 'b', title: false }] });
// @ts-expect-error no rebinding
p.editAxes({ x: { scale: 'other' } });
// @ts-expect-error arrays require targets
p.editAxes({ x: [{ labels: { fontSize: 11 } }] });
// @ts-expect-error parallel fields required
p.editAxes({ parallel: { labels: { fontSize: 11 } } });
// @ts-expect-error unknown channel
p.editAxes({ z: {} });
// @ts-expect-error polar arrays unsupported
p.editAxes({ theta: [{ labels: { fontSize: 11 } }] });
// @ts-expect-error nonempty array
p.editAxes({ y: [] });
`);
    const result = compileTypeScript(['--noEmit', '--strict', '--skipLibCheck',
      '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', file], { encoding: 'utf8', cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
