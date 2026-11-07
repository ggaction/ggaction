import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { startStaticServer } from '../support/static-server.js';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from '../support/browser.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = new URL('../../.artifacts/browser/circle-batch/', import.meta.url);
let browser, server;
test.before(async () => {
  await mkdir(directory, { recursive: true });
  await build({ stdin: { contents: `import {chart,render,prepareShadowRendering} from 'ggaction';
    import {renderToSVG} from 'ggaction/svg';
    import {circleBatchFixture} from ${JSON.stringify(fileURLToPath(new URL('../support/circle-batch.js', import.meta.url)))};
    window.batch={chart,render,prepareShadowRendering,renderToSVG,circleBatchFixture}; document.querySelector('#status').textContent='Ready';`,
    resolveDir: process.env.GGACTION_BATCH_PACKAGE_ROOT ?? root }, bundle: true, minify: true, platform: 'browser', format: 'esm', outfile: fileURLToPath(new URL('bundle.js', directory)) });
  await writeFile(new URL('index.html', directory), '<!doctype html><meta charset="utf-8"><title>Concrete circle batches</title><canvas width="100" height="80" aria-label="Overlapping circles"></canvas><p id="status">Loading</p><script type="module" src="bundle.js"></script>');
  server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const ratio of [1, 2]) test(`circle columns preserve every browser circle at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 390, height: 844 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL('.artifacts/browser/circle-batch/', server.baseUrl).href,
      { waitFor: () => document.querySelector('#status').textContent === 'Ready' });
    const result = await page.evaluate(async ratio => {
      const { chart, render, prepareShadowRendering, renderToSVG, circleBatchFixture } = window.batch;
      const check = (yes, message) => { if (!yes) throw new Error(message); };
      const createCanvas = (width, height) => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
      const decode = async ({ bytes, mimeType }) => { const image = await createImageBitmap(new Blob([bytes], { type: mimeType })); return { image, width: image.width, height: image.height, originClean: true }; };
      const styles = [
        { fill: '#2184b6', opacity: .37 },
        { fill: '#2184b6', opacity: .37, outline: { color: '#091827', width: 4 } },
        { fill: '#2184b6', opacity: .37, blend: 'difference' },
        { fill: { type: 'pattern', style: 'cross', pitch: 8, strokeWidth: 2, phase: [1, 3], foreground: 'rgba(255,0,0,.6)', background: 'rgba(0,0,255,.3)', origin: { x: 4, y: 5 } }, opacity: .65 },
        { fill: { type: 'radial-gradient', center: { x: .5, y: .5 }, focal: { x: .25, y: .4 }, radius: .7, stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }] }, opacity: .65 },
        { fill: '#2184b6', opacity: .5, shadow: { color: '#172a45', offsetX: 3, offsetY: -2, blurRadius: 2 } }
      ];
      const records = [];
      for (const appearance of styles) {
        const actual = circleBatchFixture(chart, appearance), control = circleBatchFixture(chart, appearance, false);
        const glyphs = appearance.shadow ? await Promise.all([actual, control].map(p => prepareShadowRendering(p, { createCanvas, decode, pixelRatio: ratio }))) : [undefined, undefined];
        const surfaces = [document.querySelector('canvas'), createCanvas(1, 1)];
        try {
          [actual, control].forEach((p, index) => render(p, surfaces[index].getContext('2d'), { pixelRatio: ratio, shadows: glyphs[index] }));
          const data = surfaces.map(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
          check(surfaces[0].width === 100 * ratio && surfaces[0].height === 80 * ratio, 'Physical density differs');
          check(surfaces[0].style.width === '100px' && surfaces[0].style.height === '80px', 'Logical dimensions differ');
          check(data[0].length === data[1].length && data[0].every((value, index) => value === data[1][index]), 'Individual circle pixels differ');
          check(data[0].some(value => value !== 255), 'Plot has no ink');
          check(renderToSVG(actual, { shadows: glyphs[0], resourceNamespace: 'test' }) === renderToSVG(control, { shadows: glyphs[1], resourceNamespace: 'test' }), 'Browser SVG differs');
          records.push({ paint: typeof appearance.fill === 'string' ? appearance.shadow ? 'shadow' : appearance.blend ?? (appearance.outline ? 'outline' : 'solid') : appearance.fill.type, pixels: data[0].length / 4 });
        } finally { glyphs.forEach(value => value?.dispose()); }
      }
      return records;
    }, ratio);
    assert.equal(result.length, 6); assertNoBrowserErrors(errors, 'circle batches');
    await writeFile(new URL(`dpr-${ratio}.json`, directory), JSON.stringify({ ratio, status: 'exact browser primitive parity', records: result }, null, 2));
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
