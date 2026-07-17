import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("renders the public open and closed Polar line examples in a browser", async () => {
  const server = await startStaticServer(repositoryRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", error => errors.push(error.message));
    let response = await page.goto(
      new URL("examples/gapminder-polar-trends/", server.baseUrl).href,
      { waitUntil: "networkidle" }
    );
    assert.equal(response.ok(), true);
    await page.waitForFunction(() => window.__gapminderPolarTrends !== undefined);
    assert.deepEqual(await page.evaluate(() => window.__gapminderPolarTrends), {
      width: 760,
      height: 620,
      paths: 3,
      closed: false
    });
    response = await page.goto(
      new URL("examples/jobs-radar-chart/", server.baseUrl).href,
      { waitUntil: "networkidle" }
    );
    assert.equal(response.ok(), true);
    await page.waitForFunction(() => window.__jobsRadarChart !== undefined);
    assert.deepEqual(await page.evaluate(() => window.__jobsRadarChart), {
      width: 820,
      height: 650,
      paths: 2,
      closed: true
    });
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await server.close();
  }
});
