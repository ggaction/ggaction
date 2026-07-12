import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsHistogramPrimitives,
  renderCarsHistogramPrimitives
} from "../programs/carsHistogramPrimitives.js";
import { createCarsHistogramValues } from "../programs/carsHistogramValues.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);
const layout = {
  width: 720,
  height: 460,
  margin: { top: 80, right: 60, bottom: 130, left: 80 },
  maxBins: 7
};

test("authors and renders the complete primitive cars histogram", () => {
  const values = createCarsHistogramValues(cars, layout);
  const program = createCarsHistogramPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsHistogramPrimitives(program, context);

  assert.equal(program.semanticSpec.datasets[0].values.length, 406);
  assert.deepEqual(program.semanticSpec.layers, [
    {
      id: "bars",
      mark: { type: "bar" },
      data: "cars",
      coordinate: "main",
      encoding: {
        x: {
          field: "Displacement",
          fieldType: "quantitative",
          bin: { maxBins: 7 },
          scale: "x"
        },
        y: {
          field: "Displacement",
          fieldType: "quantitative",
          aggregate: "count",
          stack: "zero",
          scale: "y"
        },
        color: {
          field: "Origin",
          fieldType: "nominal",
          scale: "color"
        }
      }
    }
  ]);
  assert.deepEqual(program.semanticSpec.scales, [
    {
      id: "x",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: false
    },
    {
      id: "y",
      type: "linear",
      domain: "auto",
      range: "auto",
      zero: true
    },
    {
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    }
  ]);
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", coordinate: "main", title: "Displacement" },
      y: {
        scale: "y",
        coordinate: "main",
        title: "count(Displacement)"
      }
    },
    grid: {
      horizontal: { scale: "y", coordinate: "main" }
    },
    legend: {
      color: { scale: "color", title: "Origin" }
    }
  });
  assert.deepEqual(program.semanticSpec.title, {
    text: "Displacement distribution",
    subtitle: "by country"
  });

  const bars = program.graphicSpec.objects.bars;
  assert.equal(bars.type, "rect");
  assert.equal(values.bins.length <= layout.maxBins, true);
  assert.equal(bars.children.length, 9);
  assert.deepEqual(
    bars.children.map(child => child.properties),
    values.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      stroke: "white",
      strokeWidth: 0.5
    }))
  );
  assert.equal(
    bars.children.every(child =>
      [
        child.properties.x,
        child.properties.y,
        child.properties.width,
        child.properties.height
      ].every(Number.isFinite)
    ),
    true
  );
  assert.equal(values.bins.reduce((sum, bin) => sum + bin.total, 0), 406);
  for (const bin of values.bins) {
    const segments = values.rects.filter(rect => rect.bin === bin.index);
    assert.equal(segments[0].stackStart, 0);
    for (let index = 1; index < segments.length; index += 1) {
      assert.equal(segments[index].stackStart, segments[index - 1].stackEnd);
    }
    assert.equal(segments.at(-1).stackEnd, bin.total);
  }

  assert.deepEqual(
    program.graphicSpec.objects.horizontalGridLines.children.map(
      child => child.properties.y1
    ),
    values.axes.y.ticks.map(tick => tick.position)
  );
  assert.equal(program.graphicSpec.objects.verticalGridLines, undefined);
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendLabels.children.map(
      child => child.properties.text
    ),
    ["USA", "Europe", "Japan"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.children.map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.equal(program.graphicSpec.objects.chartTitle.properties.x, 370);
  assert.equal(program.graphicSpec.objects.chartTitle.properties.textAlign, "center");
  assert.equal(
    program.graphicSpec.objects.chartSubtitle.properties.text,
    "by country"
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "bars",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle",
    "chartTitle",
    "chartSubtitle"
  ]);

  assert.equal(findCanvasCalls(context, "stroke").length, 28);
  assert.equal(findCanvasCalls(context, "fillRect").length, 13);
  assert.equal(findCanvasCalls(context, "fillText").length, 18);
  assert.equal(findCanvasCalls(context, "moveTo").length, 28);
  assert.equal(findCanvasCalls(context, "lineTo").length, 64);

  const topLevelOps = new Set(program.trace.children.map(node => node.op));
  assert.deepEqual([...topLevelOps], [
    "createCanvas",
    "createData",
    "editSemantic",
    "createGraphics",
    "editGraphics",
    "createTitle"
  ]);
  assert.equal(
    program.trace.children.some(node =>
      [
        "createBarMark",
        "encodeX",
        "encodeY",
        "encodeHistogram",
        "createGrid",
        "createLegend",
        "createGuides"
      ].includes(node.op)
    ),
    false
  );
  assert.deepEqual(program.actionStack, []);
  assert.equal(Object.isFrozen(program.semanticSpec.layers[0].encoding.x.bin), true);
  assert.equal(Object.isFrozen(bars.children[0].properties), true);
});

test("owns histogram input and renders from graphicSpec alone", () => {
  const input = structuredClone(cars);
  const program = createCarsHistogramPrimitives(input);
  const stored = program.semanticSpec.datasets[0].values[0].Displacement;

  input[0].Displacement = -999;

  assert.equal(program.semanticSpec.datasets[0].values[0].Displacement, stored);
  const context = createMockCanvasContext();
  renderCarsHistogramPrimitives({ graphicSpec: program.graphicSpec }, context);
  assert.equal(findCanvasCalls(context, "stroke").length, 28);
  assert.equal(findCanvasCalls(context, "fillRect").length, 13);
  assert.equal(findCanvasCalls(context, "fillText").length, 18);
});
