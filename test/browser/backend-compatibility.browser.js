import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { compatibilityPage } from "../support/backend-compatibility.js";
import { openBrowserPage, assertNoBrowserErrors, saveBrowserPageEvidence, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const browserName = process.env.GGACTION_BROWSER ?? "chromium";
const browsers = { chromium, firefox, webkit };
assert.ok(Object.hasOwn(browsers, browserName), `Unknown browser ${browserName}`);
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), compatibilityPage());
  server = await startStaticServer(consumer.directory);
  browser = await browsers[browserName].launch({ headless: true });
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await consumer?.cleanup();
});

for (const ratio of [1, 2]) {
  test(`${browserName} preserves Canvas/SVG clipping, gradient, text, resize, density, and downloads at DPR ${ratio}`, async () => {
    const context = await browser.newContext({ deviceScaleFactor: ratio, acceptDownloads: true });
    let page;
    try {
      const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.compatibility !== undefined });
      page = opened.page;
      for (const width of [160, 220]) {
        if (width !== 160) await page.evaluate(width => window.drawCompatibility(width), width);
        const actual = await page.evaluate(() => window.compatibility);
        assert.deepEqual(actual.physical, [width * ratio, 100 * ratio]);
        assert.deepEqual(actual.logical, [width, 100]);
        assert.equal(actual.ratio, ratio);
        assert.equal(actual.unchanged, true);
        for (const pixels of [actual.canvas, actual.svgPixels]) {
          assert.deepEqual(pixels.outsideLeft, [255, 255, 255, 255]);
          assert.deepEqual(pixels.outsideRight, [255, 255, 255, 255]);
          assert.ok(pixels.red[0] > 180 && pixels.red[2] < 80);
          assert.ok(pixels.blue[2] > 180 && pixels.blue[0] < 80);
          assert.ok(pixels.text.count > 20);
          assert.ok(Math.abs((pixels.text.left + pixels.text.right) / 2 - 60) < 4, "horizontal text alignment");
          assert.ok(Math.abs((pixels.text.top + pixels.text.bottom) / 2 - 40) < 4, "vertical text alignment");
        }
        assert.match(actual.svg, /<clipPath/);
        assert.match(actual.svg, /<linearGradient/);
        assert.equal(await page.locator("#svg title").textContent(), "Compatibility scene");
        assert.equal(await page.locator("canvas").getAttribute("aria-label"), "Clipped gradient with centered text");
      }
      const downloadEvent = page.waitForEvent("download");
      await page.locator("#download").click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), "compatibility.svg");
      assert.equal(await readFile(await download.path(), "utf8"), await page.evaluate(() => window.compatibility.svg));
      assertNoBrowserErrors(opened.errors, browserName);
      await page.close();
    } catch (error) {
      if (page) await saveBrowserPageEvidence(page, error, `${browserName}-dpr-${ratio}`);
      throw error;
    } finally { await context.close(); }
  });
}
