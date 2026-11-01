import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

let browser, server;
test.before(async () => {
  server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

test("graticule and analytical pixels change only after their explicit scoped edits", async () => {
  for (const ratio of [1, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const opened = await openBrowserPage(context, `${server.baseUrl}examples/program-composition/`);
      const outputs = await opened.page.evaluate(async ({ ratio }) => {
        const { createGraticuleComparison, refreshGraticuleComparison } = await import("/examples/geographic-marks/comparison.js");
        const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
        const { serializeProgram, deserializeProgram } = await import("/src/persistence.js");
        const original = createGraticuleComparison();
        const changed = original.encodeColor({ target: { childPath: ["analysis"], id: "values" }, field: "sign" })
          .editScale({ target: { childPath: ["analysis"] }, id: "degrees", domain: [-80, 80] });
        const moved = changed.editProjection({ target: { childPath: ["grid"], id: "map" }, translatePx: [325, 247] })
          .editGraticule({ target: { childPath: ["grid"], id: "graticule" }, stepDeg: [20, 20] });
        const revised = refreshGraticuleComparison(moved), restored = deserializeProgram(serializeProgram(revised));
        const width = original.graphicSpec.objects.canvas.properties.width, height = original.graphicSpec.objects.canvas.properties.height;
        const results = [];
        for (const backend of ["Canvas", "SVG"]) {
          const samples = [];
          for (const program of [original, changed, moved, revised, restored]) {
            const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
            if (backend === "Canvas") render(program, ctx, { pixelRatio: ratio });
            else {
              canvas.width = width * ratio; canvas.height = height * ratio;
              const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(program))}`;
              await image.decode(); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            }
            samples.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
          }
          let resourceDifference = 0, analyticalDifference = 0, gridEditDifference = 0, unrefreshedAnalysisDifference = 0, refreshGridDifference = 0, revisionDifference = 0, restoreDifference = 0, resourceInk = 0;
          for (let i = 0; i < samples[0].length; i += 4) {
            const resource = (i / 4) % (width * ratio) < 640 * ratio;
            if (resource && samples[0][i + 3] && samples[0][i] < 220) resourceInk++;
            for (let j = 0; j < 4; j++) {
              if (samples[0][i+j] !== samples[1][i+j]) { if (resource) resourceDifference++; else analyticalDifference++; }
              if (samples[1][i+j] !== samples[2][i+j]) { if (resource) gridEditDifference++; else unrefreshedAnalysisDifference++; }
              if (samples[2][i+j] !== samples[3][i+j]) { if (resource) refreshGridDifference++; else revisionDifference++; }
              if (samples[3][i+j] !== samples[4][i+j]) restoreDifference++;
            }
          }
          results.push({ backend, resourceDifference, analyticalDifference, gridEditDifference, unrefreshedAnalysisDifference, refreshGridDifference, revisionDifference, restoreDifference, resourceInk });
        }
        return results;
      }, { ratio });
      for (const result of outputs) {
        const label = JSON.stringify({ ratio, ...result });
        assert.equal(result.resourceDifference, 0, label); assert.equal(result.restoreDifference, 0, label);
        assert.ok(result.analyticalDifference > 100, label); assert.ok(result.revisionDifference > 100, label);
        assert.ok(result.resourceInk > 100, label); assert.ok(result.gridEditDifference > 100, label);
        assert.equal(result.unrefreshedAnalysisDifference, 0, label); assert.equal(result.refreshGridDifference, 0, label);
      }
      assertNoBrowserErrors(opened.errors, "graticule comparison");
    } finally { await context.close(); }
  }
});
