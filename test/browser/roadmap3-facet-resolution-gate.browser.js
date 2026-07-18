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

test("renders the facet resolution and outer-guide gate primitives in a browser", async () => {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openBrowserPage(
      browser,
      new URL("test/gates/facet-resolution/", server.baseUrl).href,
      { waitFor: () => window.__facetResolutionGate !== undefined }
    );
    assert.deepEqual(await windowValue(page, "__facetResolutionGate"), {
      shared: { width: 908, height: 588 },
      independent: { width: 908, height: 588 },
      outer: { width: 1044, height: 588 }
    });
    assertNoBrowserErrors(errors, "Roadmap 3 facet resolution Gates");
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
