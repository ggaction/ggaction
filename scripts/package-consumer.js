import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  BROWSER_BUNDLE_GZIP_LIMITS,
  measureMinimalBrowserBundle
} from "./browser-bundle-size.js";
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

function run(command, args, cwd, options = {}) {
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    ...options
  });
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
  ], directory, {
    env: {
      ...process.env,
      NPM_CONFIG_CACHE: path.join(directory, ".npm-cache")
    }
  });
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
  const pdfOutput = path.join(directory, "chart.pdf");
  const fontWeightOutput = path.join(directory, "font-weight.png");
  const source = `
    import assert from "node:assert/strict";
    import { chart, hconcat, render, vconcat } from "ggaction";
    import { chart as basicChart, render as basicRender } from "ggaction/basic";
    import { action, ChartProgram, registerExtension } from "ggaction/extension";
    import { renderToPDF } from "ggaction/pdf";
    import { renderToPNG } from "ggaction/png";
    import { renderToSVG } from "ggaction/svg";

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
    const axisLifecycle = chart()
      .createCanvas({ width: 240, height: 180, margin: 50 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .createAxes()
      .editXAxis({ ticksAndLabels: false })
      .editYAxis({ line: false, title: false });
    assert.equal(axisLifecycle.graphicSpec.objects.xAxisTicks, undefined);
    assert.equal(axisLifecycle.graphicSpec.objects.xAxisLabels, undefined);
    assert.equal(axisLifecycle.graphicSpec.objects.yAxisLine, undefined);
    assert.equal(axisLifecycle.graphicSpec.objects.yAxisTitle, undefined);
    assert.ok(axisLifecycle.semanticSpec.layers[0].encoding.x);
    assert.ok(axisLifecycle.resolvedScales.y);
    const monthly = chart()
      .createData({
        id: "datedEvents",
        values: [{ date: "2024-05-17T13:45:00Z", value: 2 }]
      })
      .createTimeUnitData({
        id: "monthlyEvents",
        field: "date",
        unit: "month",
        as: "month"
      });
    assert.equal(
      monthly.semanticSpec.datasets.find(dataset => dataset.id === "monthlyEvents")
        .values[0].month,
      Date.UTC(2024, 4, 1)
    );
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
          { op: "cumulativeSum", field: "value", as: "runningValue" },
          {
            op: "movingMean",
            field: "value",
            as: "movingValue",
            frame: { preceding: 1 }
          }
        ]
      });
    const windowValues = windowed.semanticSpec.datasets.find(
      dataset => dataset.id === "windowedEvents"
    ).values;
    assert.deepEqual(
      windowValues.map(row => [row.rowNumber, row.runningValue, row.movingValue]),
      [[2, 5, 2.5], [1, 2, 2], [1, 4, 4]]
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
    const editedBinned = binned.editBin2DData({
      target: "sampleCells",
      bins: 1,
      includeEmpty: false
    });
    assert.equal(
      editedBinned.materializationConfigs.data.bin2d.sampleCells.current,
      "sampleCellsBin2DDataRevision1"
    );
    assert.equal(editedBinned.semanticSpec.datasets.at(-1).values.length, 1);
    const scatterFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
    assert.equal(scatterFacade.graphicSpec.objects.scatterPlot.items.length, 2);
    assert.deepEqual(
      scatterFacade.trace.children.at(-1).children.map(node => node.op),
      ["createPointMark", "encodeX", "encodeY"]
    );
    const basicScatter = basicChart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
    assert.equal(basicScatter.graphicSpec.objects.scatterPlot.items.length, 2);
    assert.equal(basicScatter.createRegression, undefined);
    assert.equal(typeof basicRender, "function");
    const horizon = chart()
      .createCanvas({ width: 180, height: 100, margin: 15 })
      .createData({
        values: [
          { time: 1, value: -2 },
          { time: 2, value: 3 },
          { time: 3, value: 1 }
        ]
      })
      .createAreaMark()
      .encodeHorizon({ x: "time", y: "value" });
    assert.ok(horizon.graphicSpec.objects.area.items.length > 0);
    assert.equal(horizon.editHorizon({ bands: 2 })
      .semanticSpec.datasets.at(-1).transform[0].bands, 2);
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
    const orderedCategories = chart()
      .createCanvas({ width: 180, height: 130, margin: 30 })
      .createData({ values: [
        { category: "Beta", value: 2 },
        { category: "Alpha", value: 7 }
      ] })
      .createBarMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value", aggregate: "sum" })
      .orderCategories({
        channel: "x",
        by: { field: "value", aggregate: "sum" },
        direction: "descending"
      });
    assert.deepEqual(orderedCategories.resolvedScales.x.domain, ["Alpha", "Beta"]);
    assert.deepEqual(
      orderedCategories.removeCategoryOrder({ channel: "x" })
        .resolvedScales.x.domain,
      ["Beta", "Alpha"]
    );
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
    const parallelFacade = chart()
      .createCanvas({ width: 200, height: 140, margin: 20 })
      .createData({ values: [
        { key: "a", first: 1, second: 4, group: "A" },
        { key: "b", first: 2, second: 3, group: "B" }
      ] })
      .createParallelCoordinates({
        dimensions: ["first", "second"],
        key: "key",
        color: "group",
        guides: false
      });
    assert.equal(parallelFacade.graphicSpec.objects.parallelCoordinates.items.length, 2);
    assert.deepEqual(
      parallelFacade.trace.children.at(-1).children.map(node => node.op),
      [
        "createCoordinate", "createLineMark", "encodeParallelCoordinates",
        "encodeColor"
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
    const violinPlotFacade = chart()
      .createCanvas({ width: 180, height: 140, margin: 20 })
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 },
        { group: "B", value: 3 },
        { group: "B", value: 4 }
      ] })
      .createViolinPlot({
        x: { field: "group", fieldType: "nominal" },
        y: { field: "value", fieldType: "quantitative" },
        density: { bandwidth: 0.5, steps: 8 },
        guides: false
      });
    assert.equal(violinPlotFacade.graphicSpec.objects.violinPlot.items.length, 2);
    assert.equal(
      violinPlotFacade.trace.children.at(-1).op,
      "createViolinPlot"
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
    const pdf = await renderToPDF(program, {
      output: ${JSON.stringify(pdfOutput)},
      metadata: {
        title: "Package consumer chart",
        keywords: ["package", "consumer"]
      }
    });
    assert.equal(pdf.width, 160);
    assert.equal(pdf.height, 120);
    assert.equal(pdf.pages, 1);
    assert.ok(pdf.bytes > 0);
    const svg = renderToSVG(program, {
      title: "Package consumer chart",
      resourceNamespace: "packageConsumer"
    });
    assert.match(svg, /^<svg /);
    assert.match(svg, /<title>Package consumer chart<\\/title>/);
    assert.match(svg, /<circle /);

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
    assert.match(
      renderToSVG(fontWeightProgram),
      /font-weight="700"/
    );

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

    const passthrough = action(
      { op: "passthrough", description: "Return one extension program." },
      function () { return this; }
    );
    const finish = action(
      { op: "finish", description: "Chain a second extension action." },
      function () { return this; }
    );
    registerExtension({
      name: "ggaction-package-consumer-extension",
      actions: { passthrough, finish }
    });
    const extensionResult = chart().passthrough().finish();
    assert.equal(extensionResult instanceof ChartProgram, true);
    assert.deepEqual(
      extensionResult.trace.children.map(node => node.op),
      ["passthrough", "finish"]
    );
    assert.deepEqual(extensionResult.actionStack, []);
    assert.equal(basicChart().passthrough, undefined);

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

async function testMcpConsumer(directory) {
  const installedRoot = path.join(directory, "node_modules", "ggaction");
  const executable = path.join(
    directory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "ggaction-mcp.cmd" : "ggaction-mcp"
  );
  const { searchGgactionText } = await import(
    pathToFileURL(path.join(installedRoot, "src", "mcp", "adapter.js")).href
  );
  const taskPacketSchema = JSON.parse(await readFile(
    path.join(installedRoot, "knowledge", "task-packet.schema.json"),
    "utf8"
  ));
  if (taskPacketSchema.properties?.schemaVersion?.const !== 3) {
    throw new Error("Installed task packet schema must require schemaVersion 3.");
  }
  const transport = new StdioClientTransport({
    command: executable,
    cwd: directory,
    stderr: "pipe"
  });
  const client = new Client(
    { name: "ggaction-installed-consumer", version: "1.0.0" },
    { capabilities: {} }
  );
  const started = performance.now();
  await client.connect(transport);
  const coldStartMilliseconds = performance.now() - started;
  try {
    const tools = await client.listTools();
    if (tools.tools.length !== 1 || tools.tools[0].name !== "search_ggaction") {
      throw new Error("Installed MCP must expose only search_ggaction.");
    }
    const query = "scatter plot with a color legend at bottom as svg";
    const result = await client.callTool({
      name: "search_ggaction",
      arguments: { query }
    });
    if (result.content[0]?.text !== searchGgactionText(query)) {
      throw new Error("Installed direct and MCP payloads are not byte-equal.");
    }
    const packet = JSON.parse(result.content[0].text);
    if (
      packet.schemaVersion !== 3 ||
      packet.authoring?.initialize !== "let program = chart()" ||
      packet.authoring?.prerequisites?.length !== 2
    ) {
      throw new Error("Installed MCP did not return the task packet v3 authoring bootstrap.");
    }
    const authoringSource = [
      'import assert from "node:assert/strict";',
      ...packet.authoring.imports,
      "const values = [",
      '  { x: 1, y: 4, category: "A" },',
      '  { x: 2, y: 7, category: "B" },',
      '  { x: 3, y: 6, category: "A" }',
      "];",
      `${packet.authoring.initialize};`,
      ...packet.authoring.prerequisites.map(entry => `${entry.call};`),
      ...packet.authoring.steps.map(step => `${step};`),
      'assert.equal(output.startsWith("<svg"), true);',
      "assert.ok(program.graphicSpec.objects.scatterPlot.items.length > 0);",
      ""
    ].join("\n");
    const authoringFile = path.join(directory, "mcp-authoring-smoke.mjs");
    await writeFile(authoringFile, authoringSource);
    run(process.execPath, [authoringFile], directory);
    const resources = await client.listResources();
    if (
      resources.resources.length !== 9 ||
      resources.resources.some(resource => resource.uri.startsWith("ggaction://docs/"))
    ) {
      throw new Error("Installed MCP resource discovery is not bounded.");
    }
    const overview = await client.readResource({ uri: "ggaction://overview" });
    if (!overview.contents[0]?.text.includes("never executes chart code")) {
      throw new Error("Installed MCP overview is missing its read-only boundary.");
    }
    let deniedResolvedFallback = false;
    try {
      await client.readResource({ uri: "ggaction://docs/choose-chart-type" });
    } catch (error) {
      deniedResolvedFallback = /available only when recommended/.test(String(error));
    }
    if (!deniedResolvedFallback) {
      throw new Error("Installed MCP exposed docs without an unresolved search result.");
    }
    await client.callTool({
      name: "search_ggaction",
      arguments: { query: "make a chart" }
    });
    const fallback = await client.readResource({
      uri: "ggaction://docs/choose-chart-type"
    });
    if (!fallback.contents[0]?.text.startsWith("# Choose a chart or mark type")) {
      throw new Error("Installed MCP did not expose the recommended bounded fallback.");
    }
    await client.callTool({
      name: "search_ggaction",
      arguments: { query: "map chart" }
    });
    let deniedTerminalFallback = false;
    try {
      await client.readResource({ uri: "ggaction://docs/unsupported-capabilities" });
    } catch (error) {
      deniedTerminalFallback = /available only when recommended/.test(String(error));
    }
    if (!deniedTerminalFallback) {
      throw new Error("Installed MCP required documentation for a terminal unsupported result.");
    }
    let deniedArbitraryFile = false;
    try {
      await client.readResource({ uri: "file:///etc/passwd" });
    } catch (error) {
      deniedArbitraryFile = /Unsupported knowledge resource URI/.test(String(error));
    }
    if (!deniedArbitraryFile) {
      throw new Error("Installed MCP accepted an arbitrary file URI.");
    }
    return { coldStartMilliseconds };
  } finally {
    await client.close();
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
      type EditBin2DDataOptions,
      type CreateBarPlotOptions,
      type CreateHeatmapOptions,
      type CreateHistogramOptions,
      type CreateLinePlotOptions,
      type ColorLayout,
      type CreateParallelCoordinatesOptions,
      type OrderCategoriesOptions,
      type GradientPlotOptions,
      type HorizonEncodingOptions,
      type HistogramEncodingOptions,
      type EditHorizonOptions,
      type EditAxisOptions,
      type CreateDerivedDataOptions,
      type CreateScatterPlotOptions,
      type DatasetTransform,
      type JitterMaxOffset,
      type JitterPointsOptions,
      type NonPointQuantitativePositionScaleOptions,
      type OpacityScaleOptions,
      type ParallelCoordinatesEncodingOptions,
      type RemoveJitterOptions,
      type ShapeScaleOptions,
      type SizeScaleOptions,
      type StrokeWidthEncodingOptions,
      type ThetaEncodingOptions,
      type ThetaScaleOptions,
      type TimeUnitDataOptions,
      type ViolinPlotOptions,
      type WindowDataOptions,
      type YStackMode
    } from "ggaction";
    import { action, ChartProgram as ExtensionProgram } from "ggaction/extension";
    import {
      renderToPDF,
      type PDFMetadata,
      type PDFRenderResult
    } from "ggaction/pdf";
    import { renderToPNG, type PNGRenderResult } from "ggaction/png";
    import {
      renderToSVG,
      type SVGRenderOptions
    } from "ggaction/svg";
    import {
      chart as basicChart,
      render as basicRender,
      type BasicChartProgram
    } from "ggaction/basic";

    const program: ChartProgram = chart().createCanvas({ width: 100, height: 100 });
    const centerLayout: ColorLayout = "center";
    const centerStack: YStackMode = "center";
    const invalidYBin: Parameters<ChartProgram["encodeY"]>[0] = {
      field: "value",
      // @ts-expect-error Direct y encodings do not support binning.
      bin: { maxBins: 10 }
    };
    void invalidYBin;
    const centeredArea: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 0, group: "A", value: 1 },
        { x: 1, group: "A", value: 2 }
      ] })
      .createAreaMark()
      .encodeGroup({ field: "group" })
      .encodeX({ field: "x" })
      .encodeY({ field: "value", stack: centerStack })
      .encodeColor({ field: "group", layout: centerLayout });
    void centeredArea;
    const invalidCenteredHistogram: HistogramEncodingOptions = {
      field: "value",
      // @ts-expect-error Histogram stacking excludes the area-only center mode.
      stack: "center"
    };
    void invalidCenteredHistogram;
    const axisRemovalOptions: EditAxisOptions<"bottom" | "top"> = {
      line: false,
      ticksAndLabels: false,
      title: false
    };
    const scatterOptions: CreateScatterPlotOptions = {
      x: "x",
      y: { field: "y", scale: { zero: false } },
      guides: false
    };
    const invalidScatterPolicies: CreateScatterPlotOptions = {
      x: {
        field: "x",
        // @ts-expect-error Point-facade positions do not aggregate, bin, or stack.
        aggregate: "mean"
      },
      y: "y",
      color: {
        field: "group",
        // @ts-expect-error Point-facade color does not author series layouts.
        layout: "group"
      }
    };
    void invalidScatterPolicies;
    const opacityScale: OpacityScaleOptions = {
      type: "linear", zero: false, unknown: 0.25
    };
    const linePositionScale: NonPointQuantitativePositionScaleOptions = {
      type: "log", domain: [1, 100], base: 10
    };
    const pointSizeScale: SizeScaleOptions = {
      type: "linear", domain: [0, 10], range: [2, 20], unknown: 5
    };
    const pointShapeScale: ShapeScaleOptions = {
      type: "ordinal", unknown: "diamond"
    };
    void [opacityScale, linePositionScale, pointSizeScale, pointShapeScale];
    const invalidOpacityPadding: OpacityScaleOptions = {
      // @ts-expect-error Opacity scales do not accept band padding.
      padding: 0.2
    };
    void invalidOpacityPadding;
    const invalidPositionPalette: CreateScatterPlotOptions = {
      x: { field: "x", scale: {
        // @ts-expect-error Position scales do not accept color palettes.
        palette: "blues"
      } },
      y: "y"
    };
    const invalidSizeNice: CreateScatterPlotOptions = {
      x: "x",
      y: "y",
      size: { field: "size", scale: {
        // @ts-expect-error Size scales do not expose ignored position options.
        nice: true
      } }
    };
    const invalidZeroSupportingLog: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", aggregate: "sum", scale: {
        // @ts-expect-error Zero-baseline bars cannot use logarithmic scales.
        type: "log"
      } }
    };
    const invalidBarYBin: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: {
        field: "value",
        // @ts-expect-error Bar y positions do not support binning.
        bin: { maxBins: 10 }
      }
    };
    const invalidBarHorizontalTime: CreateBarPlotOptions = {
      x: { field: "value", aggregate: "sum" },
      y: {
        field: "time",
        // @ts-expect-error Horizontal bar categories cannot use temporal scales.
        fieldType: "temporal"
      }
    };
    const invalidCenteredBars: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", aggregate: "sum" },
      color: {
        field: "group",
        // @ts-expect-error Bar layouts do not support centered areas.
        layout: "center"
      }
    };
    const invalidHorizonYScale: HorizonEncodingOptions = {
      x: "x",
      y: { field: "value", scale: {
        // @ts-expect-error Folded horizon amplitude cannot be made nice.
        nice: true
      } }
    };
    void [
      invalidPositionPalette,
      invalidSizeNice,
      invalidZeroSupportingLog,
      invalidBarYBin,
      invalidBarHorizontalTime,
      invalidCenteredBars,
      invalidHorizonYScale
    ];
    const scatterFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot(scatterOptions);
    const basicScatter: BasicChartProgram = basicChart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot(scatterOptions);
    const basicDraw: typeof basicRender = basicRender;
    const horizonOptions: HorizonEncodingOptions = {
      x: { field: "time", fieldType: "temporal" },
      y: "value",
      bands: 3,
      resolve: "shared",
      palette: { positive: "blues", negative: "reds" }
    };
    const horizonEdit: EditHorizonOptions = {
      bands: 4,
      groupBy: false,
      overflow: "clip"
    };
    const horizonFacade = chart()
      .createCanvas()
      .createData({ values: [{ time: "2000-01-01", value: 2 }] })
      .createAreaMark()
      .encodeHorizon(horizonOptions)
      .editHorizon(horizonEdit);
    const lineOptions: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      groupBy: "group",
      line: { curve: "linear", strokeWidth: 2 },
      guides: false
    };
    const invalidClosedLineOptions: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      line: {
        // @ts-expect-error Cartesian line facades cannot author closed Polar paths.
        closed: true
      }
    };
    void invalidClosedLineOptions;
    const invalidLineColorLayout: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      color: {
        field: "group",
        // @ts-expect-error Line color cannot use categorical fill-layout policies.
        layout: "overlay"
      }
    };
    const invalidLineXAggregate: CreateLinePlotOptions = {
      x: {
        field: "x",
        // @ts-expect-error Line x positions cannot aggregate.
        aggregate: "mean"
      },
      y: "y"
    };
    const invalidLineYPolicies: CreateLinePlotOptions = {
      x: "x",
      y: {
        field: "y",
        // @ts-expect-error Line y positions cannot bin or stack.
        bin: { maxBins: 10 }
      }
    };
    void [invalidLineColorLayout, invalidLineXAggregate, invalidLineYPolicies];
    const lineFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2, group: "A" }] })
      .createLinePlot(lineOptions);
    const parallelOptions: CreateParallelCoordinatesOptions = {
      dimensions: [
        { field: "first", scale: { zero: false } },
        {
          field: "second",
          fieldType: "ordinal",
          title: "Second",
          scale: { type: "band", paddingInner: 0.1 }
        }
      ],
      key: "row key",
      missing: "break",
      color: "group",
      line: { curve: "linear", closed: false },
      guides: false
    };
    const invalidParallelColorLayout: CreateParallelCoordinatesOptions = {
      dimensions: ["first", "second"],
      color: {
        field: "group",
        // @ts-expect-error Parallel line color cannot use categorical fill-layout policies.
        layout: "overlay"
      }
    };
    void invalidParallelColorLayout;
    const parallelEncoding: ParallelCoordinatesEncodingOptions = {
      dimensions: ["first", "second"],
      key: "row key"
    };
    const parallelFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { "row key": "a", first: 1, second: 4, group: "A" },
        { "row key": "b", first: 2, second: 3, group: "B" }
      ] })
      .createParallelCoordinates(parallelOptions);
    const parallelAdvanced: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ first: 1, second: 2 }] })
      .createLineMark()
      .encodeParallelCoordinates(parallelEncoding);
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
    const categoryOrderOptions: OrderCategoriesOptions = {
      channel: "x",
      by: { field: "value", aggregate: "sum" },
      direction: "descending"
    };
    const orderedCategoryBars: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { category: "Beta", value: 2 },
        { category: "Alpha", value: 7 }
      ] })
      .createBarMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value", aggregate: "sum" })
      .orderCategories(categoryOrderOptions)
      .removeCategoryOrder({ channel: "x" });
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
    const invalidCenteredHistogramFacade: CreateHistogramOptions = {
      field: "value",
      // @ts-expect-error Histogram facades do not support centered area layouts.
      stack: "center"
    };
    void invalidCenteredHistogramFacade;
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
    const invalidHeatmapColorPolicy: CreateHeatmapOptions = {
      x: "x",
      y: "y",
      color: {
        field: "value",
        fieldType: "quantitative",
        // @ts-expect-error Pre-gridded rect color does not aggregate or lay out series.
        aggregate: "mean"
      }
    };
    void invalidHeatmapColorPolicy;
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
    const invalidGradientGuides: GradientPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      guides: {
        axes: { coordinate: {
          // @ts-expect-error Gradient facades own Cartesian axes.
          type: "polar"
        } },
        legend: {
          // @ts-expect-error Density legends are currently right-positioned.
          position: "top"
        }
      }
    };
    void invalidGradientGuides;
    const gradientFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 }
      ] })
      .createGradientPlot(gradientOptions)
      .editGradientPlot({ width: { band: 0.5 } });
    const violinOptions: ViolinPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      density: {
        bandwidth: 0.5,
        steps: 8,
        width: { band: 0.8, resolve: "shared" }
      },
      guides: false
    };
    const invalidViolinLayout: ViolinPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      color: {
        field: "group",
        // @ts-expect-error Category-density violin color only supports overlay.
        layout: "stack"
      }
    };
    void invalidViolinLayout;
    const violinFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 }
      ] })
      .createViolinPlot(violinOptions);
    const composed: ChartProgram = hconcat({
      programs: [program, program]
    })
      .editCompositionLayout({ gap: 8, padding: { left: 4 } })
      .replaceCompositionChild({ target: "view-2", program });
    const nested: ChartProgram = vconcat({ programs: [composed, program] });
    const facetPolicyEdited: ChartProgram = chart()
      .createCanvas({ width: 240, height: 180 })
      .createData({ values: [
        { group: "A", x: 1, y: 2 },
        { group: "B", x: 3, y: 4 }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .facet({ field: "group", columns: 1 })
      .editCompositionLayout({ columns: 2 })
      .editFacetScales({ x: "independent" })
      .editFacetGuides({ axes: "outer" });
    const draw: typeof render = render;
    const png: Promise<PNGRenderResult> = renderToPNG(program, { output: "chart.png" });
    const pdfMetadata: PDFMetadata = {
      title: "Typed PDF",
      keywords: ["typed", "pdf"]
    };
    const pdf: Promise<PDFRenderResult> = renderToPDF(program, {
      output: "chart.pdf",
      metadata: pdfMetadata
    });
    const svgOptions: SVGRenderOptions = {
      title: "Typed SVG",
      resourceNamespace: "typedSvg"
    };
    const svg: string = renderToSVG(program, svgOptions);
    renderToPDF(program, {
      output: "chart.pdf",
      // @ts-expect-error PDF is vector output and has no pixelRatio option.
      pixelRatio: 2
    });
    renderToSVG(program, {
      // @ts-expect-error SVG is vector output and has no pixelRatio option.
      pixelRatio: 2
    });
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
    const timeUnitOptions: TimeUnitDataOptions = {
      id: "monthlyEvents",
      field: "date",
      unit: "month",
      as: "month"
    };
    const monthlyEvents: ChartProgram = chart()
      .createData({ id: "events", values: [{ date: "2024-05-17", value: 2 }] })
      .createTimeUnitData(timeUnitOptions);
    const timeUnitTransform: DatasetTransform = {
      type: "timeUnit",
      field: "date",
      unit: "month",
      as: "month"
    };
    const windowOptions: WindowDataOptions = {
      id: "ordered",
      partitionBy: "group",
      sortBy: [{ field: "order", order: "descending" }],
      operations: [
        { op: "rowNumber", as: "rowNumber" },
        { op: "lag", field: "value", as: "previousValue" },
        {
          op: "movingSum",
          field: "value",
          as: "movingValue",
          frame: { preceding: 2, following: 1 }
        }
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
      operations: [{
        op: "movingMean",
        field: "value",
        as: "movingValue",
        frame: { preceding: 2, following: 0 }
      }]
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
    const binEdit: EditBin2DDataOptions = {
      target: "cells",
      bins: 1,
      includeEmpty: false
    };
    const editedBinned: ChartProgram = binned.editBin2DData(binEdit);
    const inspected = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createPointMark({ id: "points" })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" });
    const withoutXAxis: ChartProgram = inspected
      .createXAxis()
      .editXAxis(axisRemovalOptions);
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
    void basicScatter;
    void basicDraw;
    void horizonFacade;
    void lineFacade;
    void orderedLineFacade;
    void barFacade;
    void histogramFacade;
    void heatmapFacade;
    void gradientFacade;
    void violinFacade;
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
    void withoutXAxis;
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
    const mcp = await testMcpConsumer(consumer.directory);
    await testTypeScriptConsumer(consumer.directory);
    await testTutorialConsumers(consumer.directory);
    const fullBundle = await measureMinimalBrowserBundle(consumer.directory);
    const basicBundle = await measureMinimalBrowserBundle(consumer.directory, {
      specifier: "ggaction/basic"
    });
    const svgBundle = await measureMinimalBrowserBundle(consumer.directory, {
      specifier: "ggaction/svg"
    });
    for (const bundle of [fullBundle, basicBundle, svgBundle]) {
      const limit = BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier];
      if (bundle.gzipBytes > limit) {
        throw new Error(
          `${bundle.specifier} gzip bundle ${bundle.gzipBytes} exceeds ${limit}.`
        );
      }
    }
    return {
      ...consumer,
      mcp,
      browserBundles: { full: fullBundle, basic: basicBundle, svg: svgBundle }
    };
  } finally {
    await consumer.cleanup();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageSpec = process.argv[2];
  const result = await testPackageConsumer({ packageSpec });
  process.stdout.write(`${JSON.stringify({
    package: `${result.installedManifest.name}@${result.installedManifest.version}`,
    source: result.artifact?.filename ?? result.packageSpec,
    ...(result.artifact ? { sha256: result.artifact.sha256 } : {}),
    browserBundles: result.browserBundles,
    mcp: {
      coldStartMilliseconds: Math.round(result.mcp.coldStartMilliseconds)
    },
    checks: [
      "node",
      "extension",
      "pdf",
      "png",
      "svg",
      "numeric-font-weight",
      "point-jitter",
      "path-order",
      "time-unit-data",
      "window-data",
      "bin2d-data",
      "binned-heatmap",
      "parallel-coordinates",
      "horizon",
      "violin-plot",
      "right-categorical-legend-offset",
      "sequential-palette-count",
      "typescript",
      "basic-entry-runtime-and-types",
      "tutorial-consumers",
      "minimal-browser-bundle-measurement",
      "private-export-rejection",
      "installed-local-mcp",
      "direct-mcp-byte-equality",
      "task-packet-v3-authoring-execution",
      "explicit-unresolved-docs-fallback",
      "terminal-unsupported-no-fallback"
    ]
  }, null, 2)}\n`);
}
