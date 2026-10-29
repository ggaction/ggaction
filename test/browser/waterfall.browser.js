import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser;
test.before(async () => { server = await startStaticServer(root); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const id of ["contributions", "labels", "no-connectors"]) test(`waterfall ${id} matches primitive Canvas and SVG at both device densities`, async () => {
  for (const ratio of [1, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const opened = await openBrowserPage(context, `${server.baseUrl}examples/waterfall/`, { waitFor: () => window.__ggactionExample !== undefined });
      const result = await opened.page.evaluate(async ({ id, ratio }) => {
        const { createWaterfall } = await import("/examples/waterfall/program.js");
        const { createWaterfallPrimitive } = await import("/test/charts/waterfall/primitive.program.js");
        const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
        const programs = [createWaterfallPrimitive({ labels: id === "labels", connectors: id !== "no-connectors" }), createWaterfall(id)], result = [];
        for (const backend of ["Canvas", "SVG"]) {
          const outputs = [];
          for (const p of programs) {
            const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
            if (backend === "Canvas") render(p, ctx, { pixelRatio: ratio });
            else {
              canvas.width = 500 * ratio; canvas.height = 320 * ratio;
              const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(p))}`;
              await image.decode(); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            }
            outputs.push({ pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height });
          }
          let mismatches = 0, ink = 0;
          for (let i = 0; i < outputs[0].pixels.length; i++) if (outputs[0].pixels[i] !== outputs[1].pixels[i]) mismatches++;
          for (let y = 40 * ratio; y < 280 * ratio; y++) for (let x = 40 * ratio; x < 460 * ratio; x++) {
            const i = (y * outputs[1].width + x) * 4, p = outputs[1].pixels;
            if (Math.min(p[i], p[i + 1], p[i + 2]) < 220) ink++;
          }
          result.push({ backend, mismatches, ink, width: outputs[1].width, height: outputs[1].height });
        }
        return result;
      }, { id, ratio });
      for (const value of result) {
        assert.equal(value.mismatches, 0, JSON.stringify({ id, ratio, ...value }));
        assert.ok(value.ink > 1000 * ratio * ratio);
        assert.equal(value.width, 500 * ratio); assert.equal(value.height, 320 * ratio);
      }
      assertNoBrowserErrors(opened.errors, `Waterfall ${id}`); await opened.page.close();
    } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
    finally { await context.close(); }
  }
});
