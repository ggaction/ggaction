import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import {
  assertNoBrowserErrors,
  closeBrowserWithEvidence,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const pages = Object.freeze([
  Object.freeze({
    id: "direct-source-facets",
    path: "test/charts/cars-origin-scatterplot-facet/",
    global: "__directFacets",
    expected: {
      scatterplot: { width: 932, height: 282, nestedCanvasCount: 3 },
      histogram: { width: 756, height: 578, nestedCanvasCount: 3 }
    }
  }),
  Object.freeze({
    id: "facet-resolution",
    path: "test/charts/cross-feature-integration/variants/facet-resolution/",
    global: "__facetResolution",
    expected: {
      shared: { width: 908, height: 588 },
      independent: { width: 908, height: 588 },
      outer: { width: 1044, height: 588 }
    }
  }),
  Object.freeze({
    id: "polar-points",
    path: "test/charts/polar-points/",
    global: "__polarPoints",
    expected: {
      cars: { width: 520, height: 520, points: 400 },
      fashion: { width: 560, height: 560, points: 498 }
    }
  }),
  Object.freeze({
    id: "program-composition-layouts",
    path: "test/charts/program-composition/variants/layouts/",
    global: "__compositionLayouts",
    expected: {
      unequal: { width: 792, height: 352, nestedCanvases: 2 },
      nested: { width: 820, height: 618, nestedCanvases: 4 },
      replacement: { width: 772, height: 344, nestedCanvases: 2 }
    }
  })
]);

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

for (const capability of pages) {
  test(`renders ${capability.id} through the shared capability harness`, async () => {
    let opened;
    try {
      opened = await openBrowserPage(
        browser,
        new URL(capability.path, server.baseUrl).href,
        {
          waitFor: name => window[name] !== undefined,
          waitForArg: capability.global
        }
      );
    } catch (error) {
      throw new Error(`${capability.id} failed to become ready.`, { cause: error });
    }
    const { page, errors } = opened;
    assert.deepEqual(
      await windowValue(page, capability.global),
      capability.expected
    );
    assertNoBrowserErrors(errors, capability.id);
    await page.close();
  });
}
