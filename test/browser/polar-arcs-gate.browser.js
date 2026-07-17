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

test("renders all Polar arc Gate primitives in a browser", async () => {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, errors } = await openBrowserPage(
      browser,
      new URL("test/gates/polar-arcs/", server.baseUrl).href,
      { waitFor: () => window.__polarArcGate !== undefined }
    );
    assert.deepEqual(await windowValue(page, "__polarArcGate"), {
      donut: { width: 640, height: 500, paths: 3 },
      rose: { width: 780, height: 640, paths: 32 },
      radial: { width: 780, height: 640, paths: 12 }
    });
    assertNoBrowserErrors(errors, "Polar arc Gate");
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
