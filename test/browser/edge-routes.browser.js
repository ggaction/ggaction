import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) test(`edge route Canvas, SVG and actual worker agree at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/browser-host/?chart=edge-routes", server.baseUrl).href,
      { waitFor: () => !/^Loading/.test(document.querySelector("#status")?.textContent ?? "Loading") });
    const result = await page.evaluate(async ratio => {
      const { createEdgeRoutes } = await import("/examples/edge-routes/program.js");
      const { createEdgeRoutePrimitive } = await import("/test/charts/edge-routes/primitive.program.js");
      const { createGraphRouteExecutor, prepareGraphEdgeRoutes } = await import("/src/graph.js");
      const { render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const p = createEdgeRoutes(), primitive = createEdgeRoutePrimitive(), outputs = [];
      for (const backend of ["Canvas", "SVG"]) {
        const pixels = [];
        for (const program of [p, primitive]) {
          const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
          if (backend === "Canvas") render(program, ctx, { pixelRatio: ratio });
          else {
            canvas.width = 320 * ratio; canvas.height = 240 * ratio;
            const url = URL.createObjectURL(new Blob([renderToSVG(program)], { type: "image/svg+xml" }));
            try { const image = new Image(); image.src = url; await image.decode(); ctx.scale(ratio, ratio); ctx.drawImage(image, 0, 0); }
            finally { URL.revokeObjectURL(url); }
          }
          pixels.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
        }
        outputs.push({ backend, differences: pixels[0].reduce((n, value, i) => n + (value !== pixels[1][i] ? 1 : 0), 0), length: pixels[0].length });
      }
      const executor = createGraphRouteExecutor({ createWorker: () => new Worker("/examples/edge-routes/worker.js", { type: "module" }) }), workers = [];
      try {
        for (const method of ["edge-path", "force-directed", "density"]) {
          const prepared = await prepareGraphEdgeRoutes(p, { kind: "edit", target: "routes", method }, { requestToken: method, executor });
          const q = p.editEdgeRoute({ prepared, requestToken: method });
          workers.push({ method, same: renderToSVG(q) === renderToSVG(p.editEdgeRoute({ target: "routes", method })) });
        }
      } finally { executor.dispose(); }
      return { outputs, workers, label: document.querySelector("canvas").getAttribute("aria-label") };
    }, ratio);
    for (const output of result.outputs) { assert.equal(output.differences, 0, output.backend); assert.equal(output.length, 320 * 240 * ratio * ratio * 4); }
    assert.ok(result.workers.every(value => value.same), JSON.stringify(result.workers)); assert.ok(result.label);
    assertNoBrowserErrors(errors, "edge route output and workers"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
