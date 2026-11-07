import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { renderToPNGBuffer } from '../../../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../../../src/renderers/pdf.js';
import { renderToSVG } from '../../../../../src/renderers/svg.js';
import { sampleTransition } from '../../../../../src/animation.js';
import { animationPartitionFrame } from '../../../../support/animation-partition-frame.js';

for (const rebased of [false, true]) test(`public ${rebased ? 'rebased' : 'native'} partition frames preserve current cells in PNG and vector PDF`, async () => {
  const directory = new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/partition/${rebased ? 'rebased' : 'native'}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const { from, to, plan, frame, checks } = animationPartitionFrame(rebased);
  const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
  await writeFile(new URL('middle.png', directory), png.buffer);
  await writeFile(new URL('middle.pdf', directory), pdf.buffer);
  await writeFile(new URL('middle.svg', directory), renderToSVG(frame));
  const output = fileURLToPath(new URL('middle', directory));
  execFileSync('pdftoppm', ['-r', '72', '-singlefile', '-png', `${output}.pdf`, `${output}-pdf`], { stdio: 'pipe' });
  const samples = [];
  for (const bytes of [png.buffer, await readFile(`${output}-pdf.png`)]) {
    const image = await loadImage(bytes);
    assert.equal(image.width, 480); assert.equal(image.height, 360);
    const canvas = createCanvas(480, 360), context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    samples.push(checks.map(({ point: [x, y], rgba }) => {
      const actual = [...context.getImageData(x, y, 1, 1).data];
      assert.deepEqual(actual, rgba);
      return actual;
    }));
  }
  for (const [time, native] of [[0, from], [100, to]]) {
    assert.deepEqual((await renderToPNGBuffer(sampleTransition(plan, time))).buffer, (await renderToPNGBuffer(native)).buffer);
  }
  assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image\b/);
  await writeFile(new URL('pixels.json', directory), JSON.stringify({ samples }, null, 2));
});
