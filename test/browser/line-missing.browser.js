import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("direct line gaps agree in browser Canvas and independently inspected SVG geometry", async () => {
  const directory = await mkdtemp(path.join(root, ".artifacts/line-gap-browser-"));
  const server = await startStaticServer(root);
  const browser = await chromium.launch({ headless: true });
  let context;
  try {
    await writeFile(path.join(directory, "index.html"), '<!doctype html><html><body><canvas aria-label="Interrupted observations"></canvas><div id="svg"></div><p id="status">Ready</p></body></html>');
    context = await browser.newContext();
    const { page, errors } = await openBrowserPage(context,
      server.baseUrl + path.relative(root, directory) + "/", {
        waitFor: () => document.querySelector("#status")?.textContent === "Ready"
      });
    const result = await page.evaluate(async () => {
      const { chart, render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const p = chart().createCanvas({ width: 100, height: 100, margin: 0 })
        .createData({ values: [{ x: 0, y: 1 }, { x: 2, y: 3 }, { x: 3, y: null },
          { x: 5, y: 6 }, { x: 7, y: 8 }] })
        .createLinePlot({ x: { field: "x", scale: { domain: [0, 10] } },
          y: { field: "y", scale: { domain: [0, 10] } }, line: { missing: "break" }, guides: false });
      const canvas = document.querySelector("canvas"), ctx = canvas.getContext("2d");
      render(p, ctx, { pixelRatio: 1 });
      document.querySelector("#svg").innerHTML = renderToSVG(p);
      const bounds = [...document.querySelectorAll("#svg path")].map(path => {
        const box = path.getBBox(); return [box.x, box.y, box.width, box.height];
      });
      return { width: canvas.width, height: canvas.height, bounds,
        gapPixel: [...ctx.getImageData(35, 55, 1, 1).data],
        segmentPixel: [...ctx.getImageData(10, 80, 1, 1).data] };
    });
    assert.equal(result.width, 100); assert.equal(result.height, 100);
    assert.deepEqual(result.bounds, [[0, 70, 20, 20], [50, 20, 20, 20]]);
    assert.deepEqual(result.gapPixel, [255, 255, 255, 255]);
    assert.ok(result.segmentPixel.slice(0, 3).some(value => value < 200));
    assertNoBrowserErrors(errors);
  } finally {
    await context?.close(); await closeBrowserWithEvidence(browser); await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
