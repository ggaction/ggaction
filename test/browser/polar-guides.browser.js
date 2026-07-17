import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("renders the public Polar guide chart in a browser", async () => {
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
      new URL("examples/polar-guides/", server.baseUrl).href,
      { waitUntil: "networkidle" }
    );
    assert.equal(response.ok(), true);
    await page.waitForFunction(() => window.__polarGuides !== undefined);
    assert.deepEqual(await page.evaluate(() => window.__polarGuides), {
      width: 620,
      height: 620,
      points: 400,
      thetaLabels: 6,
      radialLabels: 5
    });
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
