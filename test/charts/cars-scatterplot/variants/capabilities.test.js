import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import { graphicDrawOrder } from "../../../support/graphic-tree.js";
import assert from "node:assert/strict";
import test from "node:test";

import {
  createContinuousColorCarsScatterplot,
  createDiamondCarsScatterplot,
  createEncodingReassignmentCarsScatterplot,
  createFieldOpacityCarsScatterplot,
  createMirroredAxesCarsScatterplot,
  createPaletteCarsScatterplot,
  createScaleReverseCarsScatterplot,
  createShapeVocabularyCarsScatterplot
} from "../../../../examples/cars-scatterplot/program.js";
import {
  createMockCanvasContext
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import {
  createCategoricalPalettePrimitives,
  createContinuousColorPrimitives,
  createEncodingReassignmentPrimitives,
  createFieldOpacityPrimitives,
  createMirroredAxesPrimitives,
  createPointShapeDiamondPrimitives,
  createScaleReversePrimitives,
  createShapeVocabularyPrimitives
} from "./primitive-programs.js";
import { renderCarsScatterplotPrimitives } from "../primitive.program.js";
import { linearCommandPoints } from "../../../support/path.js";
import {
  POINT_SHAPES,
  SET2_COLORS,
  createContinuousColorPrimitiveValues,
  createDiamondPrimitiveValues,
  createEncodingReassignmentPrimitiveValues,
  createFieldOpacityPrimitiveValues,
  createMirroredAxesPrimitiveValues,
  createScaleReversePrimitiveValues,
  createShapeVocabularyPrimitiveValues
} from "./reference-values.js";

const cars = loadCars();

function polygonArea(points) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function graphicArea(graphic) {
  if (graphic.type === "circle") {
    return Math.PI * graphic.properties.radius ** 2;
  }
  if (graphic.type === "rect") {
    return graphic.properties.width * graphic.properties.height;
  }
  return polygonArea(linearCommandPoints(graphic.properties.commands));
}

test("authors mirrored axes and fixed-decimal labels as raw primitives", () => {
  const values = createMirroredAxesPrimitiveValues(cars);
  const program = createMirroredAxesPrimitives(cars);
  const { bounds } = values.baseline;
  const xLine = program.graphicSpec.objects.xAxisLine.properties;
  const yLine = program.graphicSpec.objects.yAxisLine.properties;
  const xTicks = program.graphicSpec.objects.xAxisTicks.items;
  const yTicks = program.graphicSpec.objects.yAxisTicks.items;
  const xLabels = program.graphicSpec.objects.xAxisLabels.items;
  const yLabels = program.graphicSpec.objects.yAxisLabels.items;

  assert.deepEqual(bounds, { left: 30, right: 550, top: 80, bottom: 370 });
  assert.deepEqual([xLine.x1, xLine.y1, xLine.x2, xLine.y2], [30, 80, 550, 80]);
  assert.deepEqual([yLine.x1, yLine.y1, yLine.x2, yLine.y2], [550, 370, 550, 80]);
  assert.equal(xTicks.every(tick => tick.properties.y2 < tick.properties.y1), true);
  assert.equal(yTicks.every(tick => tick.properties.x2 > tick.properties.x1), true);
  assert.deepEqual(xLabels.map(label => label.properties.text), values.xLabels);
  assert.deepEqual(yLabels.map(label => label.properties.text), values.yLabels);
  assert.equal(xLabels.every(label => label.properties.textBaseline === "bottom"), true);
  assert.equal(yLabels.every(label => label.properties.textAlign === "left"), true);
  assert.equal(program.graphicSpec.objects.xAxisTitle.properties.rotation, 0);
  assert.equal(program.graphicSpec.objects.yAxisTitle.properties.rotation, Math.PI / 2);
  assert.equal(program.trace.children.every(node =>
    ["editSemantic", "createGraphics", "editGraphics"].includes(node.op)
  ), true);
});

test("matches the approved mirrored-axis primitive with public guides", () => {
  const primitive = createMirroredAxesPrimitives(cars);
  const publicProgram = createMirroredAxesCarsScatterplot(cars);

  assertEquivalentMeaning(publicProgram.semanticSpec, primitive.semanticSpec);
  assertEquivalentMeaning(publicProgram.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(publicProgram.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createPointMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeRadius",
    "createGuides"
  ]);
});

test("derives reversed positions without changing the baseline domain", () => {
  const values = createScaleReversePrimitiveValues(cars);
  const program = createScaleReversePrimitives(cars);
  const points = program.graphicSpec.objects.points.items;
  const labels = program.graphicSpec.objects.xAxisLabels.items;

  assert.equal(values.x.every((value, index) =>
    value + values.baseline.x[index] ===
      values.baseline.bounds.left + values.baseline.bounds.right
  ), true);
  assert.deepEqual(
    points.map(point => point.properties.x),
    values.x
  );
  assert.deepEqual(
    labels.map(label => label.properties.x),
    values.xTicks
  );
  assert.deepEqual(program.semanticSpec.scales.find(scale => scale.id === "x"), {
    id: "x",
    type: "linear",
    domain: "auto",
    range: [610, 70]
  });
});

test("materializes the constant diamond as equal-area concrete paths", () => {
  const values = createDiamondPrimitiveValues(cars);
  const program = createPointShapeDiamondPrimitives(cars);
  const points = program.graphicSpec.objects.points.items;

  assert.equal(program.graphicSpec.objects.points.type, "collection");
  assert.equal(points.length, 392);
  assert.equal(points.every(point => point.type === "path"), true);
  assert.equal(points.every(point => point.properties.commands.at(-1).op === "Z"), true);
  assert.equal(
    points.every(point =>
      Math.abs(graphicArea(point) - Math.PI * 3 ** 2) < 1e-9
    ),
    true
  );
  assert.deepEqual(points[0].properties, values.items[0].properties);
});

test("builds one normalized symbol for every planned point shape", () => {
  const values = createShapeVocabularyPrimitiveValues(cars);
  const program = createShapeVocabularyPrimitives(cars);
  const points = program.graphicSpec.objects.points.items;
  const symbols = program.graphicSpec.objects.seriesLegendSymbolPoints.items;
  const labels = program.graphicSpec.objects.seriesLegendLabels.items;

  assert.deepEqual(values.shapes, POINT_SHAPES);
  assert.equal(values.rows.length, 12);
  assert.equal(new Set(values.rows.map(row => row.ShapeCategory)).size, 12);
  assert.deepEqual(
    points.map(point => point.type),
    ["circle", "rect", ...Array(10).fill("path")]
  );
  assert.equal(
    points.every(point => Math.abs(graphicArea(point) - Math.PI * 7 ** 2) < 1e-9),
    true
  );
  assert.equal(
    symbols.every(symbol => Math.abs(graphicArea(symbol) - Math.PI * 5 ** 2) < 1e-9),
    true
  );
  assert.deepEqual(labels.map(label => label.properties.text), POINT_SHAPES);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 860);
});

test("applies set2 colors consistently to points and a color-only legend", () => {
  const program = createCategoricalPalettePrimitives(cars);
  const scale = program.semanticSpec.scales.find(candidate =>
    candidate.id === "color"
  );
  const pointColors = new Set(
    program.graphicSpec.objects.points.items.map(point =>
      point.properties.fill
    )
  );
  const symbolColors = program.graphicSpec.objects.colorLegendSymbols.items
    .map(symbol => symbol.properties.fill);
  const labels = program.graphicSpec.objects.colorLegendLabels.items
    .map(label => label.properties.text);

  assert.deepEqual(scale.domain, ["USA", "Japan", "Europe"]);
  assert.deepEqual(scale.range, SET2_COLORS.slice(0, 3));
  assert.deepEqual(pointColors, new Set(SET2_COLORS.slice(0, 3)));
  assert.deepEqual(symbolColors, SET2_COLORS.slice(0, 3));
  assert.deepEqual(labels, ["USA", "Japan", "Europe"]);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 760);
});

test("matches every approved primitive with a user-facing action flow", () => {
  const shapeRows = createShapeVocabularyPrimitiveValues(cars).rows;
  const pairs = [
    [
      createMirroredAxesPrimitives(cars),
      createMirroredAxesCarsScatterplot(cars),
      "createGuides"
    ],
    [
      createScaleReversePrimitives(cars),
      createScaleReverseCarsScatterplot(cars),
      "editScale"
    ],
    [
      createPointShapeDiamondPrimitives(cars),
      createDiamondCarsScatterplot(cars),
      "editPointMark"
    ],
    [
      createShapeVocabularyPrimitives(cars),
      createShapeVocabularyCarsScatterplot(shapeRows),
      "createGuides"
    ],
    [
      createCategoricalPalettePrimitives(cars),
      createPaletteCarsScatterplot(cars),
      "createGuides"
    ],
    [
      createEncodingReassignmentPrimitives(cars),
      createEncodingReassignmentCarsScatterplot(cars),
      "encodeShape"
    ],
    [
      createContinuousColorPrimitives(cars),
      createContinuousColorCarsScatterplot(cars),
      "createGuides"
    ],
    [
      createFieldOpacityPrimitives(cars),
      createFieldOpacityCarsScatterplot(cars),
      "createGuides"
    ]
  ];

  for (const [primitive, publicProgram, finalAction] of pairs) {
    const primitiveContext = createMockCanvasContext();
    const publicContext = createMockCanvasContext();
    renderCarsScatterplotPrimitives(primitive, primitiveContext);
    renderCarsScatterplotPrimitives(publicProgram, publicContext);

    assertEquivalentMeaning(publicProgram.graphicSpec, primitive.graphicSpec);
    assert.deepEqual(publicContext.calls, primitiveContext.calls);
    assert.equal(publicProgram.trace.children.at(-1).op, finalAction);
    assert.equal(publicProgram.actionStack.length, 0);
  }
});

test("authors the encoding-reassignment target as concrete primitive state", () => {
  const values = createEncodingReassignmentPrimitiveValues(cars);
  const program = createEncodingReassignmentPrimitives(cars);
  const layer = program.semanticSpec.layers[0];
  const children = program.graphicSpec.objects.points.items;

  assert.equal(values.rows.length, 392);
  assert.deepEqual(values.xDomain, [68, 455]);
  assert.deepEqual(values.yDomain, [8, 24.8]);
  assert.deepEqual(values.sizeDomain, [1613, 5140]);
  assert.deepEqual(values.colorDomain, [8, 4, 6, 3, 5]);
  assert.deepEqual(values.shapeDomain, ["USA", "Japan", "Europe"]);
  assert.deepEqual(
    Object.fromEntries(Object.entries(layer.encoding).map(
      ([channel, encoding]) => [channel, encoding.field]
    )),
    {
      x: "Displacement",
      y: "Acceleration",
      color: "Cylinders",
      size: "Weight_in_lbs",
      shape: "Origin"
    }
  );
  assert.equal(children.length, 392);
  assert.deepEqual(new Set(children.map(child => child.type)), new Set([
    "circle", "rect", "path"
  ]));
  assert.deepEqual(
    program.graphicSpec.objects.xAxisLabels.items.map(
      child => child.properties.text
    ),
    ["100", "200", "300", "400"]
  );
  assert.deepEqual(
    program.graphicSpec.objects.yAxisLabels.items.map(
      child => child.properties.text
    ),
    ["10", "15", "20"]
  );
  assert.equal(program.graphicSpec.objects.xAxisTitle.properties.text, "Displacement");
  assert.equal(program.graphicSpec.objects.yAxisTitle.properties.text, "Acceleration");
});

test("materializes quantitative color as concrete points and a gradient legend", () => {
  const values = createContinuousColorPrimitiveValues(cars);
  const program = createContinuousColorPrimitives(cars);
  const points = program.graphicSpec.objects.points.items;
  const strips = program.graphicSpec.objects.colorGradientStrips.items;
  const ticks = program.graphicSpec.objects.colorGradientTicks.items;
  const labels = program.graphicSpec.objects.colorGradientLabels.items;
  const scale = program.semanticSpec.scales.find(candidate =>
    candidate.id === "color"
  );

  assert.deepEqual(values.domain, [8, 24.8]);
  assert.deepEqual(scale.domain, values.domain);
  assert.equal(scale.type, "linear");
  assert.equal(points.length, 392);
  assert.deepEqual(
    points.map(point => point.properties.fill),
    values.fill
  );
  assert.equal(points.every(point => /^#[0-9a-f]{6}$/.test(point.properties.fill)), true);
  assert.equal(strips.length, 60);
  assert.equal(strips.every(strip => /^#[0-9a-f]{6}$/.test(strip.properties.fill)), true);
  assert.equal(strips.every((strip, index) =>
    index === strips.length - 1 ||
      strip.properties.y + strip.properties.height === strips[index + 1].properties.y
  ), true);
  assert.equal(ticks.length, 5);
  assert.deepEqual(
    labels.map(label => label.properties.text),
    ["8", "12.2", "16.4", "20.6", "24.8"]
  );
  assert.equal(graphicDrawOrder(program).indexOf("points") <
    graphicDrawOrder(program).indexOf("colorGradientStrips"), true);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 760);
});

test("materializes field opacity with ascending concrete legend samples", () => {
  const values = createFieldOpacityPrimitiveValues(cars);
  const program = createFieldOpacityPrimitives(cars);
  const layer = program.semanticSpec.layers[0];
  const points = program.graphicSpec.objects.points.items;
  const symbols = program.graphicSpec.objects.opacityLegendSymbols.items;
  const labels = program.graphicSpec.objects.opacityLegendLabels.items;
  const scale = program.semanticSpec.scales.find(candidate =>
    candidate.id === "opacity"
  );

  assert.deepEqual(values.domain, [8, 24.8]);
  assert.deepEqual(values.range, [0.2, 1]);
  assert.deepEqual(scale, {
    id: "opacity",
    type: "linear",
    domain: [8, 24.8],
    range: [0.2, 1]
  });
  assert.equal(layer.encoding.color, undefined);
  assert.deepEqual(layer.encoding.opacity, {
    field: "Acceleration",
    fieldType: "quantitative",
    scale: "opacity"
  });
  assert.deepEqual(
    points.map(point => point.properties.opacity),
    values.opacity
  );
  assert.equal(points.every(point => point.properties.fill === "#4c78a8"), true);
  assert.equal(
    symbols.every((symbol, index) =>
      Math.abs(symbol.properties.opacity - (0.2 + index * 0.2)) < 1e-12
    ),
    true
  );
  assert.deepEqual(
    labels.map(label => label.properties.text),
    ["8", "12.2", "16.4", "20.6", "24.8"]
  );
  assert.equal(graphicDrawOrder(program).indexOf("points") <
    graphicDrawOrder(program).indexOf("opacityLegendSymbols"), true);
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 760);
});
