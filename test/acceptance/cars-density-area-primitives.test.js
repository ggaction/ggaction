import assert from "node:assert/strict";
import test from "node:test";

import { createCarsDensityAreaValues } from
  "../fixtures/carsDensityAreaValues.js";
import { loadCars } from "../fixtures/data.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsDensityAreaPrimitives,
  renderCarsDensityAreaPrimitives
} from "../programs/carsDensityAreaPrimitives.js";

const cars = loadCars();

test("authors and renders the complete primitive density area chart", () => {
  const values = createCarsDensityAreaValues(cars);
  const program = createCarsDensityAreaPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsDensityAreaPrimitives(program, context);

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
        id: "densitiesDensityData",
        source: "cars",
        transform: undefined,
        valueCount: 300
      }
    ]
  );
  assert.deepEqual(program.semanticSpec.layers, [{
    id: "densities",
    mark: { type: "area" },
    data: "densitiesDensityData",
    coordinate: "main",
    encoding: {
      x: { field: "Acceleration_value", fieldType: "quantitative", scale: "x" },
      y: {
        field: "Acceleration_density",
        fieldType: "quantitative",
        scale: "y"
      },
      group: { field: "Origin", fieldType: "nominal" },
      color: { field: "Origin", fieldType: "nominal", scale: "color" }
    }
  }]);
  assert.deepEqual(program.semanticSpec.scales, [
    {
      id: "x",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: false,
      zero: false
    },
    {
      id: "y",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: true
    },
    {
      id: "color",
      type: "ordinal",
      domain: "auto",
      range: { palette: "tableau10" }
    }
  ]);
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", coordinate: "main", title: "Acceleration" },
      y: { scale: "y", coordinate: "main", title: "Density" }
    },
    grid: {
      horizontal: { scale: "y", coordinate: "main" },
      vertical: { scale: "x", coordinate: "main" }
    },
    legend: { color: { scale: "color", title: "Origin" } }
  });
  assert.deepEqual(program.semanticSpec.title, values.title);

  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => child.properties),
    values.areas.map(area => ({
      points: area.points,
      closed: true,
      fill: area.fill,
      opacity: 0.5
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.horizontalGridLines.children.map(
      child => child.properties.y1
    ),
    values.grid.horizontal.map(line => line.y1)
  );
  assert.deepEqual(
    program.graphicSpec.objects.verticalGridLines.children.map(
      child => child.properties.x1
    ),
    values.grid.vertical.map(line => line.x1)
  );
  assert.deepEqual(
    program.graphicSpec.objects.colorLegendSymbols.children.map(
      child => child.properties.fill
    ),
    ["#4c78a8", "#f58518", "#e45756"]
  );
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "verticalGridLines",
    "densities",
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

  assert.equal(findCanvasCalls(context, "fillRect").length, 4);
  assert.equal(findCanvasCalls(context, "closePath").length, 3);
  assert.equal(findCanvasCalls(context, "fill").length, 3);
  assert.equal(findCanvasCalls(context, "fillText").length, 17);
  assert.equal(findCanvasCalls(context, "stroke").length, 23);

  const topLevelOps = new Set(program.trace.children.map(node => node.op));
  assert.deepEqual([...topLevelOps], [
    "createCanvas",
    "createData",
    "createAreaMark",
    "editSemantic",
    "createGraphics",
    "editGraphics",
    "createTitle"
  ]);
  assert.equal(
    program.trace.children.some(node => [
      "createDensityData",
      "encodeDensity",
      "encodeColor",
      "createGuides"
    ].includes(node.op)),
    false
  );
  assert.equal(
    Object.isFrozen(program.graphicSpec.objects.densities.children[0].properties),
    true
  );
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].values), true);
  assert.deepEqual(program.actionStack, []);
});

test("owns primitive input and renders from graphicSpec alone", () => {
  const input = loadCars();
  const before = structuredClone(input);
  const program = createCarsDensityAreaPrimitives(input);

  input[0].Acceleration = -999;
  assert.deepEqual(program.semanticSpec.datasets[0].values, before);

  const context = createMockCanvasContext();
  renderCarsDensityAreaPrimitives({ graphicSpec: program.graphicSpec }, context);
  assert.equal(findCanvasCalls(context, "closePath").length, 3);
  assert.equal(findCanvasCalls(context, "fillText").length, 17);
});
