import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("browser Canvas and SVG paint all three-channel legend samples without changing source marks", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-combined-legend-"));
  let browser, server;
  try {
    const bundle = await build({ stdin: { contents: `export {chart,render} from './src/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root },
      bundle: true, format: "esm", platform: "browser", write: false });
    await writeFile(path.join(directory, "module.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><p id="status">ready</p>');
    server = await startStaticServer(directory); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "ready" });
    const result = await opened.page.evaluate(async () => {
      const { chart, render, renderToSVG } = await import("/module.js");
      const cuts = [5, 10, 15, 20, 25];
      const source = chart().createCanvas({ width: 1000, height: 800, margin: 250 })
        .createData({ values: Array.from({ length: 30 }, (_, v) => ({ x: v, y: 0, v })) })
        .createScatterPlot({ id: "points", x: "x", y: "y", guides: false,
          point: { fill: "none", strokeWidth: 2, opacity: 0.7 },
          stroke: { field: "v", fieldType: "quantitative", scale: { type: "threshold", domain: cuts, range: ["red", "orange", "gold", "green", "blue", "purple"] } },
          size: { field: "v", scale: { type: "threshold", domain: cuts, range: [50, 100, 150, 200, 250, 300] } },
          shape: { field: "v", scale: { domain: cuts, range: ["circle", "square", "triangle-up", "cross", "diamond"], unknown: "circle" } } });
      const p = source.createLegend({ combine: "color-size-shape", values: [0, 5, 10, 15, 20, 25] });
      const canvas = document.createElement("canvas"), base = document.createElement("canvas");
      canvas.setAttribute("aria-label", "Threshold stroke, size and ordinal shape chart"); document.body.append(canvas);
      render(p, canvas.getContext("2d")); render(source, base.getContext("2d"));
      const actual = canvas.getContext("2d").getImageData(0, 0, 1000, 800).data;
      const before = base.getContext("2d").getImageData(0, 0, 1000, 800).data;
      let legendPixels = 0, plotDifferences = 0;
      for (let y = 0; y < 800; y++) for (let x = 0; x < 1000; x++) {
        const i = 4 * (y * 1000 + x);
        if (actual.slice(i, i + 4).some((v, j) => v !== before[i + j])) {
          if (x > 750) legendPixels++; else plotDifferences++;
        }
      }
      const svg = new DOMParser().parseFromString(renderToSVG(p), "image/svg+xml");
      return { legendPixels, plotDifferences, circles: svg.querySelectorAll("circle").length,
        paths: svg.querySelectorAll("path").length, parserErrors: svg.querySelectorAll("parsererror").length,
        types: p.graphicSpec.objects.colorSizeLegendSymbols.items.map(item => item.type),
        rows: p.semanticSpec.datasets[0].values.length, width: canvas.width, height: canvas.height };
    });
    assert.ok(result.legendPixels > 200, JSON.stringify(result));
    assert.equal(result.plotDifferences, 0); assert.equal(result.circles, 28); assert.equal(result.paths, 6);
    assert.equal(result.parserErrors, 0); assert.equal(result.rows, 30);
    assert.deepEqual(result.types, ["circle", "circle", "rect", "path", "path", "path"]);
    assert.equal(result.width, 1000); assert.equal(result.height, 800);
    assertNoBrowserErrors(opened.errors, "combined legend");
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); await rm(directory, { recursive: true, force: true }); }
});
