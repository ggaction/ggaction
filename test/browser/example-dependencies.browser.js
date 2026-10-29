import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser;
test.before(async () => { server = await startStaticServer(root, { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const url of ["examples/browser-host/?chart=contours", "examples/inspect-chart/", "examples/getting-started/", "examples/cars-scatterplot/"]) test(`native example bootstrap loads ${url} without a bundler`, async () => {
  const { page, errors } = await openBrowserPage(browser, `${server.baseUrl}${url}`, { waitFor: () => {
    const status = document.querySelector("#status");
    const canvas = document.querySelector("canvas");
    return canvas !== null && canvas.width > 300 && status !== null && !/Loading|Failed/i.test(status.textContent);
  } });
  try {
    const state = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0; for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3] && Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 220) ink++;
      return { maps: document.querySelectorAll('script[type="importmap"]').length, width: canvas.width, height: canvas.height, ink };
    });
    assert.equal(state.maps, 1); assert.ok(state.width > 0 && state.height > 0 && state.ink > 100);
    assertNoBrowserErrors(errors, url);
  } finally { await page.close(); }
});
