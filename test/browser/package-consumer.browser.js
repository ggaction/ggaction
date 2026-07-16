import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright";

import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { startStaticServer } from "../support/static-server.js";

let browser;
let consumer;
let server;

test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), `<!doctype html>
    <html><body><canvas id="chart"></canvas><script type="importmap">
    {"imports":{"ggaction":"/node_modules/ggaction/src/index.js"}}
    </script><script type="module">
      import { chart, render } from "ggaction";
      const program = chart()
        .createCanvas({ width: 160, height: 120, margin: 20 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
        .createPointMark()
        .encodeX({ field: "x" })
        .encodeY({ field: "y" })
        .encodeRadius({ value: 3 });
      const canvas = document.querySelector("#chart");
      render(program, canvas.getContext("2d"));
      window.__ggactionConsumer = {
        width: canvas.width,
        height: canvas.height,
        points: program.graphicSpec.objects.point.items.length
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
  const page = await browser.newPage();
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(server.baseUrl, { waitUntil: "networkidle" });
  assert.equal(response.ok(), true);
  await page.waitForFunction(() => window.__ggactionConsumer !== undefined);
  assert.deepEqual(await page.evaluate(() => window.__ggactionConsumer), {
    width: 160,
    height: 120,
    points: 2
  });
  assert.deepEqual(errors, []);
  await page.close();
});
