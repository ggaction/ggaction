import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";

test("browser Geo planner samples renderer-ready frames in Canvas and SVG at both DPRs", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-animation-"));
  let server, browser;
  try {
    const bundle = await build({ stdin: { contents: `export {animationGeoFrame,geoFrameVariants} from './test/support/animation-geo-frame.js'; export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root }, bundle: true, platform: "browser", format: "esm", write: false });
    await writeFile(path.join(directory, "frame.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Sampled Geo geometry</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Native geo angles and radii"></canvas></html>');
    server = await startStaticServer(directory);browser = await chromium.launch({ headless: true });
    for (const ratio of [1, 2]) for (const variant of ["point","line","shape","graticule"]) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
        const result = await opened.page.evaluate(async ({ratio,variant}) => {
          const { animationGeoFrame, render, renderToSVG } = await import("/frame.js");
          const { frame, checks } = animationGeoFrame(variant), canvas = document.querySelector("canvas");
          render(frame, canvas.getContext("2d"), { pixelRatio: ratio });
          const image = new Image();image.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(frame))}`;await image.decode();
          const svg = document.createElement("canvas");svg.width = frame.scene.width * ratio;svg.height = frame.scene.height * ratio;
          svg.getContext("2d").drawImage(image, 0, 0, svg.width, svg.height);
          const pixels = target => checks.map(({ point: [x, y] }) => [...target.getContext("2d").getImageData(x * ratio, y * ratio, 1, 1).data]);
          document.querySelector("#status").textContent = "Complete";
          return { canvas: pixels(canvas), svg: pixels(svg), expected: checks.map(c => c.rgba), size: [canvas.width, canvas.height] };
        }, {ratio,variant});
        assert.deepEqual(result.size, [400 * ratio, 300 * ratio]);
        assert.deepEqual(result.canvas, result.expected);assert.deepEqual(result.svg, result.expected);
        assert.equal(await opened.page.locator("#status").textContent(), "Complete");assertNoBrowserErrors(opened.errors, "Sampled Geo geometry");
        await opened.page.close();
      } finally { await context.close(); }
    }
  } catch (error) { if (browser) await saveBrowserEvidence(browser, error);throw error; }
  finally { await closeBrowserWithEvidence(browser);await server?.close();await rm(directory, { recursive: true, force: true }); }
});
