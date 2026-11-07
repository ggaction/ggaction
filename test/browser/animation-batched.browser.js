import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { startStaticServer } from '../support/static-server.js';
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from '../support/browser.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = new URL('../../.artifacts/browser/animation-batched/', import.meta.url);
let browser, server;
test.before(async () => {
  await mkdir(directory, { recursive: true });
  await build({ stdin: { contents: `import {chart} from 'ggaction'; import {renderToSVG} from 'ggaction/svg';
    import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from 'ggaction/animation'; import {renderTransitionScene} from 'ggaction/scene';
    window.batch={chart,renderToSVG,planTransition,sampleTransition,serializeAnimation,deserializeAnimation,renderTransitionScene};document.querySelector('#status').textContent='Ready';`,
    resolveDir: process.env.GGACTION_BATCH_PACKAGE_ROOT ?? root }, bundle: true, minify: true, platform: 'browser', format: 'esm', outfile: fileURLToPath(new URL('bundle.js', directory)) });
  await writeFile(new URL('index.html', directory), '<!doctype html><meta charset="utf-8"><title>Batched animation frames</title><canvas width="160" height="120" aria-label="Animated point plot"></canvas><p id="status">Loading</p><script type="module" src="bundle.js"></script>');
  server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const ratio of [1, 2]) test(`complete batch frames match legacy browser painting at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 390, height: 844 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL('.artifacts/browser/animation-batched/', server.baseUrl).href, { waitFor: () => document.querySelector('#status').textContent === 'Ready' });
    const result = await page.evaluate(ratio => {
      const { chart, renderToSVG, planTransition, sampleTransition, serializeAnimation, deserializeAnimation, renderTransitionScene } = window.batch;
      const check = (value, message) => { if (!value) throw new Error(message); };
      const options = { durationMs: 100, easing: 'linear' };
      const from = chart().createCanvas({ width: 160, height: 120, margin: 10, plotBorder: false })
        .createData({ id: 'rows', keyField: 'id', values: Array.from({ length: 1000 }, (_, id) => ({ id, x: (id % 31 + 1) / 32, y: (Math.floor(id / 31) + 1) / 34 })) })
        .createPointMark({ id: 'points', fill: '#2184b6', opacity: .37 }).encodeX({ field: 'x', scale: { id: 'x', domain: [0, 1], nice: false } }).encodeY({ field: 'y', scale: { id: 'y', domain: [0, 1], nice: false } });
      const to = from.editScale({ id: 'x', domain: [0, 2], nice: false }), plan = planTransition({ from, to, options: { ...options, formatVersion: 6 } }), legacy = planTransition({ from, to, options });
      const wire = serializeAnimation(plan), offline = deserializeAnimation(wire).plan;
      check(serializeAnimation(offline) === wire, 'Canonical wire differs');
      for (const time of [0, 37, 100]) {
        const frame = sampleTransition(plan, time), control = sampleTransition(legacy, time), restored = sampleTransition(offline, time);
        check(JSON.stringify(frame) === JSON.stringify(restored), 'Offline whole frame differs');
        check(frame.scene.version === 3 && frame.scene.entries.some(entry => entry.kind === 'circle-run'), 'Batch representation missing');
        const a = document.querySelector('canvas'), b = document.createElement('canvas');
        renderTransitionScene(frame.scene, a.getContext('2d'), { pixelRatio: ratio }); renderTransitionScene(control.scene, b.getContext('2d'), { pixelRatio: ratio });
        const actual = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, expected = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
        check(a.width === 160 * ratio && a.height === 120 * ratio && a.style.width === '160px', 'Canvas density differs');
        check(actual.length === expected.length && actual.every((value, index) => value === expected[index]), 'Legacy pixels differ');
        const actualSVG = renderToSVG(frame), expectedSVG = renderToSVG(control);
        check(JSON.stringify(actualSVG.match(/<circle[^>]*\/>/g)) === JSON.stringify(expectedSVG.match(/<circle[^>]*\/>/g)), 'Legacy SVG circles differ');
        if (time > 0 && time < 100) check(actualSVG === expectedSVG, 'Legacy interior SVG differs');
      }
      const frame = sampleTransition(plan, 37), rebase = planTransition({ from: frame, to, options: { ...options, formatVersion: 6 } });
      check(sampleTransition(rebase, 0) === frame, 'Exact rebase start differs');
      const restored = deserializeAnimation(serializeAnimation(rebase)).plan;
      check(JSON.stringify(sampleTransition(restored, 50)) === JSON.stringify(sampleTransition(rebase, 50)), 'Rebased whole frame differs');
      return { rows: 1000, times: [0, 37, 100], exactCanvasAndSVG: true, exactOfflineAndRebase: true };
    }, ratio);
    assert.equal(result.rows, 1000); assertNoBrowserErrors(errors, 'batched animation');
    await writeFile(new URL(`dpr-${ratio}.json`, directory), JSON.stringify({ ratio, ...result }, null, 2)); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
