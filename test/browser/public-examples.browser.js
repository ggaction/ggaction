import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

import { publicBrowserExamples } from "../../examples/registry.js";
import {
  assertNoBrowserErrors,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const examples = publicBrowserExamples();

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
  });
}

for (const example of examples.filter(item => item.browser.interaction)) {
  test(`operates ${example.id} with buttons and arrow keys`, async () => {
    const context = await browser.newContext();
    try {
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
      const interaction = example.browser.interaction;
      const currentStep = () => page.evaluate(
        name => window[name].step,
        interaction.stateGlobal
      );
      const previous = page.locator(interaction.previous);
      const next = page.locator(interaction.next);

      assert.equal(await currentStep(), 0);
      assert.equal(await previous.isDisabled(), true);
      await next.click();
      assert.equal(await currentStep(), 1);
      await page.keyboard.press("ArrowRight");
      assert.equal(await currentStep(), 2);
      await page.keyboard.press("ArrowLeft");
      assert.equal(await currentStep(), 1);
      await previous.click();
      assert.equal(await currentStep(), 0);

      for (let step = 0; step < interaction.finalStep; step += 1) {
        await page.keyboard.press("ArrowRight");
      }
      assert.equal(await currentStep(), interaction.finalStep);
      assert.equal(await next.isDisabled(), true);
      assert.match(await page.locator("#status").textContent(), /^Ready:/);

      const accessibility = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(
        accessibility.violations.map(violation => violation.id),
        [],
        `${example.id} accessibility violations`
      );
      assertNoBrowserErrors(errors, `${example.id} interaction`);
    } finally {
      await context.close();
    }
  });

  test(`contains ${example.id} at a narrow mobile width`, async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", error => errors.push(error.message));
      const response = await page.goto(
        new URL(`examples/${example.browser.path}`, server.baseUrl).href,
        { waitUntil: "networkidle" }
      );
      assert.equal(response?.ok(), true);
      await page.waitForFunction(() => !/^Loading\b/i.test(
        document.querySelector("#status")?.textContent ?? "Loading"
      ));
      assert.equal(await page.evaluate(() =>
        document.documentElement.scrollWidth === document.documentElement.clientWidth
      ), true);
      assertNoBrowserErrors(errors, `${example.id} mobile`);
    } finally {
      await context.close();
    }
  });
}

test("keeps logical Canvas size at a high browser pixel density", async () => {
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
  } finally {
    await context.close();
  }
});
