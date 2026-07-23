import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright";

import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import {
  assertNoBrowserErrors,
  openBrowserPage,
  windowValue
} from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser;
let consumer;
let server;

test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), `<!doctype html>
    <html><body><p id="status">loading</p>
    <canvas id="chart" aria-label="Encoding removal lifecycle chart"></canvas>
    <canvas id="legend" aria-label="Legend lifecycle chart"></canvas>
    <canvas id="axis" aria-label="Axis component lifecycle chart"></canvas>
    <canvas id="bin2d" aria-label="2D bin lifecycle chart"></canvas>
    <canvas id="basic" aria-label="Basic entry scatterplot"></canvas>
    <div id="svg"></div><script type="importmap">
    {"imports":{"ggaction":"/node_modules/ggaction/src/index.js","ggaction/basic":"/node_modules/ggaction/src/basic.js","ggaction/svg":"/node_modules/ggaction/src/renderers/svg.js"}}
    </script><script type="module">
      import { chart, render } from "ggaction";
      import { chart as basicChart, render as basicRender } from "ggaction/basic";
      import { renderToSVG } from "ggaction/svg";
      const program = chart()
        .createCanvas({ width: 160, height: 120, margin: 20 })
        .createData({ values: [
          { x: 1, y: 2, group: "A", amount: 4 },
          { x: 2, y: 4, group: "B", amount: 16 }
        ] })
        .createPointMark({ stroke: "black", strokeWidth: 2 })
        .encodeX({ field: "x" })
        .encodeY({ field: "y" })
        .encodeColor({ field: "group" })
        .encodeSize({ field: "amount" })
        .removeEncoding({ channel: "size" })
        .removeEncoding({ channel: "color" })
        .editPointMark({ stroke: false })
        .selectMarks({ id: "focus", field: "x", op: "max" })
        .highlightMarks({
          selection: "focus",
          color: "#dc2626",
          dimOthers: { opacity: 0.2 }
        })
        .editMarkSelection({ selection: "focus", field: "x", op: "min" })
        .removeMarkSelection({ selection: "focus" });
      const editedLegend = chart()
        .createCanvas({
          width: 160,
          height: 120,
          margin: { top: 10, right: 80, bottom: 20, left: 20 }
        })
        .createData({ values: [
          { x: 1, y: 2, group: "A", weight: 2 },
          { x: 2, y: 4, group: "A", weight: 2 },
          { x: 1, y: 3, group: "B", weight: 8 },
          { x: 2, y: 5, group: "B", weight: 8 }
        ] })
        .createLineMark({ id: "weightedLines" })
        .encodeX({ field: "x" })
        .encodeY({ field: "y" })
        .encodeGroup({ field: "group" })
        .encodeStrokeWidth({ field: "weight", scale: { range: [1, 7] } })
        .createLegend({ channels: ["strokeWidth"] })
        .editLegend({
          count: 3,
          title: "Weight",
          labels: { color: "#123456" }
        });
      const removedLegend = editedLegend.removeLegend({
        channels: ["strokeWidth"]
      });
      const editedAxes = chart()
        .createCanvas({ width: 240, height: 180, margin: 50 })
        .createData({ values: [{ x: 0, y: 2 }, { x: 10, y: 8 }] })
        .createPointMark({ id: "axisPoints" })
        .encodeX({ field: "x" })
        .encodeY({ field: "y" })
        .createAxes()
        .editXAxis({ ticksAndLabels: false })
        .editYAxis({ line: false, title: false });
      const editedBins = chart()
        .createCanvas({ width: 200, height: 140, margin: 30 })
        .createData({ id: "samples", values: [
          { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }
        ] })
        .createBin2DData({
          id: "cells",
          x: "x",
          y: "y",
          bins: 2,
          extent: { x: [0, 3], y: [0, 3] },
          includeEmpty: true,
          as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
        })
        .createRectMark({ id: "cellRects", data: "cells" })
        .encodeX({ target: "cellRects", field: "x0" })
        .encodeX2({ target: "cellRects", field: "x1" })
        .encodeY({ target: "cellRects", field: "y0" })
        .encodeY2({ target: "cellRects", field: "y1" })
        .encodeColor({ target: "cellRects", field: "count", fieldType: "quantitative" })
        .editBin2DData({ target: "cells", bins: 1, includeEmpty: false });
      const basicProgram = basicChart()
        .createCanvas({ width: 160, height: 120, margin: 20 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false });
      const canvas = document.querySelector("#chart");
      render(program, canvas.getContext("2d"));
      const legendCanvas = document.querySelector("#legend");
      render(editedLegend, legendCanvas.getContext("2d"));
      const axisCanvas = document.querySelector("#axis");
      render(editedAxes, axisCanvas.getContext("2d"));
      const bin2dCanvas = document.querySelector("#bin2d");
      render(editedBins, bin2dCanvas.getContext("2d"));
      const basicCanvas = document.querySelector("#basic");
      basicRender(basicProgram, basicCanvas.getContext("2d"));
      const svgHost = document.querySelector("#svg");
      svgHost.innerHTML = renderToSVG(program, {
        title: "Packed SVG chart",
        description: "Two concrete points"
      });
      document.querySelector("#status").textContent = "complete";
      window.__ggactionConsumer = {
        width: canvas.width,
        height: canvas.height,
        points: program.graphicSpec.objects.point.items.length,
        radii: program.graphicSpec.objects.point.items.map(
          item => item.properties.radius
        ),
        fills: program.graphicSpec.objects.point.items.map(
          item => item.properties.fill
        ),
        strokeWidths: program.graphicSpec.objects.point.items.map(
          item => item.properties.strokeWidth
        ),
        removedChannels: ["size", "color"].every(
          channel => program.semanticSpec.layers[0].encoding[channel] === undefined
        ),
        selectionRemoved:
          program.materializationConfigs.selections === undefined &&
          program.materializationConfigs.highlights === undefined,
        legendCanvas: [legendCanvas.width, legendCanvas.height],
        legendCount: editedLegend.guideConfigs.legend.strokeWidth.count,
        legendTitle:
          editedLegend.graphicSpec.objects.strokeWidthLegendTitle.properties.text,
        legendLabelColor:
          editedLegend.graphicSpec.objects.strokeWidthLegendLabels.items[0]
            .properties.fill,
        selectiveLegendRemoved:
          removedLegend.guideConfigs.legend === undefined &&
          removedLegend.graphicSpec.objects.strokeWidthLegendSymbols === undefined &&
          removedLegend.semanticSpec.layers[0].encoding.strokeWidth !== undefined,
        axisCanvas: [axisCanvas.width, axisCanvas.height],
        axisComponentsRemoved:
          editedAxes.graphicSpec.objects.xAxisTicks === undefined &&
          editedAxes.graphicSpec.objects.xAxisLabels === undefined &&
          editedAxes.graphicSpec.objects.yAxisLine === undefined &&
          editedAxes.graphicSpec.objects.yAxisTitle === undefined,
        axisComponentsRetained:
          editedAxes.graphicSpec.objects.xAxisLine !== undefined &&
          editedAxes.graphicSpec.objects.xAxisTitle !== undefined &&
          editedAxes.graphicSpec.objects.yAxisTicks !== undefined &&
          editedAxes.graphicSpec.objects.yAxisLabels !== undefined,
        bin2dCanvas: [bin2dCanvas.width, bin2dCanvas.height],
        bin2dRevision: editedBins.materializationConfigs.data.bin2d.cells.current,
        bin2dItems: editedBins.graphicSpec.objects.cellRects.items.length,
        bin2dRebound:
          editedBins.semanticSpec.layers[0].data ===
          editedBins.materializationConfigs.data.bin2d.cells.current,
        basicCanvas: [basicCanvas.width, basicCanvas.height],
        basicPoints: basicProgram.graphicSpec.objects.scatterPlot.items.length,
        basicExcludesRegression: basicProgram.createRegression === undefined,
        svgViewBox: svgHost.querySelector("svg").getAttribute("viewBox"),
        svgTitle: svgHost.querySelector("title").textContent,
        svgDescription: svgHost.querySelector("desc").textContent,
        svgPoints: svgHost.querySelectorAll("circle").length
      };
    </script></body></html>`);
  server = await startStaticServer(consumer.directory);
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await server?.close();
  await consumer?.cleanup();
});

test("imports and renders the packed browser entries", async () => {
  const { page, errors } = await openBrowserPage(browser, server.baseUrl, {
    waitFor: () => window.__ggactionConsumer !== undefined
  });
  assert.deepEqual(await windowValue(page, "__ggactionConsumer"), {
    width: 160,
    height: 120,
    points: 2,
    radii: [3, 3],
    fills: ["#4c78a8", "#4c78a8"],
    strokeWidths: [0, 0],
    removedChannels: true,
    selectionRemoved: true,
    legendCanvas: [160, 120],
    legendCount: 3,
    legendTitle: "Weight",
    legendLabelColor: "#123456",
    selectiveLegendRemoved: true,
    axisCanvas: [240, 180],
    axisComponentsRemoved: true,
    axisComponentsRetained: true,
    bin2dCanvas: [200, 140],
    bin2dRevision: "cellsBin2DDataRevision1",
    bin2dItems: 1,
    bin2dRebound: true,
    basicCanvas: [160, 120],
    basicPoints: 2,
    basicExcludesRegression: true,
    svgViewBox: "0 0 160 120",
    svgTitle: "Packed SVG chart",
    svgDescription: "Two concrete points",
    svgPoints: 2
  });
  assert.equal(await page.locator("#status").textContent(), "complete");
  assert.equal(
    await page.locator("#chart").getAttribute("aria-label"),
    "Encoding removal lifecycle chart"
  );
  assert.equal(
    await page.locator("#legend").getAttribute("aria-label"),
    "Legend lifecycle chart"
  );
  assert.equal(
    await page.locator("#axis").getAttribute("aria-label"),
    "Axis component lifecycle chart"
  );
  assert.equal(
    await page.locator("#bin2d").getAttribute("aria-label"),
    "2D bin lifecycle chart"
  );
  assert.equal(
    await page.locator("#basic").getAttribute("aria-label"),
    "Basic entry scatterplot"
  );
  assertNoBrowserErrors(errors, "packed consumer");
  await page.close();
});
