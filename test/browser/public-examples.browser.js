import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { publicCharts } from "../../examples/registry.js";
import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const examples = publicCharts({ browser: true });

let browser;
let server;

test.before(async () => {
  server = await startStaticServer(repositoryRoot);
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await server?.close();
});

assert.equal(examples.length > 0, true);

for (const example of examples) {
  test(`renders ${example.id} at its logical Canvas size`, async () => {
    const page = await browser.newPage();
    const errors = [];
    const onConsole = message => {
      if (message.type() === "error") errors.push(message.text());
    };
    const onPageError = error => errors.push(error.message);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    const response = await page.goto(
      new URL(`examples/${example.browser.path}`, server.baseUrl).href,
      { waitUntil: "networkidle" }
    );
    assert.equal(response.ok(), true, `${example.id} failed to load`);
    await page.waitForFunction(() => {
      const status = document.querySelector("#status")?.textContent ?? "";
      return status.length > 0 && !/^Loading\b/i.test(status);
    });
    const size = await page.locator(example.browser.canvas).evaluate(canvas => ({
      width: canvas.width,
      height: canvas.height
    }));
    assert.deepEqual(size, {
      width: example.width,
      height: example.height
    }, `${example.id} Canvas size`);
    assert.deepEqual(errors, [], `${example.id} browser errors`);
    await page.close();
  });
}
