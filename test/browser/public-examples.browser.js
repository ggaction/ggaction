import { saveBrowserContextEvidence, saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { publicExamples } from "../../examples/registry.js";
import {
  assertNoBrowserErrors,
  closeBrowserWithEvidence,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const examples = publicExamples({ browser: true });

let browser;
let server;

test.before(async () => {
  server = await startStaticServer(repositoryRoot);
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
});

assert.equal(examples.length > 0, true);

for (const example of examples) {
  test(`renders ${example.id} at its logical Canvas size`, async () => {
  try {
    const { page, errors } = await openBrowserPage(
      browser,
      new URL(`examples/${example.browser.path}`, server.baseUrl).href,
      {
        waitFor: () => {
          const status = document.querySelector("#status")?.textContent ?? "";
          return status.length > 0 && !/^Loading\b/i.test(status);
        }
      }
    );
    const paint = await page.locator(example.browser.canvas).evaluate(canvas => {
      const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] > 0) colors.add(`${rgba[i]},${rgba[i+1]},${rgba[i+2]},${rgba[i+3]}`);
        if (colors.size > 1) return true;
      }
      return false;
    });
    assert.equal(paint, true, `${example.id} must paint visible content beyond a uniform background`);
    const size = await page.locator(example.browser.canvas).evaluate(canvas => ({
      width: canvas.width,
      height: canvas.height,
      accessibleName: canvas.getAttribute("aria-label")?.trim() ?? "",
      logicalWidth: Number.parseFloat(getComputedStyle(canvas).width),
      logicalHeight: Number.parseFloat(getComputedStyle(canvas).height)
    }));
    assert.deepEqual({ width: size.width, height: size.height }, {
      width: example.width,
      height: example.height
    }, `${example.id} Canvas size`);
    assert.notEqual(size.accessibleName, "", `${example.id} accessible Canvas name`);
    assert.equal(size.logicalWidth, example.width, `${example.id} logical Canvas width`);
    assert.equal(size.logicalHeight, example.height, `${example.id} logical Canvas height`);
    if (example.browser.state) {
      assert.deepEqual(
        await windowValue(page, example.browser.state.global),
        example.browser.state.expected,
        `${example.id} browser state`
      );
    }
    assertNoBrowserErrors(errors, example.id);
    await page.close();

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
}

test("keeps logical Canvas size at a high browser pixel density", async () => {
  try {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  try {
    const example = examples.find(item => item.id === "cars-binned-heatmap");
    const { page, errors } = await openBrowserPage(
      context,
      new URL(`examples/${example.browser.path}`, server.baseUrl).href,
      {
        waitFor: () => {
          const status = document.querySelector("#status")?.textContent ?? "";
          return status.length > 0 && !/^Loading\b/i.test(status);
        }
      }
    );
    const paint = await page.locator(example.browser.canvas).evaluate(canvas => {
      const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] > 0) colors.add(`${rgba[i]},${rgba[i+1]},${rgba[i+2]},${rgba[i+3]}`);
        if (colors.size > 1) return true;
      }
      return false;
    });
    assert.equal(paint, true, `${example.id} must paint visible content beyond a uniform background`);
    const size = await page.locator(example.browser.canvas).evaluate(canvas => ({
      width: canvas.width,
      height: canvas.height,
      logicalWidth: Number.parseFloat(getComputedStyle(canvas).width),
      logicalHeight: Number.parseFloat(getComputedStyle(canvas).height)
    }));
    assert.deepEqual(size, {
      width: example.width * 2,
      height: example.height * 2,
      logicalWidth: example.width,
      logicalHeight: example.height
    });
    assertNoBrowserErrors(errors, `${example.id} high-density browser`);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally {
    await context.close();
  }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
