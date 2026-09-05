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
    <canvas id="polar-components" aria-label="Polar axis component creation"></canvas>
    <canvas id="size-legend" aria-label="Edited standalone size legend"></canvas>
    <canvas id="shape-legend" aria-label="Shape legend after color removal"></canvas>
    <canvas id="bottom-legend" aria-label="Explicit bottom legend layout"></canvas>
    <canvas id="parallel-reencoded" aria-label="Reordered Parallel dimension axes"></canvas>
    <div id="svg"></div><div id="svg-resources"></div><script type="importmap">
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
      const resourceProgram = {
        graphicSpec: {
          objects: {
            canvas: {
              type: "canvas",
              properties: { width: 20, height: 10 }
            },
            strip: {
              type: "rect",
              properties: {
                x: 0,
                y: 0,
                width: 20,
                height: 10,
                fill: {
                  type: "linear-gradient",
                  from: { x: 0, y: 0 },
                  to: { x: 1, y: 0 },
                  stops: [
                    { offset: 0, color: "red" },
                    { offset: 1, color: "blue" }
                  ]
                },
                stroke: "none",
                strokeWidth: 0
              }
            }
          },
          order: ["canvas", "strip"]
        }
      };
      const resourceHost = document.querySelector("#svg-resources");
      resourceHost.innerHTML = ["ConsumerA", "ConsumerB"].map(
        resourceNamespace => renderToSVG(resourceProgram, { resourceNamespace })
      ).join("");
      const resourceSVGs = [...resourceHost.querySelectorAll("svg")];
      const resourceIds = resourceSVGs.map(
        svg => svg.querySelector("linearGradient").id
      );
      const resourceReferences = resourceSVGs.map(
        svg => svg.querySelector("rect").getAttribute("fill")
      );
      const polarComponents = chart()
        .createCanvas({ width: 300, height: 500, margin: 50 })
        .createData({ values: [{ angle: 0, value: 0 }, { angle: 1, value: 20 }] })
        .createPointMark().encodeTheta({ field: "angle" }).encodeR({ field: "value", scale: { zero: true } })
        .createRadialAxisTitle({ angle: 180, position: "outside", text: "Long radial title" })
        .createRadialAxisLabels({ count: 3 }).createRadialAxisTicks({ count: 3 }).createRadialAxisLine()
        .createThetaAxisLine().createThetaAxisTicks({ values: [0, 0.5] })
        .createThetaAxisLabels({ values: [0, 0.5] }).createThetaAxisTitle({ text: "Direction" });
      const polarCanvas = document.querySelector("#polar-components");
      render(polarComponents, polarCanvas.getContext("2d"));
      const partialPolar = polarComponents.editRadialAxis({ angle: 45, title: false, ticksAndLabels: false });
      render(partialPolar, polarCanvas.getContext("2d"));
      const emptyPolar = partialPolar.editRadialAxis({ line: false });
      const revisedParallel = chart().createCanvas({ width: 320, height: 260, margin: 50 })
        .createData({ values: [{ first: 1, second: 4 }, { first: 2, second: 3 }] })
        .createParallelCoordinates({ dimensions: ["first", "second"], guides: { legend: false } })
        .encodeParallelCoordinates({ dimensions: ["second", "first"] });
      const styledParallel = revisedParallel.removeParallelAxes().createParallelAxes()
        .editParallelAxis({ field: "first", title: { text: "Primary" }, line: { color: "#7c3aed", lineWidth: 3 }, ticks: false })
        .createParallelAxis({ field: "first", line: false, labels: false, title: false, ticks: {} })
        .removeParallelAxis({ field: "second" });
      render(styledParallel, document.getElementById("parallel-reencoded").getContext("2d"));
      const shapeLegend = chart().createCanvas({ width: 640, height: 420, margin: { right: 180 } })
        .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
        .createPointMark({ id: "shapePoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeShape({ field: "group" }).encodeColor({ field: "group" })
        .createLegend({ channels: ["color", "shape"] })
        .createLineMark({ id: "unrelatedLine" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .removeEncoding({ target: "shapePoints", channel: "color" });
      render(shapeLegend, document.getElementById("shape-legend").getContext("2d"));
      const bottomLegendBase = chart().createCanvas({ width: 640, height: 600,
        margin: { left: 60, right: 100, top: 40, bottom: 150 } })
        .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "B" }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
      const legacyBottomLegend = bottomLegendBase.createLegend({ channels: ["color"], position: "bottom", layout: "legacy-bottom" })
        .editLegendLabels({ color: "red" });
      const edgeBottomLegend = legacyBottomLegend.editLegendLayout({ layout: "edge" });
      render(edgeBottomLegend, document.getElementById("bottom-legend").getContext("2d"));
      const editedSizeLegend = chart().createCanvas({ width: 640, height: 420, margin: { right: 180 } })
        .createData({ values: [{ x: 1, y: 2, m: 10 }, { x: 2, y: 3, m: 30 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } })
        .createLegend({ channels: ["size"] }).editLegendSymbols({ count: 3 })
        .editLegendTitle({ title: "Mass" }).editLegendLabels({ fontWeight: 700 });
      const hiddenSizeLegend = editedSizeLegend.editLegendTitle({ title: false });
      render(editedSizeLegend, document.getElementById("size-legend").getContext("2d"));
      document.querySelector("#status").textContent = "complete";
      window.__ggactionConsumer = {
        legacyBottomYs: legacyBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y),
        edgeBottomYs: edgeBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y),
        bottomLegendSVG: renderToSVG(edgeBottomLegend).startsWith("<svg "),
        shapeLegendChannels: shapeLegend.semanticSpec.guides.legend.series.channels,
        shapeLegendItems: shapeLegend.graphicSpec.objects.seriesLegendSymbolPoints.items.length,
        shapeLegendSVG: renderToSVG(shapeLegend).startsWith("<svg "),
        sizeLegendRadii: editedSizeLegend.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties.radius),
        sizeLegendTitle: editedSizeLegend.graphicSpec.objects.sizeLegendTitle.properties.text,
        hiddenSizeTitle: !renderToSVG(hiddenSizeLegend).includes("Mass"),
        restoredSizeTitle: hiddenSizeLegend.editLegendTitle({ title: "auto" }).graphicSpec.objects.sizeLegendTitle.properties.text,
        polarCanvas: [polarCanvas.width, polarCanvas.height],
        polarRemovedTitle: !renderToSVG(partialPolar).includes("Long radial title"),
        parallelTitles: revisedParallel.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.text),
        parallelStyledTitle: styledParallel.graphicSpec.objects.parallelAxisTitles.items[0].properties.text,
        parallelStyledWidth: styledParallel.graphicSpec.objects.parallelAxisLines.items[0].properties.strokeWidth,
        parallelStyledSVG: renderToSVG(styledParallel).includes("Primary"),
        parallelFirstLabel: revisedParallel.graphicSpec.objects.parallelAxisLabels.items[0].properties.text,
        polarRemovedAxis: emptyPolar.semanticSpec.guides.axis?.radius === undefined &&
          emptyPolar.guideConfigs.axis?.radius === undefined,
        polarTitleY: polarComponents.graphicSpec.objects.radialAxisTitle.properties.y,
        polarSharedAngle: polarComponents.guideConfigs.axis.radius.layout.angle,
        polarSVGTitle: renderToSVG(polarComponents).includes("Long radial title"),
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
        svgPoints: svgHost.querySelectorAll("circle").length,
        svgResourceIds: resourceIds,
        svgResourceReferences: resourceReferences,
        svgResourceTargets: resourceSVGs.every((svg, index) =>
          svg.querySelector(
            "#" + resourceReferences[index].slice(5, -1)
          ) === svg.querySelector("linearGradient")
        )
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
    legacyBottomYs: [572, 572],
    edgeBottomYs: [489, 489],
    bottomLegendSVG: true,
    shapeLegendChannels: ["shape"],
    shapeLegendItems: 2,
    shapeLegendSVG: true,
    sizeLegendRadii: [2, Math.sqrt(20), 6],
    sizeLegendTitle: "Mass",
    hiddenSizeTitle: true,
    restoredSizeTitle: "m",
    polarCanvas: [300, 500],
    polarRemovedTitle: true,
    parallelTitles: ["second", "first"],
    parallelFirstLabel: "3",
    parallelStyledTitle: "Primary",
    parallelStyledWidth: 3,
    parallelStyledSVG: true,
    polarRemovedAxis: true,
    polarTitleY: 358,
    polarSharedAngle: 180,
    polarSVGTitle: true,
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
    svgPoints: 2,
    svgResourceIds: [
      "ggaction-gradient-ConsumerA-1",
      "ggaction-gradient-ConsumerB-1"
    ],
    svgResourceReferences: [
      "url(#ggaction-gradient-ConsumerA-1)",
      "url(#ggaction-gradient-ConsumerB-1)"
    ],
    svgResourceTargets: true
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
