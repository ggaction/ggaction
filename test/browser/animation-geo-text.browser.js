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

test("browser geographic Text keeps native current-camera Canvas and SVG pixels at both DPRs", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-animation-"));
  let server, browser;
  try {
    const bundle = await build({ stdin: { contents: `export {animationGeoTextFrame,geoTextFrameVariants} from './test/support/animation-geo-text-frame.js'; export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root }, bundle: true, platform: "browser", format: "esm", write: false });
    await writeFile(path.join(directory, "frame.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Sampled geographic Text</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Current geographic label anchors"></canvas></html>');
    server = await startStaticServer(directory);browser = await chromium.launch({ headless: true });
    for (const ratio of [1, 2]) for (const variant of ["collision","hidden"]) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
        const result = await opened.page.evaluate(async ({ratio,variant}) => {
          const { animationGeoTextFrame, render, renderToSVG } = await import("/frame.js");
          const { frame, native } = animationGeoTextFrame(variant), canvas = document.querySelector("canvas");
          render(frame, canvas.getContext("2d"), { pixelRatio: ratio });
          const image = new Image();image.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(frame))}`;await image.decode();
          const svg = document.createElement("canvas");svg.width = frame.scene.width * ratio;svg.height = frame.scene.height * ratio;
          svg.getContext("2d").drawImage(image, 0, 0, svg.width, svg.height);
          const expected = document.createElement("canvas");render(native, expected.getContext("2d"), { pixelRatio: ratio });
          const expectedImage = new Image();expectedImage.src = `data:image/svg+xml,${encodeURIComponent(renderToSVG(native))}`;await expectedImage.decode();
          const expectedSVG = document.createElement("canvas");expectedSVG.width = svg.width;expectedSVG.height = svg.height;expectedSVG.getContext("2d").drawImage(expectedImage, 0, 0, svg.width, svg.height);
          const pixels = target => target.getContext("2d").getImageData(0,0,target.width,target.height).data;
          const equal = (a,b) => {const x=pixels(a),y=pixels(b);return x.length===y.length && x.every((value,index)=>value===y[index]);};
          document.querySelector("#status").textContent = "Complete";
          return { canvas: equal(canvas,expected), svg: equal(svg,expectedSVG), labels:frame.decisions.filter(d=>d.kernel==="native-geo-text").length, size: [canvas.width, canvas.height] };
        }, {ratio,variant});
        assert.deepEqual(result.size, [400 * ratio, 300 * ratio]);
        assert.equal(result.canvas,true);assert.equal(result.svg,true);assert.ok(result.labels>=3);
        assert.equal(await opened.page.locator("#status").textContent(), "Complete");assertNoBrowserErrors(opened.errors, "Sampled geographic Text");
        await opened.page.close();
      } finally { await context.close(); }
    }
  } catch (error) { if (browser) await saveBrowserEvidence(browser, error);throw error; }
  finally { await closeBrowserWithEvidence(browser);await server?.close();await rm(directory, { recursive: true, force: true }); }
});
