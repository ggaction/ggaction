import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser, server;
test.before(async () => {
  server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)));
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) test(`graph Canvas and SVG preserve primitive pixels at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/browser-host/?chart=graph-plots", server.baseUrl).href,
      { waitFor: () => !/^Loading/.test(document.querySelector("#status")?.textContent ?? "Loading") });
    const results = await page.evaluate(async ratio => {
      const { createGraph } = await import("/examples/graph-plots/program.js");
      const { createGraphPrimitive } = await import("/test/charts/graph-plots/primitive.program.js");
      const { render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const results = [];
      for (const id of ["directed", "parallel", "self-loop", "induced"]) {
        const programs = [createGraph(id), createGraphPrimitive(id)];
        for (const backend of ["Canvas", "SVG"]) {
          const pixels = [];
          for (const program of programs) {
            const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
            if (backend === "Canvas") render(program, ctx, { pixelRatio: ratio });
            else {
              canvas.width = 300 * ratio; canvas.height = 240 * ratio;
              const url = URL.createObjectURL(new Blob([renderToSVG(program)], { type: "image/svg+xml" }));
              try { const image = new Image(); image.src = url; await image.decode(); ctx.scale(ratio, ratio); ctx.drawImage(image, 0, 0); }
              finally { URL.revokeObjectURL(url); }
            }
            pixels.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
          }
          let differences = 0, ink = 0;
          for (let i = 0; i < pixels[0].length; i++) if (pixels[0][i] !== pixels[1][i]) differences++;
          for (let i = 0; i < pixels[0].length; i += 4) if (pixels[0][i + 3] > 0 && pixels[0][i] + pixels[0][i + 1] + pixels[0][i + 2] < 740) ink++;
          results.push({ id, backend, differences, ink, length: pixels[0].length });
        }
      }
      return results;
    }, ratio);
    for (const result of results) {
      assert.equal(result.differences, 0, `${result.id} ${result.backend}`);
      assert.ok(result.ink > 300 * ratio * ratio, `${result.id} ${result.backend} visible ink`);
      assert.equal(result.length, 300 * 240 * ratio * ratio * 4);
    }
    assertNoBrowserErrors(errors, "graph outputs"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
