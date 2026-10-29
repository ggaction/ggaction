import { saveBrowserContextEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
let directory, server, browser;
test.before(async () => {
  await mkdir(path.join(root, ".artifacts"), { recursive: true });
  directory = await mkdtemp(path.join(root, ".artifacts/plot-border-dom-"));
  await writeFile(path.join(directory, "index.html"), '<!doctype html><html><body><canvas aria-label="Plot border geometry"></canvas><div id="svg"></div><p id="status">Ready</p></body></html>');
  server = await startStaticServer(root, { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await rm(directory, { recursive: true, force: true });
});

for (const profile of ["Full", "Basic"]) {
  test(`${profile} plot borders preserve actual SVG outer edges and Canvas dimensions`, async () => {
    const context = await browser.newContext();
    let page;
    try {
      const opened = await openBrowserPage(context, server.baseUrl + path.relative(root, directory) + "/", {
        waitFor: () => document.querySelector("#status")?.textContent === "Ready"
      });
      page = opened.page;
      const records = await page.evaluate(async profile => {
        const { chart, render } = await import(profile === "Full" ? "/src/index.js" : "/src/basic.js");
        const { renderToSVG } = await import("/src/renderers/svg.js");
        const geometries = [
          { width: 700, height: 500, margin: { left: 100, right: 100, top: 100, bottom: 100 } },
          { width: 444, height: 536, margin: { left: 83, right: 11, top: 40, bottom: 146 } }
        ];
        const records = [];
        const color = "#123456", lineWidth = 2.5;
        function inspect(p, name, geometry, enabled) {
          const canvas = document.querySelector("canvas");
          render(p, canvas.getContext("2d"), { pixelRatio: 1 });
          const host = document.querySelector("#svg");
          host.innerHTML = renderToSVG(p);
          const frames = [...host.querySelectorAll("rect")].filter(node => node.getAttribute("stroke") === color);
          const edges = frames.map(node => {
            const b = node.getBBox(), stroke = parseFloat(getComputedStyle(node).strokeWidth);
            return [b.x - stroke / 2, b.y - stroke / 2,
              b.x + b.width + stroke / 2, b.y + b.height + stroke / 2];
          });
          records.push({ name, enabled, edges, geometry, count: frames.length,
            canvas: [canvas.width, canvas.height], label: canvas.getAttribute("aria-label"),
            hasGraphic: p.graphicSpec.objects.plotBorder !== undefined });
        }
        for (const geometry of geometries) {
          const scaffold = p => p.createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 0 }] })
            .createScatterPlot({ x: "x", y: "y", guides: false });
          const plain = scaffold(chart().createCanvas(geometry));
          inspect(plain, "default-off", geometry, false);
          const initial = scaffold(chart().createCanvas({ ...geometry, plotBorder: { color, lineWidth } }));
          inspect(initial, "initial", geometry, true);
          if (profile === "Full") {
            const late = plain.editCanvas({ plotBorder: { color, lineWidth } });
            inspect(late, "late", geometry, true);
            const resized = { width: geometry.width + 100, height: geometry.height + 50,
              margin: { ...geometry.margin, left: geometry.margin.left + 7, top: geometry.margin.top + 9 } };
            inspect(late.editCanvas({ width: resized.width, height: resized.height,
              margin: { left: resized.margin.left, top: resized.margin.top } }), "resized", resized, true);
            inspect(late.editCanvas({ plotBorder: false }), "removed", geometry, false);
          }
        }
        document.querySelector("#status").textContent = "Checked";
        return records;
      }, profile);
      for (const record of records) {
        assert.equal(record.count, record.enabled ? 1 : 0, record.name);
        assert.equal(record.hasGraphic, record.enabled, record.name);
        assert.deepEqual(record.canvas, [record.geometry.width, record.geometry.height]);
        assert.equal(record.label, "Plot border geometry");
        if (record.enabled) {
          const { width, height, margin } = record.geometry;
          const expected = [margin.left, margin.top, width - margin.right, height - margin.bottom];
          record.edges[0].forEach((edge, index) => assert.ok(Math.abs(edge - expected[index]) < 1e-8,
            JSON.stringify({ profile, name: record.name, actual: record.edges[0], expected })));
          if (width === 444 && height === 536) assert.deepEqual(record.edges[0], [83, 40, 433, 390]);
        }
      }
      assertNoBrowserErrors(opened.errors, `${profile} plot borders`);
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally {
      await page?.close();
      await context.close();
    }
  });
}
