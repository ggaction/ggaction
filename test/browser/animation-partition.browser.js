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

test('public partition frames render their current cells in browser Canvas and SVG at both DPRs', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), 'ggaction-partition-animation-'));
  let server, browser;
  try {
    const bundle = await build({ stdin: { contents: `export {animationPartitionFrame} from './test/support/animation-partition-frame.js'; export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root }, bundle: true, platform: 'browser', format: 'esm', write: false });
    await writeFile(path.join(directory, 'frame.js'), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, 'index.html'), '<!doctype html><html lang="en"><title>Partition transition</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Hierarchy cells bending from an icicle into a sunburst"></canvas></html>');
    server = await startStaticServer(directory);
    browser = await chromium.launch({ headless: true });
    for (const ratio of [1, 2]) for (const rebased of [false, true]) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector('#status').textContent === 'Ready' });
        const result = await opened.page.evaluate(async ({ ratio, rebased }) => {
          const { animationPartitionFrame, render, renderToSVG } = await import('/frame.js');
          const { frame, checks } = animationPartitionFrame(rebased), canvas = document.querySelector('canvas');
          render(frame, canvas.getContext('2d'), { pixelRatio: ratio });
          const image = new Image();
          image.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(frame))}`;
          await image.decode();
          const svg = document.createElement('canvas');
          svg.width = 480 * ratio; svg.height = 360 * ratio;
          svg.getContext('2d').drawImage(image, 0, 0, svg.width, svg.height);
          const pixels = target => checks.map(({ point: [x, y] }) => [...target.getContext('2d').getImageData(x * ratio, y * ratio, 1, 1).data]);
          document.querySelector('#status').textContent = 'Complete';
          return { canvas: pixels(canvas), svg: pixels(svg), expected: checks.map(c => c.rgba), size: [canvas.width, canvas.height] };
        }, { ratio, rebased });
        assert.deepEqual(result.size, [480 * ratio, 360 * ratio]);
        assert.deepEqual(result.canvas, result.expected);
        assert.deepEqual(result.svg, result.expected);
        assertNoBrowserErrors(opened.errors, 'Partition transition');
        await opened.page.close();
      } finally { await context.close(); }
    }
  } catch (error) { if (browser) await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); await rm(directory, { recursive: true, force: true }); }
});
