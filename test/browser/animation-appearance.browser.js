import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { startStaticServer } from '../support/static-server.js';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from '../support/browser.js';

test('public appearance frames preserve linear-light color, alpha and rebasing in browser Canvas and SVG', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), 'ggaction-appearance-animation-'));
  let server, browser;
  try {
    const bundle = await build({ stdin: { contents: `export {animationAppearanceFrame} from './test/support/animation-appearance-frame.js'; export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root }, bundle: true, platform: 'browser', format: 'esm', write: false });
    await writeFile(path.join(directory, 'frame.js'), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, 'index.html'), '<!doctype html><html lang="en"><title>Appearance transition</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Moving point with interpolated solid color"></canvas></html>');
    server = await startStaticServer(directory); browser = await chromium.launch({ headless: true });
    for (const ratio of [1, 2]) for (const mode of ['gamma', 'alpha', 'rebased']) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector('#status').textContent === 'Ready' });
        const result = await opened.page.evaluate(async ({ ratio, mode }) => {
          const { animationAppearanceFrame, render, renderToSVG } = await import('/frame.js');
          const { frame, point: [x, y], rgba } = animationAppearanceFrame(mode), canvas = document.querySelector('canvas');
          render(frame, canvas.getContext('2d'), { pixelRatio: ratio });
          const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(frame))}`; await image.decode();
          const svg = document.createElement('canvas'); svg.width = 200 * ratio; svg.height = 100 * ratio;
          svg.getContext('2d').drawImage(image, 0, 0, svg.width, svg.height);
          const pixel = target => [...target.getContext('2d').getImageData(x * ratio, y * ratio, 1, 1).data];
          document.querySelector('#status').textContent = 'Complete';
          return { canvas: pixel(canvas), svg: pixel(svg), expected: rgba, size: [canvas.width, canvas.height] };
        }, { ratio, mode });
        assert.deepEqual(result.size, [200 * ratio, 100 * ratio]);
        if (mode === 'alpha') for (const actual of [result.canvas, result.svg]) actual.forEach((value, index) => assert.ok(Math.abs(value - result.expected[index]) <= 1));
        else { assert.deepEqual(result.canvas, result.expected); assert.deepEqual(result.svg, result.expected); }
        console.log(JSON.stringify({ ratio, mode, ...result }));
        assertNoBrowserErrors(opened.errors, 'Appearance transition'); await opened.page.close();
      } finally { await context.close(); }
    }
  } catch (error) { if (browser) await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); await rm(directory, { recursive: true, force: true }); }
});
