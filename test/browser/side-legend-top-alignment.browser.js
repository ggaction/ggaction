import { saveBrowserContextEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const families = ["color", "series", "stroke", "gradient", "strokeGradient", "interval", "strokeInterval", "size", "opacity", "strokeWidth"];
let directory, server, browser;

test.before(async () => {
  await mkdir(path.join(root, ".artifacts"), { recursive: true });
  directory = await mkdtemp(path.join(root, ".artifacts/side-legend-dom-"));
  await writeFile(path.join(directory, "index.html"), '<!doctype html><html><body><canvas aria-label="Side legend geometry"></canvas><div id="svg"></div><p id="status">Ready</p></body></html>');
  server = await startStaticServer(root, { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await rm(directory, { recursive: true, force: true });
});

for (const family of [...families, "multi", "shared-color", "shared-gradient", "shared-interval", "shared-multi", "shared-inferred"]) {
  test(`side ${family} legends align actual SVG bounds with the plot and render to Canvas`, async () => {
    const context = await browser.newContext();
    let page;
    try {
      const opened = await openBrowserPage(context, server.baseUrl + path.relative(root, directory) + "/", {
        waitFor: () => document.querySelector("#status")?.textContent === "Ready"
      });
      page = opened.page;
      const records = await page.evaluate(async requestedKind => {
        const { chart, render } = await import("/src/index.js");
        const { renderToSVG } = await import("/src/renderers/svg.js");
        const { resolveGraphicBounds } = await import("/src/layout/canvas.js");
        const { namespaceGraphicId } = await import("/src/materialization/compositionSnapshot.js");
        const shared = requestedKind.startsWith("shared-");
        const kind = shared ? requestedKind.slice(7) : requestedKind;
        const records = [];
        for (const position of ["left", "right"]) for (const top of [0, 200]) {
          if (kind === "inferred" && position === "left") continue;
          for (const border of kind === "inferred" ? [false] : [false, true]) {
            for (const appearance of kind === "inferred" ? ["default"] : ["default", "hidden", "large"]) {
            let p = chart().createCanvas({ width: 1400, height: 1500,
              margin: { left: 500, right: 500, top, bottom: 200 } })
              .createData({ values: [{ x: 0, y: 0, m: 1, g: "A", panel: "P" }, { x: 10, y: 10, m: 10, g: "B", panel: "P" },
                { x: 0, y: 0, m: 1, g: "A", panel: "Q" }, { x: 10, y: 10, m: 10, g: "B", panel: "Q" }] });
            p = kind === "strokeWidth" ? p.createLineMark() : p.createPointMark();
            p = p.encodeX({ field: "x" }).encodeY({ field: "y" });
            if (kind === "strokeWidth") p = p.encodeGroup({ field: "g" }).encodeStrokeWidth({ field: "m" });
            else if (["color", "multi", "inferred"].includes(kind)) p = p.encodeColor({ field: "g" });
            else if (kind === "series") p = p.encodeShape({ field: "g" });
            else if (kind === "stroke") p = p.encodeStroke({ field: "g" });
            else if (["gradient", "strokeGradient", "interval", "strokeInterval"].includes(kind)) {
              const channel = kind.startsWith("stroke") ? "encodeStroke" : "encodeColor";
              p = p[channel]({ field: "m", fieldType: "quantitative",
                ...(kind.endsWith("nterval") ? { scale: { type: "quantize", range: ["red", "blue"] } } : {}) });
            } else p = p[kind === "size" ? "encodeSize" : "encodeOpacity"]({ field: "m" });
            const options = { position, border,
              ...(appearance === "hidden" ? { title: false } : {}),
              ...(appearance === "large" ? { titleStyle: { fontSize: 50 }, labels: { fontSize: 30 } } : {}) };
            if (kind === "multi") {
              p = p.encodeSize({ field: "m" }).encodeOpacity({ field: "m" })
                .createLegend({ ...options, channels: ["color"] })
                .createLegend({ ...options, channels: ["size"], count: 3 })
                .createLegend({ ...options, channels: ["opacity"], count: 3 });
            } else if (kind !== "inferred") p = p.createLegend(options);
            let plotTop = top;
            if (shared) {
              p = p.facet({ field: "panel", columns: 2, spacing: "plot", padding: { top: 50 }, guides: { legend: "shared" } });
              plotTop = Math.min(...p.compositionSpec.children.map(id => {
                const child = resolveGraphicBounds(p.children[id]);
                return child.y + p.graphicSpec.objects[namespaceGraphicId(`facet-${id}`, "canvas")].properties.y;
              }));
            } else if (top === 200 && appearance === "default") p = p.createTitle({ text: "Separate chart heading" });
            const canvas = document.querySelector("canvas");
            render(p, canvas.getContext("2d"), { pixelRatio: 1 });
            const ids = shared ? [kind === "inferred" ? "facet-legend" : "facet-shared-legend"]
              : Object.keys(p.graphicSpec.objects).filter(id => id.includes("Legend") || id.startsWith("colorGradient") || id.startsWith("strokeGradient") || id.startsWith("strokeInterval"));
            const dimensions = p.graphicSpec.objects.canvas.properties;
            const reachable = new Set();
            function include(id) {
              reachable.add(id);
              for (const child of p.graphicSpec.objects[id].children ?? []) include(child);
            }
            for (const id of ids) include(id);
            const scene = { graphicSpec: { order: ["canvas"], objects: {
              ...Object.fromEntries([...reachable].map(id => [id, p.graphicSpec.objects[id]])),
              canvas: { type: "canvas", properties: { ...dimensions, background: "transparent" }, children: ids }
            } } };
            const host = document.querySelector("#svg");
            host.innerHTML = renderToSVG(scene);
            await document.fonts.ready;
            const svg = host.querySelector("svg");
            const boxes = [...svg.querySelectorAll("text,rect,circle,line,path")].flatMap(element => {
              const style = getComputedStyle(element);
              const paintedFill = style.fill !== "none" && style.fill !== "transparent" && !style.fill.endsWith(", 0)");
              const paintedStroke = style.stroke !== "none" && style.stroke !== "transparent" && +style.strokeWidth.replace("px", "") > 0;
              if (!paintedFill && !paintedStroke) return [];
              const box = element.getBBox();
              const matrix = element.getCTM();
              const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
                .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
              const extent = paintedStroke ? parseFloat(style.strokeWidth) / 2 : 0;
              return [{ top: Math.min(...corners.map(p => p.y)) - extent, bottom: Math.max(...corners.map(p => p.y)) + extent }];
            });
            records.push({ position, top: plotTop, border, appearance, occupiedTop: Math.min(...boxes.map(b => b.top)),
              occupiedBottom: Math.max(...boxes.map(b => b.bottom)), elements: boxes.length,
              canvas: [canvas.width, canvas.height], dimensions: [dimensions.width, dimensions.height], label: canvas.getAttribute("aria-label") });
            }
          }
        }
        document.querySelector("#status").textContent = "Checked";
        return records;
      }, family);
      for (const record of records) {
        assert.ok(record.elements > 0, JSON.stringify(record));
        assert.ok(Math.abs(record.occupiedTop - record.top) < 0.01, JSON.stringify({ family, ...record }));
        assert.ok(record.occupiedBottom <= record.dimensions[1], JSON.stringify(record));
        assert.deepEqual(record.canvas, record.dimensions);
        assert.equal(record.label, "Side legend geometry");
      }
      assertNoBrowserErrors(opened.errors, `side ${family} legend bounds`);
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally {
      await page?.close();
      await context.close();
    }
  });
}
