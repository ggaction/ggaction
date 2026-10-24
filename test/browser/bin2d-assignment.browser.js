import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { openBrowserPage, assertNoBrowserErrors, saveBrowserContextEvidence, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const name = process.env.GGACTION_BROWSER ?? "chromium", engines = { chromium, firefox, webkit };
assert.ok(Object.hasOwn(engines, name));
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Bin assignment</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server = await startStaticServer(consumer.directory);
  browser = await engines[name].launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });
for (const ratio of [1, 2]) {
  test(`${name} renders explicit step cells and byte-identical default edges at DPR ${ratio}`, async () => {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const { page, errors } = await openBrowserPage(context, server.baseUrl);
      const result = await page.evaluate(async ratio => {
        const { chart, render } = await import("/node_modules/ggaction/src/index.js");
        const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
        const { serializeProgram, deserializeProgram } = await import("/node_modules/ggaction/src/persistence.js");
        const source = chart().createCanvas({ width: 360, height: 220, margin: 20 }).createData({ values: [
          { x: -4.89, y: -4.67 }, { x: 0.6, y: 0.6 }, { x: 4.94, y: 4.67 }
        ] });
        const make = assignment => source.createHeatmap({ x: "x", y: "y", bin: {
          bins: { x: 50, y: 48 }, extent: { x: [-5, 5], y: [-4.8, 4.8] }, includeEmpty: false,
          ...(assignment ? { assignment } : {})
        }, guides: false });
        const records = {};
        for (const assignment of ["default", "edges", "step"]) {
          const program = make(assignment === "default" ? undefined : assignment);
          const restored = deserializeProgram(serializeProgram(program));
          const canvas = document.createElement("canvas");
          canvas.width = 360 * ratio; canvas.height = 220 * ratio;
          const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); render(program, ctx);
          const svg = renderToSVG(program);
          const image = new Image(); image.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          await image.decode();
          const svgCanvas = document.createElement("canvas"); svgCanvas.width = canvas.width; svgCanvas.height = canvas.height;
          svgCanvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(image.src);
          records[assignment] = { png: canvas.toDataURL(), svg, svgPng: svgCanvas.toDataURL(),
            cells: program.semanticSpec.datasets.at(-1).values.length,
            middleX: program.semanticSpec.datasets.at(-1).values[1].__heatmapBin2DData_x0,
            roundtrip: JSON.stringify(restored.graphicSpec) === JSON.stringify(program.graphicSpec),
            ink: ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0) };
        }
        return records;
      }, ratio);
      assert.deepEqual(result.default, result.edges);
      for (const record of Object.values(result)) { assert.equal(record.cells, 3); assert.equal(record.ink, true); assert.equal(record.roundtrip, true); }
      assert.equal(result.edges.middleX, 0.40000000000000036);
      assert.equal(result.step.middleX, 0.6000000000000005);
      assert.notEqual(result.edges.png, result.step.png);
      assert.notEqual(result.edges.svgPng, result.step.svgPng);
      assertNoBrowserErrors(errors, name);
      await page.close();
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
    finally { await context.close(); }
  });
}
