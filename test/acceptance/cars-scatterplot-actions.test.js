import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsScatterplotActions,
  renderCarsScatterplotActions
} from "../programs/carsScatterplotActions.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("renders the cars scatterplot created with the canvas action", () => {
  const program = createCarsScatterplotActions(cars);
  const context = createMockCanvasContext();

  renderCarsScatterplotActions(program, context);

  assert.deepEqual(program.graphicSpec.objects.canvas.properties, {
    width: 640,
    height: 400,
    background: "white"
  });
  assert.deepEqual(program.context.currentMargin, {
    top: 30,
    right: 30,
    bottom: 60,
    left: 70
  });
  assert.deepEqual(program.context.currentGraphicBounds, {
    x: 70,
    y: 30,
    width: 540,
    height: 310
  });
  assert.equal(program.context.currentData, "cars");
  assert.equal(program.context.currentMark, "points");
  assert.equal(program.semanticSpec.datasets[0].values.length, 392);
  assert.deepEqual(program.semanticSpec.layers, [
    {
      id: "points",
      mark: { type: "point" },
      data: "cars",
      encoding: {
        x: {
          field: "Horsepower",
          fieldType: "quantitative",
          scale: "x"
        },
        y: {
          field: "Miles_per_Gallon",
          fieldType: "quantitative",
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
    { id: "x", type: "linear", domain: "auto", range: "auto" },
    { id: "y", type: "linear", domain: "auto", range: "auto" },
    { id: "color", type: "ordinal", domain: "auto", range: "auto" }
  ]);
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", title: "Horsepower" },
      y: { scale: "y", title: "Miles per Gallon" }
    }
  });
  assert.deepEqual(program.resolvedScales, {
    x: { type: "linear", domain: [46, 230], range: [70, 610] },
    y: { type: "linear", domain: [9, 46.6], range: [340, 30] },
    color: {
      type: "ordinal",
      domain: ["USA", "Japan", "Europe"],
      range: [
        "#4c78a8",
        "#f58518",
        "#e45756",
        "#72b7b2",
        "#54a24b",
        "#eeca3b",
        "#b279a2",
        "#ff9da6",
        "#9d755d",
        "#bab0ac"
      ]
    }
  });
  assert.equal(program.graphicSpec.objects.points.type, "circle");
  assert.equal(program.graphicSpec.objects.points.children.length, 392);
  assert.equal(findCanvasCalls(context, "arc").length, 392);
  assert.equal(findCanvasCalls(context, "stroke").length, 10);
  assert.equal(findCanvasCalls(context, "fillText").length, 10);
  assert.deepEqual(program.graphicSpec.objects.xAxisLine.properties, {
    x1: 70, y1: 340, x2: 610, y2: 340, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(program.graphicSpec.objects.yAxisLine.properties, {
    x1: 70, y1: 340, x2: 70, y2: 30, stroke: "#334155", strokeWidth: 1
  });
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.children.map(child => child.properties.text),
    ["50", "100", "150", "200"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.yAxisLabels.children.map(child => child.properties.text),
    ["10", "20", "30", "40"]
  );
  assert.equal(program.guideConfigs.axis.x.labels.mode, "count");
  assert.equal(program.guideConfigs.axis.y.labels.mode, "count");
  const xAxis = program.trace.children.find(node => node.op === "createXAxis");
  const yAxis = program.trace.children.find(node => node.op === "createYAxis");
  const xTickGroup = xAxis.children[1];
  const yTickGroup = yAxis.children[1];
  assert.deepEqual(xTickGroup.children.map(node => node.op), [
    "createXAxisTicks",
    "createXAxisLabels"
  ]);
  assert.deepEqual(yTickGroup.children.map(node => node.op), [
    "createYAxisTicks",
    "createYAxisLabels"
  ]);
  assert.deepEqual(xAxis.children.map(node => node.op), [
    "createXAxisLine",
    "createXAxisTicksAndLabels",
    "createXAxisTitle"
  ]);
  assert.deepEqual(yAxis.children.map(node => node.op), [
    "createYAxisLine",
    "createYAxisTicksAndLabels",
    "createYAxisTitle"
  ]);

  const createCanvas = program.trace.children[0];
  assert.equal(createCanvas.op, "createCanvas");
  assert.deepEqual(
    createCanvas.children.map(node => node.op),
    ["createGraphics", "editCanvas"]
  );
  assert.deepEqual(
    createCanvas.children[1].children.map(node => node.op),
    ["editGraphics", "editGraphics", "editGraphics"]
  );

  const createData = program.trace.children[1];
  assert.equal(createData.op, "createData");
  assert.deepEqual(createData.args, { id: "cars", valuesCount: 392 });
  assert.equal(createData.children.length, 1);
  assert.equal(createData.children[0].op, "editSemantic");
  assert.deepEqual(createData.children[0].args, {
    property: "dataset[cars].values",
    valueCount: 392
  });

  const createPointMark = program.trace.children.find(
    node => node.op === "createPointMark"
  );
  assert.deepEqual(createPointMark.args, { id: "points" });
  assert.deepEqual(
    createPointMark.children.map(node => node.op),
    ["editSemantic", "editSemantic", "createGraphics"]
  );
  assert.deepEqual(createPointMark.children[0].args, {
    property: "layer[points].mark.type",
    value: "point"
  });
  assert.deepEqual(createPointMark.children[1].args, {
    property: "layer[points].data",
    value: "cars"
  });
  assert.deepEqual(createPointMark.children[2].args, {
    id: "points",
    type: "circle",
    length: 392
  });

  const encodeX = program.trace.children.find(node => node.op === "encodeX");
  const encodeY = program.trace.children.find(node => node.op === "encodeY");

  assert.deepEqual(encodeX.args, { field: "Horsepower" });
  assert.deepEqual(encodeY.args, { field: "Miles_per_Gallon" });
  assert.deepEqual(
    encodeX.children.map(node => node.op),
    [
      "editSemantic",
      "editSemantic",
      "editSemantic",
      "createScale",
      "rematerializeScale"
    ]
  );
  assert.equal(
    program.trace.children.some(
      node => node.op === "editGraphics" && node.args.target === "points"
    ),
    false
  );
  assert.equal(program.graphicSpec.objects.xLabels, undefined);
  assert.equal(program.graphicSpec.objects.yLabels, undefined);
  assert.equal(program.graphicSpec.objects.xTitle, undefined);
  assert.equal(program.graphicSpec.objects.yTitle, undefined);
  assert.deepEqual(program.graphicSpec.objects.xAxisTitle.properties, {
    x: 340, y: 382, text: "Horsepower", fill: "#334155", fontSize: 13,
    fontFamily: "sans-serif", fontWeight: 600, textAlign: "center",
    textBaseline: "middle", rotation: 0
  });
  assert.equal(program.graphicSpec.objects.yAxisTitle.properties.x, 18);
  assert.equal(program.graphicSpec.objects.yAxisTitle.properties.y, 185);
  assert.equal(program.graphicSpec.objects.yAxisTitle.properties.rotation, -Math.PI / 2);
  assert.equal(
    program.trace.children.some(node =>
      ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
    ),
    false
  );
  assert.deepEqual(program.actionStack, []);
});
