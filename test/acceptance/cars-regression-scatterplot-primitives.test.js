import assert from "node:assert/strict";
import test from "node:test";

import { createCarsRegressionScatterplotValues } from
  "../fixtures/carsRegressionScatterplotValues.js";
import { loadCars } from "../fixtures/data.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsRegressionScatterplotPrimitives,
  renderCarsRegressionScatterplotPrimitives
} from "../programs/carsRegressionScatterplotPrimitives.js";

const cars = loadCars();

test("authors and renders the complete primitive regression scatterplot", () => {
  const values = createCarsRegressionScatterplotValues(cars);
  const program = createCarsRegressionScatterplotPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsRegressionScatterplotPrimitives(program, context);

  assert.deepEqual(
    program.semanticSpec.datasets.map(dataset => ({
      id: dataset.id,
      source: dataset.source,
      transform: dataset.transform,
      valueCount: dataset.values.length
    })),
    [
      { id: "cars", source: undefined, transform: undefined, valueCount: 406 },
      {
        id: "selectedCars",
        source: "cars",
        transform: [{
          type: "filter",
          field: "Origin",
          oneOf: ["Japan", "USA"]
        }],
        valueCount: 333
      },
      {
        id: "regressionData",
        source: "selectedCars",
        transform: [{
          type: "regression",
          method: "linear",
          x: "Displacement",
          y: "Acceleration",
          groupBy: "Origin",
          confidence: 0.95,
          interval: "mean"
        }],
        valueCount: 73
      }
    ]
  );
  assert.deepEqual(program.semanticSpec.layers, [
    {
      id: "points",
      mark: { type: "point" },
      data: "selectedCars",
      coordinate: "main",
      encoding: {
        x: { field: "Displacement", fieldType: "quantitative", scale: "x" },
        y: { field: "Acceleration", fieldType: "quantitative", scale: "y" },
        color: { field: "Origin", fieldType: "nominal", scale: "color" },
        size: { field: "Acceleration", fieldType: "quantitative", scale: "size" },
        shape: { field: "Origin", fieldType: "nominal", scale: "shape" }
      }
    },
    {
      id: "regressionBand",
      mark: { type: "area" },
      data: "regressionData",
      coordinate: "main",
      encoding: {
        x: { field: "Displacement", fieldType: "quantitative", scale: "x" },
        y: {
          field: "__regression_ci_lower",
          fieldType: "quantitative",
          scale: "y"
        },
        y2: {
          field: "__regression_ci_upper",
          fieldType: "quantitative",
          scale: "y"
        },
        group: { field: "Origin", fieldType: "nominal" }
      }
    },
    {
      id: "regressionLine",
      mark: { type: "line" },
      data: "regressionData",
      coordinate: "main",
      encoding: {
        x: { field: "Displacement", fieldType: "quantitative", scale: "x" },
        y: { field: "Acceleration", fieldType: "quantitative", scale: "y" },
        color: { field: "Origin", fieldType: "nominal", scale: "color" },
        group: { field: "Origin", fieldType: "nominal" }
      }
    }
  ]);
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "linear", domain: "auto", range: "auto", nice: true, zero: false },
    { id: "y", type: "linear", domain: "auto", range: "auto", nice: true, zero: false },
    { id: "color", type: "ordinal", domain: "auto", range: { palette: "tableau10" } },
    { id: "size", type: "linear", domain: "auto", range: "auto" },
    { id: "shape", type: "ordinal", domain: "auto", range: "auto" }
  ]);
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", coordinate: "main", title: "Displacement" },
      y: { scale: "y", coordinate: "main", title: "Acceleration" }
    },
    grid: { horizontal: { scale: "y", coordinate: "main" } },
    legend: {
      series: {
        channels: ["color", "shape"],
        scales: ["color", "shape"],
        title: "Origin"
      },
      size: { scale: "size", title: "Acceleration" }
    }
  });

  const points = program.graphicSpec.objects.points;
  assert.equal(points.type, "collection");
  assert.equal(points.children.length, 333);
  assert.deepEqual(
    points.children.map(child => child.type).reduce(
      (counts, type) => ({ ...counts, [type]: (counts[type] ?? 0) + 1 }),
      {}
    ),
    { circle: 254, rect: 79 }
  );
  assert.deepEqual(
    points.children.map(({ type, properties }) => ({ type, properties })),
    values.pointChildren.map(({ type, properties }) => ({ type, properties }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.regressionBands.children.map(
      child => child.properties
    ),
    values.regressionBands.map(band => ({
      points: band.points,
      closed: true,
      fill: "#111111",
      opacity: 0.18
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.regressionLines.children.map(
      child => child.properties
    ),
    values.regressionLines.map(line => ({
      points: line.points,
      stroke: line.stroke,
      strokeWidth: 3,
      strokeDash: []
    }))
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "points",
    "regressionBands",
    "regressionLines",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "originLegendLines",
    "originLegendPoints",
    "originLegendLabels",
    "originLegendTitle",
    "sizeLegendSymbols",
    "sizeLegendLabels",
    "sizeLegendTitle"
  ]);

  assert.equal(findCanvasCalls(context, "arc").length, 258);
  assert.equal(findCanvasCalls(context, "fillRect").length, 81);
  assert.equal(findCanvasCalls(context, "closePath").length, 2);
  assert.equal(findCanvasCalls(context, "fillText").length, 18);
  assert.equal(findCanvasCalls(context, "stroke").length, 98);

  const topLevelOps = new Set(program.trace.children.map(node => node.op));
  assert.deepEqual([...topLevelOps], [
    "createCanvas",
    "createData",
    "editSemantic",
    "createGraphics",
    "editGraphics"
  ]);
  assert.equal(
    program.trace.children.some(node => [
      "filterData",
      "encodeSize",
      "encodeShape",
      "createRegression",
      "createGuides"
    ].includes(node.op)),
    false
  );
  assert.equal(Object.isFrozen(points.children[0].properties), true);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].transform), true);
  assert.deepEqual(program.actionStack, []);
});

test("owns primitive input and renders from graphicSpec alone", () => {
  const input = loadCars();
  const before = structuredClone(input);
  const program = createCarsRegressionScatterplotPrimitives(input);

  input[0].Displacement = -999;
  assert.deepEqual(program.semanticSpec.datasets[0].values, before);

  const context = createMockCanvasContext();
  renderCarsRegressionScatterplotPrimitives(
    { graphicSpec: program.graphicSpec },
    context
  );
  assert.equal(findCanvasCalls(context, "arc").length, 258);
  assert.equal(findCanvasCalls(context, "closePath").length, 2);
});
