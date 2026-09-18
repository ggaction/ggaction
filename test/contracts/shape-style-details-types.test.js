import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../..", import.meta.url));

test("declares R49 shape details on every supported public owner only", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-shape-style-types-"));
  try {
    const file = path.join(directory, "shape-style-details.mts");
    await writeFile(file, `
import type {
  ChartProgram,
  RectStyleDetails,
  StrokeStyleDetails
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type {
  BasicChartProgram,
  RectStyleDetails as BasicRectStyleDetails,
  StrokeStyleDetails as BasicStrokeStyleDetails
} from ${JSON.stringify(path.join(root, "types/basic.js"))};

declare const p: ChartProgram;
declare const basic: BasicChartProgram;

const stroke: StrokeStyleDetails = {
  lineCap: "round",
  lineJoin: "bevel",
  miterLimit: 4
};
const rect: RectStyleDetails = { ...stroke, cornerRadius: 8 };
const basicStroke: BasicStrokeStyleDetails = stroke;
const basicRect: BasicRectStyleDetails = rect;

// Direct mark create/edit pairs.
p.createPointMark(stroke).editPointMark(stroke);
p.createTickMark(stroke).editTickMark(stroke);
p.createLineMark(stroke).editLineMark(stroke);
p.createLineMark({ curve: "cardinal", tension: 0.9 }).editLineMark({ tension: 0.5 });
p.createLinePlot({ x: "x", y: "y", line: { curve: "cardinal", tension: 0.9 } });
// @ts-expect-error tension is numeric
p.createLineMark({ curve: "cardinal", tension: "0.9" });
// @ts-expect-error polar line facade is linear-only
p.createPolarLinePlot({ theta: "angle", radius: "distance", line: { tension: 0.5 } });
p.createBarMark(rect).editBarMark(rect);
p.createAreaMark(stroke).editAreaMark(stroke);
p.createArcMark(stroke).editArcMark(stroke);
p.createRectMark(rect).editRectMark(rect);
p.createRuleMark(stroke).editRuleMark(stroke);

// Basic exposes the same details through its existing direct marks and facades.
basic.createPointMark(basicStroke);
basic.createLineMark(basicStroke);
basic.createBarMark(basicRect);
basic.createRectMark(basicRect);
basic.createScatterPlot({ x: "x", y: "y", point: basicStroke });
basic.createLinePlot({ x: "x", y: "y", line: basicStroke });
basic.createBarPlot({ x: "category", y: "value", bar: basicRect });
basic.createHistogram({ field: "value", bar: basicRect });
basic.createHeatmap({ x: "x", y: "y", color: "value", rect: basicRect });

// Cartesian, polar, distribution, and composite facade style owners.
p.createScatterPlot({ x: "x", y: "y", point: stroke });
p.createStripPlot({ x: "x", point: stroke });
p.createBeeswarmPlot({ x: "x", y: "category", point: stroke });
p.createPolarScatterPlot({ theta: "angle", radius: "value", point: stroke });
p.createRaincloudPlot({ category: "category", value: "value", points: { point: stroke } });
p.createLinePlot({ x: "x", y: "y", line: stroke });
p.createPolarLinePlot({ theta: "angle", radius: "value", line: stroke });
p.createRadarPlot({ category: "category", value: "value", line: stroke });
p.createParallelCoordinates({ dimensions: ["x", "y"], line: stroke });
p.createECDFPlot({ field: "value", line: stroke });
p.createRugPlot({ x: "value", edge: "bottom", tick: stroke });
p.createAreaPlot({ x: "x", y: "y", area: stroke });
p.createDensityPlot({ field: "value", area: stroke });
p.createHorizonPlot({ x: "x", y: "y", area: stroke });
p.createViolinPlot({ x: "category", y: "value", area: stroke });
p.createBarPlot({ x: "category", y: "value", bar: rect });
p.createHistogram({ field: "value", bar: rect });
p.createHeatmap({ x: "x", y: "y", color: "value", rect });
p.createPiePlot({ category: "category", aggregate: "count", arc: stroke });
p.createRosePlot({ category: "category", aggregate: "count", arc: stroke });
p.createRadialBarPlot({ category: "category", aggregate: "count", arc: stroke });

p.createIntervalPlot({ x: "category", y: "value", point: stroke, errorBar: stroke });
p.createRegressionPlot({ x: "x", y: "y", point: stroke, line: stroke, band: stroke });
p.createDotPlot({ category: "category", value: "value", point: stroke });
p.createLollipopPlot({ category: "category", value: "value", point: stroke, stem: stroke });
p.createDumbbellPlot({ category: "category", start: "start", end: "end", startPoint: stroke, endPoint: stroke, connector: stroke });
p.createErrorBar(stroke).editErrorBar(stroke);
p.createErrorBand({ ...stroke, boundaries: stroke })
  .editErrorBand({ ...stroke, boundaries: stroke })
  .editErrorBandBoundary(stroke);
p.createBoxPlot({ box: rect, median: stroke, outlier: stroke })
  .editBoxPlot({ box: rect, median: stroke, outlier: stroke });
p.createGradientPlot({ center: stroke }).editGradientPlot({ center: stroke });
p.createRegression({ line: stroke, band: stroke })
  .editRegression({ line: stroke, band: stroke });
p.createReferenceLine({ space: "plot", x: 1, ...stroke });
p.createReferenceBand({ space: "plot", x: [0, 1], ...rect });

// Lower statistical component actions retain the same public detail contract.
p.createRegressionBand({ id: "band", data: "data", x: "x", lower: "lo", upper: "hi", coordinate: "main", xScale: "x", yScale: "y", ...stroke })
  .editRegressionBand(stroke);
p.createRegressionLine({ id: "line", data: "data", x: "x", y: "y", coordinate: "main", xScale: "x", yScale: "y", ...stroke })
  .editRegressionLine(stroke);

// @ts-expect-error closed line-cap vocabulary
const invalidCap: StrokeStyleDetails = { lineCap: "flat" };
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createPointMark({ cornerRadius: 2 });
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createLineMark({ cornerRadius: 2 });
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createAreaMark({ cornerRadius: 2 });
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createArcMark({ cornerRadius: 2 });
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createRuleMark({ cornerRadius: 2 });
// @ts-expect-error corner radius belongs only to Bar and Rect families
p.createTickMark({ cornerRadius: 2 });
// @ts-expect-error Text has no stroke-detail contract
p.createTextMark({ lineJoin: "round" });
// @ts-expect-error Text has no corner-radius contract
p.editTextMark({ cornerRadius: 2 });
// @ts-expect-error gradient center is a Rule family, not a Rect family
p.createGradientPlot({ center: { cornerRadius: 2 } });
// @ts-expect-error closed line-join vocabulary
p.createBarMark({ lineJoin: "sharp" });
// @ts-expect-error automatic legend inheritance does not expand legend recipes
p.createLegend({ symbol: { layers: [{ type: "swatch", cornerRadius: 2 }] } });
// @ts-expect-error legend block edits do not expose source-derived stroke details
p.editLegendBlock({ target: "legend", channel: "color", symbol: { lineCap: "round" } });
`);

    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
