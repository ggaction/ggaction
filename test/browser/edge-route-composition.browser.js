import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { routeMethods } from "../../examples/edge-routes/data.js";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

let browser, server;
test.before(async () => {
  server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const family of routeMethods) test(`${family} retains its complete route pixels while the paired analytical scale and legend change`, async () => {
  for (const ratio of [1, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const opened = await openBrowserPage(context, `${server.baseUrl}examples/program-composition/`);
      const outputs = await opened.page.evaluate(async ({ family, ratio }) => {
        const { createEdgeRouteComparison, reviseEdgeRouteComparison } = await import("/examples/edge-routes/comparison.js");
        const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
        const { serializeProgram, deserializeProgram } = await import("/src/persistence.js");
        const original = createEdgeRouteComparison(family);
        const changed = original.encodeColor({ target: { childPath: ["analysis"], id: "values" }, field: "alternative" })
          .editScale({ target: { childPath: ["analysis"] }, id: "measure", domain: [0, 20] });
        const revised = reviseEdgeRouteComparison(changed), restored = deserializeProgram(serializeProgram(revised));
        const width = original.graphicSpec.objects.canvas.properties.width, height = original.graphicSpec.objects.canvas.properties.height;
        const results = [];
        for (const backend of ["Canvas", "SVG"]) {
          const samples = [];
          for (const program of [original, changed, revised, restored]) {
            const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
            if (backend === "Canvas") render(program, ctx, { pixelRatio: ratio });
            else {
              canvas.width = width * ratio; canvas.height = height * ratio;
              const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(program))}`;
              await image.decode(); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            }
            samples.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
          }
          let resourceDifference = 0, analyticalDifference = 0, revisionDifference = 0, restoreDifference = 0, resourceInk = 0;
          for (let i = 0; i < samples[0].length; i += 4) {
            const resource = (i / 4) % (width * ratio) < 320 * ratio;
            if (resource && samples[0][i + 3] && samples[0][i] < 220) resourceInk++;
            for (let j = 0; j < 4; j++) {
              if (samples[0][i+j] !== samples[1][i+j]) { if (resource) resourceDifference++; else analyticalDifference++; }
              if (samples[1][i+j] !== samples[2][i+j]) revisionDifference++;
              if (samples[2][i+j] !== samples[3][i+j]) restoreDifference++;
            }
          }
          results.push({ backend, resourceDifference, analyticalDifference, revisionDifference, restoreDifference, resourceInk });
        }
        return results;
      }, { family, ratio });
      for (const result of outputs) {
        const label = JSON.stringify({ family, ratio, ...result });
        assert.equal(result.resourceDifference, 0, label); assert.equal(result.restoreDifference, 0, label);
        assert.ok(result.analyticalDifference > 100, label); assert.ok(result.revisionDifference > 100, label);
        assert.ok(result.resourceInk > 100, label);
      }
      assertNoBrowserErrors(opened.errors, family);
    } finally { await context.close(); }
  }
});
