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
    <canvas id="legend-content" aria-label="Explicit color and size legend content"></canvas>
    <canvas id="source-text-scale" aria-label="Labels follow updated source scale"></canvas>
    <canvas id="text-datum" aria-label="Constant text in data coordinates"></canvas>
    <canvas id="annotation" aria-label="Annotation facade at a data coordinate"></canvas>
    <canvas id="reference-facades" aria-label="Reference line and shaded plot interval"></canvas>
    <canvas id="reference-rect" aria-label="Constant interval shading"></canvas>
    <canvas id="semantic-labels" aria-label="Pie shares from final source items"></canvas>
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
          width: 800,
          height: 700,
          margin: 200
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
          position: "top", columns: 2, border: true,
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
      const replayBase = chart().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
        .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "A" },
          { x: 1, y: 3, g: "B" }, { x: 2, y: 4, g: "B" }] })
        .createPointMark({ id: "replayPoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "g" }).encodeShape({ field: "g" }).createLegend({ target: "replayPoints" });
      const replayAdded = replayBase.createLineMark({ id: "replayLine" }).encodeX({ field: "x" })
        .encodeY({ field: "y" }).encodeGroup({ field: "g" }).encodeColor({ field: "g" });
      const replayRemoved = replayAdded.removeMark({ target: "replayLine" });
      render(replayAdded, document.getElementById("shape-legend").getContext("2d"));
      const legendContentBase = chart().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
        .createData({ values: [{ x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "B", m: 9 }] })
        .createPointMark({ id: "contentPoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
      const intervalTop = legendContentBase.editCanvas({ margin: { left: 80, right: 80, top: 200, bottom: 200 } })
        .encodeColor({ field: "m", fieldType: "quantitative", scale: { id: "intervalColor", type: "quantize", range: ["red", "blue"] } })
        .createLegend({ channels: ["color"], position: "top", layout: "edge", columns: 2 });
      const onlyColorContent = legendContentBase.createLegend({ channels: ["color"] });
      const colorSizeContent = legendContentBase.createLegend({ channels: ["color", "size"], count: 3 });
      const horizontalCombined = legendContentBase.editCanvas({ width: 1000, height: 800, margin: 250 })
        .createLegend({ channels: ["color", "size"], position: "top", count: 3, offset: 30, itemGap: 20, border: true })
        .editLegendLayout({ position: "bottom" });
      render(horizontalCombined, document.getElementById("legend-content").getContext("2d"));
      const guideSource = chart().createCanvas({ width: 1200, height: 1000, margin: 300 })
        .createData({ values: [{ x: 0, y: 0, m: 0 }, { x: 10, y: 10, m: 10 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "m", fieldType: "quantitative" }).encodeOpacity({ field: "m" });
      const occupiedAlignment = [];
      let ignoredOptionRejects = 0;
      const gradientTitleParity = [];
      for (const position of ["top", "bottom"]) for (const align of ["left", "center", "right"]) {
        const program = guideSource.createLegend({ channels: ["color"], position, align, offset: 40, border: true });
        for (const attempt of [
          () => guideSource.createLegend({ channels: ["color"], position: "left", align: "right" }),
          () => guideSource.createLegend({ channels: ["opacity"], position: "right", align: "left" }),
          () => program.editLegend({ titleStyle: { offset: 10 } })
        ]) {
          try { attempt(); } catch (error) {
            if (/center alignment|titleStyle.*offset/.test(error.message)) ignoredOptionRejects += 1;
            else throw error;
          }
        }
        gradientTitleParity.push(renderToSVG(program.editLegendLayout({ titlePosition: "top" })) === renderToSVG(program));
        const border = program.graphicSpec.objects.colorGradientBackground.properties;
        const left = border.x - border.strokeWidth / 2;
        const right = border.x + border.width + border.strokeWidth / 2;
        const actual = align === "left" ? left : align === "right" ? right : (left + right) / 2;
        const nearEdge = position === "top" ? border.y + border.height + border.strokeWidth / 2
          : border.y - border.strokeWidth / 2;
        occupiedAlignment.push(Math.abs(actual - ({ left: 300, center: 600, right: 900 }[align])) < 1e-9 &&
          nearEdge === (position === "top" ? 260 : 740) && renderToSVG(program).startsWith("<svg "));
        render(program, document.getElementById("legend-content").getContext("2d"));
      }
      const itemStrokeGaps = [];
    for (const kind of ["interval", "strokeWidth"]) for (const position of ["left", "right", "top", "bottom"]) {
      let source = chart().createCanvas({ width: 1600, height: 1200, margin: 400 })
        .createData({ values: [{x:0,y:0,m:0,g:"A"},{x:1,y:1,m:0,g:"A"},{x:2,y:2,m:10,g:"B"},{x:3,y:3,m:10,g:"B"}] });
      source = kind === "interval" ? source.createPointMark() : source.createLineMark();
      source = source.encodeX({field:"x"}).encodeY({field:"y"});
      source = kind === "interval" ? source.encodeColor({field:"m",fieldType:"quantitative",scale:{type:"quantize",range:["red","blue"]}})
        : source.encodeGroup({field:"g"}).encodeStrokeWidth({field:"m",scale:{range:[2,60]}});
      const p = source.createLegend({position,...(kind === "interval"?{symbol:{stroke:"black",strokeWidth:40}}:{count:2})});
      const prefix = kind === "interval" ? "colorLegend" : "strokeWidthLegend";
      const symbol = p.graphicSpec.objects[prefix+"Symbols"].items.at(-1).properties;
      const label = p.graphicSpec.objects[prefix+"Labels"].items.at(-1).properties;
      const gap = label.x - (kind === "interval" ? symbol.x + symbol.width : symbol.x2) - symbol.strokeWidth / 2;
      itemStrokeGaps.push(Math.round(gap * 1e8) / 1e8);
      if (!renderToSVG(p).startsWith("<svg ")) throw new Error("Item legend SVG missing");
      render(p, document.getElementById("legend-content").getContext("2d"));
    }
      const categoricalSideOptions = [];
      for (const factory of [chart, basicChart]) for (const position of ["left", "right"]) {
        const source = factory().createCanvas({ width: 1600, height: 1200, margin: 400 })
          .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "B" }] })
          .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
        const p = source.createLegend({ position, columns: 1 });
        let rejected = 0;
        for (const patch of [{ direction: "horizontal" }, { columns: 2 }, { titlePosition: "left" }]) {
          try { source.createLegend({ position, ...patch }); } catch { rejected++; }
        }
        categoricalSideOptions.push([p.guideConfigs.legend.color.direction, rejected, renderToSVG(p).startsWith("<svg ")]);
        render(p, document.getElementById("legend-content").getContext("2d"));
      }
      const categoricalSampleGaps = [];
    for (const factory of [chart, basicChart]) for (const kind of ["color", "line"]) {
      for (const position of ["left", "right", "top", "bottom"]) {
        let source = factory().createCanvas({ width: 2400, height: 2000, margin: 600 })
          .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "A" },
            { x: 2, y: 2, g: "B" }, { x: 3, y: 3, g: "B" }] });
        source = kind === "color" ? source.createPointMark() : source.createLineMark().encodeGroup({ field: "g" });
        source = source.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
        const p = source.createLegend({ position, labels: { fontSize: 80 }, titleStyle: { fontSize: 80 },
          symbol: kind === "color" ? { stroke: "black", strokeWidth: 40 } : { lineWidth: 60 } });
        const prefix = kind === "color" ? "colorLegend" : "seriesLegend";
        const sample = p.graphicSpec.objects[prefix + "Symbols"].items[0].properties;
        const label = p.graphicSpec.objects[prefix + "Labels"].items[0].properties;
        const gap = label.x - (kind === "color" ? sample.x + sample.width : sample.x2) - sample.strokeWidth / 2;
        categoricalSampleGaps.push(Math.round(gap * 1e8) / 1e8);
        if (!renderToSVG(p).startsWith("<svg ")) throw new Error("Categorical SVG missing");
        render(p, document.getElementById("legend-content").getContext("2d"));
      }
    }
      const opacitySampleGaps = [];
      for (const position of ["left", "right", "top", "bottom"]) {
        const p = guideSource.createLegend({ channels: ["opacity"], position, count: 3, offset: 40,
          symbol: { radius: 30, stroke: "black", strokeWidth: 20 }, labels: { fontSize: 30 }, titleStyle: { fontSize: 40 } });
        const symbol = p.graphicSpec.objects.opacityLegendSymbols.items[0].properties;
        const label = p.graphicSpec.objects.opacityLegendLabels.items[0].properties;
        opacitySampleGaps.push(position === "right" ? label.x - symbol.x - 40
          : position === "left" ? symbol.x - 40 - label.x : label.y - label.fontSize / 2 - symbol.y - 40);
        render(p, document.getElementById("legend-content").getContext("2d"));
        if (!renderToSVG(p).startsWith("<svg ")) throw new Error("Opacity SVG missing");
      }
      const guideTitle = { text: "Chart", position: "top" };
      let guideRejects = 0;
      const guideOrder = [];
      const guideComparisons = [];
      const transitionEdges = [];
      for (const position of ["left", "right", "top", "bottom"]) {
        const source = guideSource.createLegend({ channels: ["color"], position, border: true })
          .editLegend({ title: false });
        const interval = source.editScale({ id: source.guideConfigs.legend.gradient.scale,
          type: "quantize", domain: [0, 10], range: ["blue", "red"] });
        const back = interval.editScale({ id: interval.guideConfigs.legend.interval.scale,
          type: "sequential", domain: [0, 10], range: ["blue", "red"] });
        transitionEdges.push([interval.guideConfigs.legend.interval.position,
          back.guideConfigs.legend.gradient.position, back.graphicSpec.objects.colorGradientTitle === undefined,
          renderToSVG(interval).startsWith("<svg "), renderToSVG(back).startsWith("<svg ")]);
        render(interval, document.getElementById("legend-content").getContext("2d"));
        render(back, document.getElementById("legend-content").getContext("2d"));
      }
      for (const channel of ["color", "opacity"]) {
        const options = { channels: [channel], position: "top", offset: 40, border: true };
        const program = guideSource.createTitle(guideTitle).createLegend(options);
        guideComparisons.push([program.graphicSpec,
          guideSource.createLegend(options).createTitle(guideTitle).graphicSpec]);
        const overlap = { position: "top", text: "AXIS", offset: 40, fontSize: 24 };
        for (const attempt of [() => program.createXAxisTitle(overlap),
          () => guideSource.createXAxisTitle(overlap).createLegend(options)]) {
          try { attempt(); } catch (error) { if (/overlap.*margin space/.test(error.message)) guideRejects += 1; else throw error; }
        }
        const edited = program.editLegend({ border: false }).editLegend({ border: true }).editCanvas({ width: 1240 });
        guideComparisons.push([edited.graphicSpec,
          guideSource.editCanvas({ width: 1240 }).createTitle(guideTitle).createLegend(options).graphicSpec]);
        guideOrder.push(renderToSVG(edited).startsWith("<svg "));
        render(edited, document.getElementById("legend-content").getContext("2d"));
      }
      const inferredSizeBase = legendContentBase.removeEncoding({ channel: "shape" });
      const inferredColorSize = inferredSizeBase.createLegend({ count: 3 });
      const inferredColorBase = inferredSizeBase.removeEncoding({ channel: "size" });
      const inferredColor = inferredColorBase.createLegend();
      const inferredShape = legendContentBase.removeEncoding({ channel: "color" })
        .removeEncoding({ channel: "size" }).createLegend();
      const editedContent = legendContentBase.createLegend({ channels: ["size"] })
        .editLegend({ labels: { color: "red" }, titleStyle: { fontWeight: 900 } })
        .editLegend({ channels: ["color", "size"], count: 3 })
        .editLegend({ labels: { fontWeight: 700 } });
      const hiddenContent = legendContentBase.createLegend({ count: 3 }).editLegend({ title: false });
      const hiddenCategorical = legendContentBase.editCanvas({ width: 1200, height: 1000, margin: 300 })
        .createLegend({ channels: ["color"], position: "bottom", border: true }).editLegend({ title: false });
      const hiddenStyled = hiddenCategorical.editLegend({ titleStyle: { fontSize: 1000 }, titlePosition: "left" });
      render(hiddenStyled, document.getElementById("legend-content").getContext("2d"));
      const partialContent = hiddenContent.removeLegend({ channels: ["shape"] });
      render(intervalTop, document.getElementById("legend-content").getContext("2d"));
      const bottomLegendBase = chart().createCanvas({ width: 640, height: 600,
        margin: { left: 60, right: 100, top: 40, bottom: 150 } })
        .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "B" }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
      const legacyBottomLegend = bottomLegendBase.createLegend({ channels: ["color"], position: "bottom", layout: "legacy-bottom" })
        .editLegendLabels({ color: "red" });
      const edgeBottomLegend = legacyBottomLegend.editLegendLayout({ layout: "edge" });
      render(edgeBottomLegend, document.getElementById("bottom-legend").getContext("2d"));
      const editedSizeLegend = chart().createCanvas({ width: 1000, height: 800, margin: 250 })
        .createData({ values: [{ x: 1, y: 2, m: 10 }, { x: 2, y: 3, m: 30 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } })
        .createLegend({ channels: ["size"], position: "top", columns: 2, border: true }).editLegendSymbols({ count: 3 })
        .editLegendTitle({ title: "Mass" }).editLegendLabels({ fontWeight: 700 });
      const hiddenSizeLegend = editedSizeLegend.editLegendTitle({ title: false });
      render(editedSizeLegend, document.getElementById("size-legend").getContext("2d"));
      const sourceTextScale = chart().createCanvas({ width: 480, height: 320, margin: 60 })
        .createData({ values: [{ x: 1, y: 1, next: 100 }, { x: 2, y: 3, next: 1000 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .createTextMark({ source: "point", text: "label" })
        .encodeY({ target: "point", field: "next", scale: { id: "next-y" } }).createAxes().createGrid()
        .editCanvas({ width: 600 });
      render(sourceTextScale, document.getElementById("source-text-scale").getContext("2d"));
      const textDatum = chart().createCanvas({ width: 480, height: 320, margin: 40 })
        .createData({ values: [] })
        .createTextMark({ id: "note", data: "data", text: "Peak · 9.0", dx: 8, dy: -16 })
        .encodeX({ target: "note", datum: 8, scale: { domain: [0, 10] } })
        .encodeY({ target: "note", datum: 9, scale: { domain: [0, 10] } });
      render(textDatum, document.getElementById("text-datum").getContext("2d"));
      const annotationSource = chart().createCanvas({ width: 480, height: 320, margin: 40 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 8, y: 9 }] })
        .createPointMark().encodeX({ field: "x", scale: { domain: [0, 10] } })
        .encodeY({ field: "y", scale: { domain: [0, 10] } });
      const annotation = annotationSource.createAnnotation({
        text: "Peak · 9.0", x: 8, y: 9, dx: 8, dy: -16
      });
      render(annotation, document.getElementById("annotation").getContext("2d"));
      const referenceFacades = chart().createCanvas({ width: 480, height: 320, margin: 40 })
        .createData({ values: [] }).createReferenceBand({ space: "plot", x: [0.2, 0.6] })
        .createReferenceLine({ space: "plot", y: 0.5 });
      render(referenceFacades, document.getElementById("reference-facades").getContext("2d"));
      const temporalRect = chart().createCanvas().createData({ values: [{ start: "2020-01-01", end: "2020-01-03" }] })
        .createRectMark({ data: "data" }).encodeX({ field: "start", fieldType: "temporal" })
        .encodeX2({ field: "end", fieldType: "temporal" })
        .filterMarks({ channel: "x", op: "gte", value: Date.UTC(2020, 0, 1) });
      const referenceRect = chart().createCanvas({ width: 480, height: 320, margin: 40 })
        .createData({ values: [] }).createRectMark({ data: "data", fill: "#93c5fd", opacity: 0.5, stroke: false })
        .encodeX({ datum: 2, scale: { domain: [0, 10] } }).encodeX2({ datum: 6 });
      render(referenceRect, document.getElementById("reference-rect").getContext("2d"));
      const semanticLabels = chart().createCanvas({ width: 480, height: 360, margin: 50 })
        .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 1 }, { category: "B", value: 6 }] })
        .createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false })
        .createMarkLabels({ id: "text", source: "piePlot", content: "share", format: ".1%", layout: {} });
      render(semanticLabels, document.getElementById("semantic-labels").getContext("2d"));
      const semanticLabelSVG = renderToSVG(semanticLabels);
      document.querySelector("#status").textContent = "complete";
      window.__ggactionGuideComparisons = guideComparisons;
      window.__ggactionConsumer = {
        sourceTextDomain: sourceTextScale.resolvedScales["next-y"].domain,
        sourceTextPositions: sourceTextScale.graphicSpec.objects.text.items.map(i => i.properties.y),
        sourceTextSVG: renderToSVG(sourceTextScale).includes("label"),
        textDatum: [textDatum.graphicSpec.objects.note.items[0].properties.x,
          textDatum.graphicSpec.objects.note.items[0].properties.y,
          renderToSVG(textDatum).includes("Peak · 9.0")],
        annotation: [annotation.graphicSpec.objects.annotation.items[0].properties.x,
          annotation.graphicSpec.objects.annotation.items[0].properties.y,
          renderToSVG(annotation).includes("Peak · 9.0")],
        referenceFacades: [referenceFacades.graphicSpec.objects.referenceBand.items[0].properties.width,
          referenceFacades.graphicSpec.objects.referenceLine.items[0].properties.y1,
          renderToSVG(referenceFacades).includes("#64748b")],
        temporalRectCount: temporalRect.graphicSpec.objects.rect.items.length,
        referenceRect: referenceRect.graphicSpec.objects.rect.items[0].properties.width,
        referenceRectSVG: renderToSVG(referenceRect).includes("#93c5fd"),
        semanticTexts: semanticLabels.graphicSpec.objects.text.items.map(i => i.properties.text),
        semanticTextSVG: semanticLabelSVG.includes("25.0%") && semanticLabelSVG.includes("75.0%"),
        semanticFiltered: semanticLabels.filterMarks({ target: "piePlot", field: "category", op: "eq", value: "B" })
          .graphicSpec.objects.text.items.map(i => i.properties.text),
        intervalPosition: intervalTop.guideConfigs.legend.interval.position,
        intervalColumns: intervalTop.guideConfigs.legend.interval.columns,
        intervalSVG: renderToSVG(intervalTop).startsWith("<svg "),
        addedRecipeTypes: replayAdded.guideConfigs.legend.series.symbol.layers.map(layer => layer.type),
        removedRecipeTypes: replayRemoved.guideConfigs.legend.series.symbol.layers.map(layer => layer.type),
        replaySVG: renderToSVG(replayAdded).startsWith("<svg "),
        editedKinds: Object.keys(editedContent.guideConfigs.legend),
        editedSizeFill: editedContent.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill,
        editedSizeWeight: editedContent.graphicSpec.objects.sizeLegendTitle.properties.fontWeight,
        editedSVG: renderToSVG(editedContent).startsWith("<svg "),
        partialChannels: partialContent.guideConfigs.legend.color.channels,
        partialTitleHidden: partialContent.graphicSpec.objects.colorLegendTitle === undefined,
        encodingTitleHidden: hiddenContent.removeEncoding({ channel: "shape" }).graphicSpec.objects.colorLegendTitle === undefined,
        partialSizeCount: partialContent.graphicSpec.objects.sizeLegendSymbols.items.length,
        partialSVG: renderToSVG(partialContent).startsWith("<svg "),
        inferredColorType: inferredColor.graphicSpec.objects.colorLegendSymbols.type,
        inferredShapeType: inferredShape.guideConfigs.legend.series.symbol.layers[0].type,
        inferredSizeParity: JSON.stringify(inferredColorSize.graphicSpec) === JSON.stringify(
          inferredSizeBase.createLegend({ channels: ["color", "size"], count: 3 }).graphicSpec),
        inferredSizeSVG: renderToSVG(inferredColorSize).startsWith("<svg "),
        onlyColorKinds: Object.keys(onlyColorContent.guideConfigs.legend),
        onlyColorSymbol: onlyColorContent.graphicSpec.objects.colorLegendSymbols.type,
        combinedContentKinds: Object.keys(colorSizeContent.guideConfigs.legend),
        combinedContentCount: colorSizeContent.graphicSpec.objects.sizeLegendSymbols.items.length,
        combinedPosition: horizontalCombined.guideConfigs.legend.color.position,
        combinedSizeTitleColors: [colorSizeContent, horizontalCombined].map(p => p.graphicSpec.objects.sizeLegendTitle.properties.fill),
        guideRejects,
        guideOrder,
        transitionEdges,
        occupiedAlignment,
        itemStrokeGaps,
        categoricalSampleGaps,
        categoricalSideOptions,
        opacitySampleGaps,
        ignoredOptionRejects,
        gradientTitleParity,
        hiddenCategorical: [hiddenStyled.graphicSpec.objects.colorLegendBackground.properties.height,
          renderToSVG(hiddenStyled) === renderToSVG(hiddenCategorical)],
        combinedSVG: renderToSVG(horizontalCombined).startsWith("<svg "),
        combinedTitlesAligned: horizontalCombined.graphicSpec.objects.colorLegendTitle.properties.y === horizontalCombined.graphicSpec.objects.sizeLegendTitle.properties.y,
        combinedContentSVG: renderToSVG(colorSizeContent).startsWith("<svg "),
        legacyBottomYs: legacyBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y),
        edgeBottomYs: edgeBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y),
        bottomLegendSVG: renderToSVG(edgeBottomLegend).startsWith("<svg "),
        shapeLegendChannels: shapeLegend.semanticSpec.guides.legend.series.channels,
        shapeLegendItems: shapeLegend.graphicSpec.objects.seriesLegendSymbolPoints.items.length,
        shapeLegendSVG: renderToSVG(shapeLegend).startsWith("<svg "),
        sizeLegendPosition: editedSizeLegend.guideConfigs.legend.size.position,
        sizeLegendSVG: renderToSVG(editedSizeLegend).startsWith("<svg "),
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
        widthLegendPosition: editedLegend.guideConfigs.legend.strokeWidth.position,
        widthLegendSVG: renderToSVG(editedLegend).startsWith("<svg "),
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
  const guideComparisons = await windowValue(page, "__ggactionGuideComparisons");
  assert.equal(guideComparisons.length, 4);
  for (const [actual, expected] of guideComparisons) assert.deepEqual(actual, expected);
  assert.deepEqual(await windowValue(page, "__ggactionConsumer"), {
    sourceTextDomain: [100, 1000],
    sourceTextPositions: [260, 60],
    sourceTextSVG: true,
    textDatum: [368, 48, true],
    annotation: [368, 48, true],
    referenceFacades: [160, 160, true],
    temporalRectCount: 1,
    referenceRect: 160,
    referenceRectSVG: true,
    semanticTexts: ["25.0%", "75.0%"],
    semanticTextSVG: true,
    semanticFiltered: ["100.0%"],
    intervalPosition: "top",
    intervalColumns: 2,
    intervalSVG: true,
    addedRecipeTypes: ["line", "point"],
    removedRecipeTypes: ["point"],
    replaySVG: true,
    editedKinds: ["color", "size"],
    editedSizeFill: "red",
    editedSizeWeight: 900,
    editedSVG: true,
    partialChannels: ["color"],
    partialTitleHidden: true,
    encodingTitleHidden: true,
    partialSizeCount: 3,
    partialSVG: true,
    inferredColorType: "rect",
    inferredShapeType: "point",
    inferredSizeParity: true,
    inferredSizeSVG: true,
    onlyColorKinds: ["color"],
    onlyColorSymbol: "rect",
    combinedContentKinds: ["color", "size"],
    combinedContentCount: 3,
    combinedPosition: "bottom",
    combinedSizeTitleColors: ["#334155", "#334155"],
    guideRejects: 4,
    guideOrder: [true, true],
    transitionEdges: ["left", "right", "top", "bottom"].map(position => [position, position, true, true, true]),
    hiddenCategorical: [36.5, true],
    occupiedAlignment: [true, true, true, true, true, true],
    itemStrokeGaps: [8, 8, 8, 8, 12, 12, 12, 12],
    categoricalSideOptions: Array.from({ length: 4 }, () => ["vertical", 3, true]),
    categoricalSampleGaps: [8, 8, 8, 8, 10, 10, 10, 10, 8, 8, 8, 8, 10, 10, 10, 10],
    opacitySampleGaps: [12, 12, 12, 12],
    ignoredOptionRejects: 18,
    gradientTitleParity: [true, true, true, true, true, true],
    combinedSVG: true,
    combinedTitlesAligned: true,
    combinedContentSVG: true,
    legacyBottomYs: [572, 572],
    edgeBottomYs: [489.25, 489.25],
    bottomLegendSVG: true,
    shapeLegendChannels: ["shape"],
    shapeLegendItems: 2,
    shapeLegendSVG: true,
    sizeLegendPosition: "top",
    sizeLegendSVG: true,
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
    legendCanvas: [800, 700],
    widthLegendPosition: "top",
    widthLegendSVG: true,
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
