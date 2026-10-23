import { saveBrowserContextEvidence, saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const name = process.env.GGACTION_BROWSER ?? "chromium", engines = { chromium, firefox, webkit };
assert(Object.hasOwn(engines, name));
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"),
    '<html lang="en"><head><meta charset="utf-8"><title>Content headers</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server = await startStaticServer(consumer.directory);
  browser = await engines[name].launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });

for (const ratio of [1, 2]) test(`${name} matches explicit content-header geometry in Canvas and SVG at DPR ${ratio}`, async () => {
  try {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl);
    const result = await page.evaluate(async ratio => {
      const { chart, render } = await import("/node_modules/ggaction/src/index.js");
      const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
      const { serializeProgram, deserializeProgram } = await import("/node_modules/ggaction/src/persistence.js");
      const base = chart().createCanvas({ plot: { width: 100, height: 100 }, margin: 70 })
        .createData({ values: [{ group: "A", x: 5, y: 5 }, { group: "B", x: 10, y: 10 }] })
        .createScatterPlot({ x: { field: "x", scale: { domain: [0, 10] } },
          y: { field: "y", scale: { domain: [0, 10] } }, guides: false })
        .editPointMark({ stroke: false }).encodePointRadius({ value: 3 })
        .facet({ field: "group", columns: 2, spacing: "plot", gap: 30 })
        .editCompositionLayout({ topLane: "shared" });
      const actual = base.editFacetHeaders({ anchor: "content" });
      // Independent literal: plot top70 - offset10 - half font12 - radius3 =51.
      const primitive = base.editGraphics({ target: "facet-headers:1", property: "y", value: 51 });
      const programs = [actual, primitive], pixels = [];
      for (const p of programs) {
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        render(p, ctx, { pixelRatio: ratio });
        pixels.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      }
      let differences = 0;
      for (let i = 0; i < pixels[0].length; i++) if (pixels[0][i] !== pixels[1][i]) differences++;
      return { differences, sameLength: pixels[0].length === pixels[1].length,
        sameSvg: renderToSVG(actual) === renderToSVG(primitive),
        savedSvg: renderToSVG(deserializeProgram(serializeProgram(actual))) === renderToSVG(actual),
        headerY: actual.graphicSpec.objects["facet-headers"].items.map(x => x.properties.y) };
    }, ratio);
    assert.deepEqual(result, { differences: 0, sameLength: true, sameSvg: true, savedSvg: true, headerY: [54, 51] });
    assertNoBrowserErrors(errors, name);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally { await context.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
