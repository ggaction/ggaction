import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright";

import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import {
  assertNoBrowserErrors,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser;
let consumer;
let server;

test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), `<!doctype html>
    <html><body><p id="status">loading</p>
    <canvas id="chart" aria-label="Encoding removal lifecycle chart"></canvas><script type="importmap">
    {"imports":{"ggaction":"/node_modules/ggaction/src/index.js"}}
    </script><script type="module">
      import { chart, render } from "ggaction";
      const program = chart()
        .createCanvas({ width: 160, height: 120, margin: 20 })
        .createData({ values: [
          { x: 1, y: 2, group: "A", amount: 4 },
          { x: 2, y: 4, group: "B", amount: 16 }
        ] })
        .createPointMark({ stroke: "black", strokeWidth: 2 })
        .encodeX({ field: "x" })
        .encodeY({ field: "y" })
        .encodeColor({ field: "group" })
        .encodeSize({ field: "amount" })
        .removeEncoding({ channel: "size" })
        .removeEncoding({ channel: "color" })
        .editPointMark({ stroke: false })
        .selectMarks({ id: "focus", field: "x", op: "max" })
        .highlightMarks({
          selection: "focus",
          color: "#dc2626",
          dimOthers: { opacity: 0.2 }
        })
        .editMarkSelection({ selection: "focus", field: "x", op: "min" })
        .removeMarkSelection({ selection: "focus" });
      const canvas = document.querySelector("#chart");
      render(program, canvas.getContext("2d"));
      document.querySelector("#status").textContent = "complete";
      window.__ggactionConsumer = {
        width: canvas.width,
        height: canvas.height,
        points: program.graphicSpec.objects.point.items.length,
        radii: program.graphicSpec.objects.point.items.map(
          item => item.properties.radius
        ),
        fills: program.graphicSpec.objects.point.items.map(
          item => item.properties.fill
        ),
        strokeWidths: program.graphicSpec.objects.point.items.map(
          item => item.properties.strokeWidth
        ),
        removedChannels: ["size", "color"].every(
          channel => program.semanticSpec.layers[0].encoding[channel] === undefined
        ),
        selectionRemoved:
          program.materializationConfigs.selections === undefined &&
          program.materializationConfigs.highlights === undefined
      };
    </script></body></html>`);
  server = await startStaticServer(consumer.directory);
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await server?.close();
  await consumer?.cleanup();
});

test("imports and renders the packed default entry in a browser", async () => {
  const { page, errors } = await openBrowserPage(browser, server.baseUrl, {
    waitFor: () => window.__ggactionConsumer !== undefined
  });
  assert.deepEqual(await windowValue(page, "__ggactionConsumer"), {
    width: 160,
    height: 120,
    points: 2,
    radii: [3, 3],
    fills: ["#4c78a8", "#4c78a8"],
    strokeWidths: [0, 0],
    removedChannels: true,
    selectionRemoved: true
  });
  assert.equal(await page.locator("#status").textContent(), "complete");
  assert.equal(
    await page.locator("canvas").getAttribute("aria-label"),
    "Encoding removal lifecycle chart"
  );
  assertNoBrowserErrors(errors, "packed consumer");
  await page.close();
});
