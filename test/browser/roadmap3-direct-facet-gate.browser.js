import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import {
  assertNoBrowserErrors,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("renders every Gate H direct-source facet primitive in a browser", async () => {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openBrowserPage(
      browser,
      new URL("test/gates/direct-source-facet/", server.baseUrl).href,
      { waitFor: () => window.__directFacetGate !== undefined }
    );
    assert.deepEqual(await windowValue(page, "__directFacetGate"), {
      scatterplot: { width: 782, height: 282, nestedCanvasCount: 3 },
      histogram: { width: 606, height: 578, nestedCanvasCount: 3 }
    });
    assertNoBrowserErrors(errors, "Roadmap 3 direct-source facet Gate H");
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
