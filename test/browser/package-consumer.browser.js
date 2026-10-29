import { packedBrowserExpectations } from "../support/packed-browser-expectations.js";
import { saveBrowserEvidence, saveBrowserPageEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright";

import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import {
  assertNoBrowserErrors,
  closeBrowserWithEvidence,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser;
let consumer;
let server;

test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), await readFile(new URL("./fixtures/packed-consumer.html", import.meta.url), "utf8"));
  server = await startStaticServer(consumer.directory, { dependencies: "installed" });
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await consumer?.cleanup();
});

test("imports and renders the packed browser entries", async t => {
  try {
  const { page, errors } = await openBrowserPage(browser, server.baseUrl, {
    waitFor: () => window.__ggactionConsumer !== undefined
  });
  const guideComparisons = await windowValue(page, "__ggactionGuideComparisons");
  assert.equal(guideComparisons.length, 4);
  for (const [actual, expected] of guideComparisons) assert.deepEqual(actual, expected);
  const actual = await windowValue(page, "__ggactionConsumer");
  await t.test("packed browser result inventory", () => assert.deepEqual(Object.keys(actual).sort(), Object.keys(packedBrowserExpectations).sort()));
  for (const [key, expected] of Object.entries(packedBrowserExpectations)) {
    await t.test(`packed browser ${key}`, async () => {
      try { assert.deepEqual(actual[key], expected); }
      catch (error) { await saveBrowserPageEvidence(page, error, `packed-${key}`); throw error; }
    });
  };
  assert.equal(await page.locator("#status").textContent(), "complete");
  assert.equal(
    await page.locator("#chart").getAttribute("aria-label"),
    "Encoding removal lifecycle chart"
  );
  assert.equal(
    await page.locator("#legend").getAttribute("aria-label"),
    "Legend lifecycle chart"
  );
  assert.equal(
    await page.locator("#axis").getAttribute("aria-label"),
    "Axis component lifecycle chart"
  );
  assert.equal(
    await page.locator("#bin2d").getAttribute("aria-label"),
    "2D bin lifecycle chart"
  );
  assert.equal(
    await page.locator("#basic").getAttribute("aria-label"),
    "Basic entry scatterplot"
  );
  assertNoBrowserErrors(errors, "packed consumer");
  await page.close();

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
