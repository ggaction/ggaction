import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { renderToPNGBuffer } from '../../../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../../../src/renderers/pdf.js';
import { renderToSVG } from '../../../../../src/renderers/svg.js';
import { render } from '../../../../../src/renderers/canvas/index.js';
import { animationAppearanceFrame } from '../../../../support/animation-appearance-frame.js';

for (const mode of ['gamma', 'alpha', 'rebased']) test(`public ${mode} appearance renders the current solid color in Canvas, PNG and vector PDF`, async () => {
  const directory = new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/appearance/${mode}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const { frame, point: [x, y], rgba } = animationAppearanceFrame(mode);
  const canvas = createCanvas(1, 1); render(frame, canvas.getContext('2d'));
  assert.deepEqual([...canvas.getContext('2d').getImageData(x, y, 1, 1).data], rgba);
  const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
  assert.deepEqual(png.buffer, await canvas.encode('png'));
  await writeFile(new URL('middle.png', directory), png.buffer);
  await writeFile(new URL('middle.pdf', directory), pdf.buffer);
  await writeFile(new URL('middle.svg', directory), renderToSVG(frame));
  const output = fileURLToPath(new URL('middle', directory));
  execFileSync('pdftoppm', ['-r', '72', '-singlefile', '-png', `${output}.pdf`, `${output}-pdf`], { stdio: 'pipe' });
  const image = await loadImage(await readFile(`${output}-pdf.png`)), decoded = createCanvas(200, 100);
  decoded.getContext('2d').drawImage(image, 0, 0);
  const actual = [...decoded.getContext('2d').getImageData(x, y, 1, 1).data];
  // PDF color/transparency quantization can round one 8-bit channel differently.
  actual.forEach((value, index) => assert.ok(Math.abs(value - rgba[index]) <= 1));
  assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image\b/);
  await writeFile(new URL('pixels.json', directory), JSON.stringify({ expected: rgba, actualPDF: actual }, null, 2));
});
