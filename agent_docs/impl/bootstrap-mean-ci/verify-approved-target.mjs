import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createBootstrapMeanCI } from "../../../examples/bootstrap-mean-ci/program.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const approved = await fs.readFile(new URL("./target.svg", import.meta.url), "utf8");
const actual = renderToSVG(createBootstrapMeanCI());
const browser = await chromium.launch({ headless: true });
const rgba = [];
try {
  for (const svg of [approved, actual]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 220 }, deviceScaleFactor: 1 });
    await page.setContent(svg);
    const png = await page.locator("svg").screenshot();
    const context = createCanvas(320, 220).getContext("2d");
    context.drawImage(await loadImage(png), 0, 0);
    rgba.push(context.getImageData(0, 0, 320, 220).data);
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(rgba[1], rgba[0]);
const evidence = { status: "pass", method: "Same-run Chromium SVG rasterization then exact decoded RGBA comparison; no image inspection", width: 320, height: 220, comparedBytes: 281600, exact: true };
await fs.writeFile(new URL("./approved-target-comparison.json", import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify(evidence));
