import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import { createPackageArtifact } from "./package-artifact.js";
import { testTutorialConsumers } from "./tutorial-consumer.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tscCommand = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
}

export async function preparePackageConsumer({
  packageSpec = process.env.GGACTION_PACKAGE_SPEC
} = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-consumer-"));
  const artifact = packageSpec === undefined ? await createPackageArtifact() : undefined;
  const installSpec = packageSpec ?? artifact.file;
  await writeFile(path.join(directory, "package.json"), `${JSON.stringify({
    name: "ggaction-release-consumer",
    version: "1.0.0",
    private: true,
    type: "module"
  }, null, 2)}\n`);
  run(npmCommand, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    installSpec
  ], directory);
  const installedManifest = JSON.parse(await readFile(
    path.join(directory, "node_modules", "ggaction", "package.json"),
    "utf8"
  ));
  return {
    artifact,
    directory,
    installedManifest,
    packageSpec: packageSpec ?? artifact.file,
    cleanup: () => rm(directory, { recursive: true, force: true })
  };
}

async function testNodeConsumer(directory) {
  const output = path.join(directory, "chart.png");
  const fontWeightOutput = path.join(directory, "font-weight.png");
  const source = `
    import assert from "node:assert/strict";
    import { chart, hconcat, render, vconcat } from "ggaction";
    import { action, ChartProgram } from "ggaction/extension";
    import { renderToPNG } from "ggaction/png";

    const program = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeRadius({ value: 3 });
    const jittered = program.jitterPoints({
      channel: "x",
      maxOffset: { pixels: 2 },
      seed: "package-consumer",
      key: "x"
    });
    assert.notDeepEqual(
      jittered.graphicSpec.objects.point.items.map(item => item.properties.x),
      program.graphicSpec.objects.point.items.map(item => item.properties.x)
    );
    assert.deepEqual(
      jittered.removeJitter().graphicSpec.objects.point.items,
      program.graphicSpec.objects.point.items
    );
    assert.equal(typeof render, "function");
    assert.equal(program.graphicSpec.objects.point.items.length, 2);
    const windowed = chart()
      .createData({
        id: "events",
        values: [
          { group: "A", order: 2, value: 3 },
          { group: "A", order: 1, value: 2 },
          { group: "B", order: 1, value: 4 }
        ]
      })
      .createWindowData({
        id: "windowedEvents",
        partitionBy: "group",
        sortBy: [{ field: "order" }],
        operations: [
          { op: "rowNumber", as: "rowNumber" },
          { op: "cumulativeSum", field: "value", as: "runningValue" }
        ]
      });
    const windowValues = windowed.semanticSpec.datasets.find(
      dataset => dataset.id === "windowedEvents"
    ).values;
    assert.deepEqual(
      windowValues.map(row => [row.rowNumber, row.runningValue]),
      [[2, 5], [1, 2], [1, 4]]
    );
    const binned = chart()
      .createData({
        id: "samples",
        values: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
      })
      .createBin2DData({
        id: "sampleCells",
        x: "x",
        y: "y",
        bins: 2,
        extent: { x: [0, 1], y: [0, 1] },
        includeEmpty: true,
        as: { count: "count" }
      });
    assert.equal(
      binned.semanticSpec.datasets.find(dataset => dataset.id === "sampleCells")
        .values.reduce((sum, row) => sum + row.count, 0),
      2
    );
    const scatterFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
    assert.equal(scatterFacade.graphicSpec.objects.scatterPlot.items.length, 2);
    assert.deepEqual(
      scatterFacade.trace.children.at(-1).children.map(node => node.op),
      ["createPointMark", "encodeX", "encodeY"]
    );
    const lineFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 1, y: 2, group: "A" },
        { x: 2, y: 4, group: "A" }
      ] })
      .createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false });
    assert.equal(lineFacade.graphicSpec.objects.linePlot.items.length, 1);
    assert.deepEqual(
      lineFacade.trace.children.at(-1).children.map(node => node.op),
      ["createLineMark", "encodeX", "encodeY", "encodeGroup"]
    );
    const orderedLineFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 2, y: 4, order: 2 },
        { x: 1, y: 2, order: 1 }
      ] })
      .createLineMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodePathOrder({ field: "order" });
    assert.deepEqual(
      orderedLineFacade.semanticSpec.layers[0].encoding.pathOrder,
      { field: "order", fieldType: "quantitative", order: "ascending" }
    );
    assert.equal(
      orderedLineFacade.removePathOrder()
        .semanticSpec.layers[0].encoding.pathOrder,
      undefined
    );
    const barFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { category: "A", value: 2 },
        { category: "B", value: 4 }
      ] })
      .createBarPlot({
        x: { field: "category", fieldType: "ordinal" },
        y: { field: "value", aggregate: "mean" },
        guides: false
      });
    assert.equal(barFacade.graphicSpec.objects.barPlot.items.length, 2);
    const histogramFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ value: 1 }, { value: 2 }, { value: 3 }] })
      .createHistogram({ field: "value", guides: false });
    assert.equal(histogramFacade.graphicSpec.objects.histogram.items.length, 3);
    const heatmapFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: "A", y: "one", value: 1 },
        { x: "B", y: "one", value: 2 }
      ] })
      .createHeatmap({
        x: { field: "x", fieldType: "ordinal" },
        y: { field: "y", fieldType: "nominal" },
        color: { field: "value", fieldType: "quantitative" },
        guides: false
      });
    assert.equal(heatmapFacade.graphicSpec.objects.heatmap.items.length, 2);
    const binnedHeatmapFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ] })
      .createHeatmap({
        x: "x",
        y: "y",
        bin: { bins: 2, extent: { x: [0, 1], y: [0, 1] } },
        guides: false
      });
    assert.equal(binnedHeatmapFacade.graphicSpec.objects.heatmap.items.length, 4);
    assert.deepEqual(
      binnedHeatmapFacade.trace.children.at(-1).children.map(node => node.op),
      [
        "createBin2DData", "createRectMark", "encodeX", "encodeX2",
        "encodeY", "encodeY2", "encodeColor"
      ]
    );
    const gradientPlotFacade = chart()
      .createCanvas({ width: 180, height: 140, margin: 20 })
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 },
        { group: "B", value: 3 },
        { group: "B", value: 4 }
      ] })
      .createGradientPlot({
        x: { field: "group", fieldType: "nominal" },
        y: { field: "value" },
        density: { bandwidth: 0.5, steps: 8 },
        guides: false
      })
      .editGradientPlot({ gradient: { opacity: [0.1, 0.9] } });
    assert.equal(gradientPlotFacade.graphicSpec.objects.gradientPlot.items.length, 2);
    assert.equal(
      gradientPlotFacade.graphicSpec.objects.gradientPlot.items[0]
        .properties.fill.type,
      "linear-gradient"
    );
    const polar = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [{ angle: 0, distance: 1 }, { angle: 1, distance: 2 }] })
      .createPointMark()
      .encodeTheta({ field: "angle" })
      .encodeR({ field: "distance" })
      .encodePointRadius({ value: 3 });
    assert.equal(polar.semanticSpec.layers[0].coordinate, "polar");
    assert.equal(polar.graphicSpec.objects.point.items.length, 2);
    const arcs = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [{ group: "A" }, { group: "A" }, { group: "B" }] })
      .createArcMark({ innerRadius: 0.4, padAngle: 2 })
      .encodeTheta({ field: "group", aggregate: "count" })
      .encodeColor({ field: "group" });
    assert.equal(arcs.graphicSpec.objects.arc.items.length, 2);
    assert.equal(
      arcs.graphicSpec.objects.arc.items.every(
        item => item.properties.commands.at(-1).op === "Z"
      ),
      true
    );
    const weightedArcs = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [
        { group: "A", weight: 1.5 },
        { group: "A", weight: 2.5 },
        { group: "B", weight: 6 }
      ] })
      .createArcMark({ innerRadius: 0.4 })
      .encodeTheta({ field: "group", aggregate: "sum", weight: "weight" });
    assert.equal(weightedArcs.graphicSpec.objects.arc.items.length, 2);
    assert.equal(weightedArcs.semanticSpec.layers[0].encoding.theta.weight, "weight");
    const weightedRules = chart()
      .createCanvas({ width: 240, height: 160, margin: 30 })
      .createData({ values: [
        { x: 1, x2: 3, y: 2, weight: 0 },
        { x: 2, x2: 4, y: 4, weight: 10 }
      ] })
      .createRuleMark()
      .encodeX({ field: "x", fieldType: "quantitative" })
      .encodeX2({ field: "x2", fieldType: "quantitative" })
      .encodeY({ field: "y", fieldType: "quantitative" })
      .encodeStrokeWidth({ field: "weight", scale: { range: [1, 6] } })
      .createLegend({ channels: ["strokeWidth"] });
    assert.deepEqual(
      weightedRules.graphicSpec.objects.rule.items.map(
        item => item.properties.strokeWidth
      ),
      [1, 6]
    );
    const pair = hconcat({
      programs: [program, polar],
      gap: 8
    }).editCompositionLayout({ padding: 4 });
    const replaced = pair.replaceCompositionChild({
      target: "view-2",
      program: arcs
    });
    const nested = vconcat({ programs: [pair, replaced] });
    assert.equal(replaced.children["view-2"], arcs);
    assert.equal(nested.compositionSpec.direction, "vertical");
    const faceted = program.facet({ field: "x", columns: 2 });
    assert.equal(faceted.compositionSpec.type, "facet");
    assert.equal(
      faceted.children["facet-cell-1"].semanticSpec.datasets.find(
        dataset => dataset.id === "facet-cell-1-data"
      ).values.length,
      1
    );
    const result = await renderToPNG(program, {
      output: ${JSON.stringify(output)},
      pixelRatio: 1
    });
    assert.equal(result.width, 160);
    assert.equal(result.height, 120);

    const fontWeightProgram = chart()
      .createCanvas({ width: 160, height: 80, margin: 12 })
      .createData({ id: "labels", values: [{ x: 0.5, y: 0.5 }] })
      .createTextMark({
        id: "labels",
        data: "labels",
        text: "Sample",
        fontSize: 12,
        fontWeight: 650
      })
      .encodeX({ target: "labels", field: "x", scale: { domain: [0, 1] } })
      .encodeY({ target: "labels", field: "y", scale: { domain: [0, 1] } });
    await renderToPNG(fontWeightProgram, {
      output: ${JSON.stringify(fontWeightOutput)}
    });

    const legendBase = chart()
      .createCanvas({
        width: 720,
        height: 620,
        margin: { top: 180, right: 220, bottom: 180, left: 220 }
      })
      .createData({ values: [
        { x: 1, y: 4, group: "Alpha" },
        { x: 2, y: 6, group: "Beta" }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({ field: "group" });
    const nearLegend = legendBase.createLegend({
      position: "right",
      offset: 8,
      border: true
    });
    const farLegend = legendBase.createLegend({
      position: "right",
      offset: 80,
      border: true
    });
    const editedLegend = nearLegend.editLegendLayout({ offset: 80 });
    const legendX = candidate => Object.entries(candidate.graphicSpec.objects)
      .find(([id]) => id.endsWith("LegendTitle"))?.[1].properties.x;
    assert.equal(legendX(farLegend) - legendX(nearLegend), 72);
    assert.deepEqual(editedLegend.graphicSpec, farLegend.graphicSpec);

    const sequentialCount = chart()
      .createCanvas({ width: 240, height: 160, margin: 30 })
      .createData({ values: [
        { x: 1, y: 2, value: 0 },
        { x: 2, y: 4, value: 0.3 },
        { x: 3, y: 6, value: 1 }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({
        field: "value",
        fieldType: "quantitative",
        scale: { palette: { name: "viridis", count: 5 } }
      });
    assert.equal(sequentialCount.resolvedScales.color.range.length, 5);
    const directSequentialCount = chart().createScale({
      id: "temperature",
      type: "sequential",
      domain: [0, 1],
      palette: { name: "viridis", count: 5 }
    });
    const nestedSequentialCount = chart().createScale({
      id: "temperature",
      type: "sequential",
      domain: [0, 1],
      range: { palette: { name: "viridis", count: 5 } }
    });
    assert.deepEqual(directSequentialCount.semanticSpec, nestedSequentialCount.semanticSpec);

    class ConsumerProgram extends ChartProgram {
      passthrough(options = {}) {
        return passthrough.call(this, options);
      }

      finish(options = {}) {
        return finish.call(this, options);
      }
    }
    const passthrough = action(
      { op: "passthrough", description: "Return one extension program." },
      function () { return this; }
    );
    const finish = action(
      { op: "finish", description: "Chain a second extension action." },
      function () { return this; }
    );
    const extensionResult = new ConsumerProgram().passthrough().finish();
    assert.equal(extensionResult instanceof ConsumerProgram, true);
    assert.deepEqual(
      extensionResult.trace.children.map(node => node.op),
      ["passthrough", "finish"]
    );
    assert.deepEqual(extensionResult.actionStack, []);

    await assert.rejects(() => import("ggaction/src/index.js"), /not defined|not exported/);
  `;
  const file = path.join(directory, "consumer.mjs");
  await writeFile(file, source);
  run(process.execPath, [file], directory);
  const bytes = await readFile(output);
  if (bytes.length === 0) throw new Error("Installed PNG consumer wrote an empty file.");

  const fontWeightImage = await loadImage(fontWeightOutput);
  const canvas = createCanvas(fontWeightImage.width, fontWeightImage.height);
  const context = canvas.getContext("2d");
  context.drawImage(fontWeightImage, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let firstInkY = Infinity;
  let lastInkY = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      if (pixels[offset] < 250 || pixels[offset + 1] < 250 || pixels[offset + 2] < 250) {
        firstInkY = Math.min(firstInkY, y);
        lastInkY = Math.max(lastInkY, y);
      }
    }
  }
  if (lastInkY === -1 || lastInkY - firstInkY + 1 > 24) {
    throw new Error("Installed PNG consumer rendered an oversized numeric font weight.");
  }
}

async function testTypeScriptConsumer(directory) {
  const extensionAuthoring = await readFile(
    path.join(root, "examples", "extension-typescript", "program.ts"),
    "utf8"
  );
  await writeFile(
    path.join(directory, "extension-authoring.ts"),
    extensionAuthoring
  );
  await writeFile(path.join(directory, "consumer.ts"), `
    import {
      chart,
      hconcat,
      render,
      vconcat,
      type ChartProgram,
      type Bin2DDataOptions,
      type CreateBarPlotOptions,
      type CreateHeatmapOptions,
      type CreateHistogramOptions,
      type CreateLinePlotOptions,
      type GradientPlotOptions,
      type CreateDerivedDataOptions,
      type CreateScatterPlotOptions,
      type DatasetTransform,
      type JitterMaxOffset,
      type JitterPointsOptions,
      type RemoveJitterOptions,
      type StrokeWidthEncodingOptions,
      type ThetaEncodingOptions,
      type ThetaScaleOptions,
      type WindowDataOptions
    } from "ggaction";
    import { action, ChartProgram as ExtensionProgram } from "ggaction/extension";
    import { renderToPNG, type PNGRenderResult } from "ggaction/png";

    const program: ChartProgram = chart().createCanvas({ width: 100, height: 100 });
    const scatterOptions: CreateScatterPlotOptions = {
      x: "x",
      y: { field: "y", scale: { zero: false } },
      guides: false
    };
    const scatterFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot(scatterOptions);
    const lineOptions: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      groupBy: "group",
      line: { curve: "linear", strokeWidth: 2 },
      guides: false
    };
    const lineFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2, group: "A" }] })
      .createLinePlot(lineOptions);
    const orderedLineFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 2, y: 4, order: 2 },
        { x: 1, y: 2, order: 1 }
      ] })
      .createLineMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodePathOrder({ field: "order", order: "descending" })
      .removePathOrder();
    const barOptions: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "ordinal" },
      y: { field: "value", aggregate: "mean" },
      width: { band: 0.7 },
      guides: false
    };
    const barFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ category: "A", value: 2 }] })
      .createBarPlot(barOptions);
    const histogramOptions: CreateHistogramOptions = {
      field: "value",
      maxBins: 5,
      guides: false
    };
    const histogramFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ value: 2 }] })
      .createHistogram(histogramOptions);
    const heatmapOptions: CreateHeatmapOptions = {
      x: { field: "x", fieldType: "ordinal" },
      y: { field: "y", fieldType: "nominal" },
      color: { field: "value", fieldType: "quantitative" },
      rect: { stroke: false, opacity: 0.8 },
      guides: false
    };
    const heatmapFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: "A", y: "one", value: 2 }] })
      .createHeatmap(heatmapOptions);
    const binnedHeatmapOptions: CreateHeatmapOptions = {
      x: "x",
      y: { field: "y", scale: { reverse: true } },
      bin: {
        bins: { x: 4, y: 3 },
        extent: { x: [0, 4], y: [0, 3] },
        includeEmpty: true
      },
      color: { scale: { palette: "blues", domain: [0, 3] } },
      guides: false
    };
    const binnedHeatmapFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 0, y: 0 }, { x: 4, y: 3 }] })
      .createHeatmap(binnedHeatmapOptions);
    const gradientOptions: GradientPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 0.5, steps: 8 },
      guides: false
    };
    const gradientFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 }
      ] })
      .createGradientPlot(gradientOptions)
      .editGradientPlot({ width: { band: 0.5 } });
    const composed: ChartProgram = hconcat({
      programs: [program, program]
    })
      .editCompositionLayout({ gap: 8, padding: { left: 4 } })
      .replaceCompositionChild({ target: "view-2", program });
    const nested: ChartProgram = vconcat({ programs: [composed, program] });
    const draw: typeof render = render;
    const png: Promise<PNGRenderResult> = renderToPNG(program, { output: "chart.png" });
    const wrapped = action(
      { op: "typed", description: "Compile one extension action." },
      function () { return this; }
    );
    const extensionProgram: ExtensionProgram = wrapped.call(new ExtensionProgram());
    const filterTransform: DatasetTransform = {
      type: "filter",
      field: "group",
      oneOf: ["A"]
    };
    const derivedOptions: CreateDerivedDataOptions = {
      id: "filtered",
      source: "source",
      transform: [filterTransform]
    };
    const derived = chart()
      .createData({ id: "source", values: [{ group: "A" }] })
      .createDerivedData(derivedOptions);
    const windowOptions: WindowDataOptions = {
      id: "ordered",
      partitionBy: "group",
      sortBy: [{ field: "order", order: "descending" }],
      operations: [
        { op: "rowNumber", as: "rowNumber" },
        { op: "lag", field: "value", as: "previousValue" }
      ]
    };
    const windowed: ChartProgram = chart()
      .createData({
        id: "events",
        values: [{ group: "A", order: 1, value: 2 }]
      })
      .createWindowData(windowOptions);
    const windowTransform: DatasetTransform = {
      type: "window",
      partitionBy: ["group"],
      sortBy: [{ field: "order", order: "ascending" }],
      operations: [{ op: "rowNumber", as: "rowNumber" }]
    };
    const binOptions: Bin2DDataOptions = {
      id: "cells",
      x: "x",
      y: "y",
      bins: { x: 2, y: 2 },
      extent: { x: [0, 2] },
      includeEmpty: true,
      members: true,
      as: { count: "count", members: "members" }
    };
    const binTransform: DatasetTransform = {
      type: "bin2d",
      x: "x",
      y: "y",
      bins: { x: 2, y: 2 },
      extent: { x: "auto", y: "auto" },
      includeEmpty: false,
      members: false,
      as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
    };
    const binned: ChartProgram = chart()
      .createData({ id: "binSource", values: [{ x: 0, y: 0 }, { x: 2, y: 2 }] })
      .createBin2DData(binOptions);
    const inspected = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createPointMark({ id: "points" })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" });
    const faceted: ChartProgram = inspected.facet({ field: "x", columns: 1 });
    const polar: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ angle: 0, distance: 1 }] })
      .createPointMark()
      .encodeTheta({ field: "angle", scale: { range: [0, 360] } })
      .encodeR({ field: "distance", scale: { type: "sqrt" } })
      .encodePointRadius({ value: 2 });
    const arcs: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ group: "A" }, { group: "B" }] })
      .createArcMark({ innerRadius: 0.4 })
      .encodeTheta({ field: "group", aggregate: "count" })
      .encodeColor({ field: "group" })
      .editArcMark({ padAngle: 2 });
    const thetaScale: ThetaScaleOptions = {
      type: "band",
      domain: ["A", "B"],
      range: [0, 360]
    };
    const weightedTheta: ThetaEncodingOptions = {
      field: "group",
      fieldType: "nominal",
      aggregate: "sum",
      weight: "weight",
      scale: thetaScale
    };
    const weightedArcs: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", weight: 1 },
        { group: "B", weight: 2 }
      ] })
      .createArcMark()
      .encodeTheta(weightedTheta);
    const strokeWidthOptions: StrokeWidthEncodingOptions = {
      field: "weight",
      scale: { domain: [0, 10], range: [1, 6] }
    };
    const weightedRules: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 1, x2: 2, y: 3, weight: 0 },
        { x: 2, x2: 3, y: 4, weight: 10 }
      ] })
      .createRuleMark()
      .encodeX({ field: "x", fieldType: "quantitative" })
      .encodeX2({ field: "x2", fieldType: "quantitative" })
      .encodeY({ field: "y", fieldType: "quantitative" })
      .encodeStrokeWidth(strokeWidthOptions)
      .createLegend({ channels: ["strokeWidth"] });
    const jitterOffset: JitterMaxOffset = { pixels: 2 };
    const jitterOptions: JitterPointsOptions = {
      channel: "x",
      maxOffset: jitterOffset,
      key: "x"
    };
    const removeJitterOptions: RemoveJitterOptions = {};
    const jittered: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .jitterPoints(jitterOptions)
      .removeJitter(removeJitterOptions);
    const pointLayer = inspected.semanticSpec.layers.find(
      layer => layer.id === "points"
    );
    const pointItems = inspected.graphicSpec.objects.points?.items ?? [];
    const lastAction = inspected.trace.children.at(-1)?.op;
    // @ts-expect-error DatasetTransform is a closed discriminated union.
    const invalidTransform: DatasetTransform = { type: "unknown" };
    void draw;
    void scatterFacade;
    void lineFacade;
    void orderedLineFacade;
    void barFacade;
    void histogramFacade;
    void heatmapFacade;
    void gradientFacade;
    void png;
    void extensionProgram;
    void composed;
    void nested;
    void faceted;
    void derived;
    void windowed;
    void windowTransform;
    void polar;
    void arcs;
    void weightedArcs;
    void weightedRules;
    void jittered;
    void pointLayer;
    void pointItems;
    void lastAction;
    void invalidTransform;
  `);
  await writeFile(path.join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      lib: ["ES2023", "DOM"],
      strict: true,
      noEmit: true,
      skipLibCheck: false
    },
    files: ["consumer.ts", "extension-authoring.ts"]
  }, null, 2)}\n`);
  run(tscCommand, ["--project", "tsconfig.json"], directory);
}

export async function testPackageConsumer(options) {
  const consumer = await preparePackageConsumer(options);
  try {
    await testNodeConsumer(consumer.directory);
    await testTypeScriptConsumer(consumer.directory);
    await testTutorialConsumers(consumer.directory);
    return consumer;
  } finally {
    await consumer.cleanup();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageSpec = process.argv[2];
  const result = await testPackageConsumer({ packageSpec });
  process.stdout.write(`${JSON.stringify({
    package: `${result.installedManifest.name}@${result.installedManifest.version}`,
    source: packageSpec ?? result.artifact.filename,
    ...(result.artifact ? { sha256: result.artifact.sha256 } : {}),
    checks: [
      "node",
      "extension",
      "png",
      "numeric-font-weight",
      "point-jitter",
      "path-order",
      "window-data",
      "bin2d-data",
      "binned-heatmap",
      "right-categorical-legend-offset",
      "sequential-palette-count",
      "typescript",
      "tutorial-consumers",
      "private-export-rejection"
    ]
  }, null, 2)}\n`);
}
