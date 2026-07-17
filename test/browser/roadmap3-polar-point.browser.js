import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("renders both public Polar point charts in a browser", async () => {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(
      new URL("test/charts/polar-points/", server.baseUrl).href,
      { waitUntil: "networkidle" }
    );
    assert.equal(response.ok(), true);
    await page.waitForFunction(() => window.__polarPoints !== undefined);
    assert.deepEqual(await page.evaluate(() => window.__polarPoints), {
      cars: { width: 520, height: 520, points: 400 },
      fashion: { width: 560, height: 560, points: 498 }
    });
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
