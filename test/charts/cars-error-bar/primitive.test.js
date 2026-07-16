import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";
import {
  createEncodedLayerInferencePrimitives,
  createErrorBarBaselinePrimitives,
  createRuleGeometryPrimitives,
  renderErrorBarBaselinePrimitives,
  renderRuleGeometryPrimitives
} from "./primitive.program.js";
import {
  createExplicitIntervalPrimitives,
  createHorizontalErrorBarPrimitives,
  createStyledCapsPrimitives
} from "./gate-c.program.js";
import {
  ERROR_BAR_COLOR,
  ERROR_BAR_VARIANT_STYLE,
  createExplicitIntervalReferenceValues,
  createEncodedLayerInferenceReferenceValues,
  createErrorBarReferenceValues,
  createHorizontalErrorBarReferenceValues,
  createStyledErrorBarReferenceValues,
  createRuleGeometryReferenceValues
} from "./reference-values.js";
import { loadCars } from "../../support/data.js";

test("authors the rule geometry gate with raw graphical primitives", () => {
  const values = createRuleGeometryReferenceValues();
  const program = createRuleGeometryPrimitives();

  assert.equal(program.semanticSpec.datasets.length, 1);
  assert.equal(program.semanticSpec.datasets[0].id, "data");
  assert.deepEqual(program.semanticSpec.datasets[0].values, values.rows);
  assert.deepEqual(
    program.semanticSpec.layers.map(layer => layer.mark.type),
    values.rules.map(() => "rule")
  );
  assert.deepEqual(
    program.graphicSpec.order.slice(1, 6),
    values.rules.map(rule => rule.id)
  );
  for (const rule of values.rules) {
    assert.deepEqual(
      program.graphicSpec.objects[rule.id].children[0].properties,
      {
        x1: rule.x1,
        y1: rule.y1,
        x2: rule.x2,
        y2: rule.y2,
        stroke: rule.stroke,
        strokeWidth: 3,
        strokeDash: [],
        opacity: 1
      }
    );
  }
  const ops = program.trace.children.map(node => node.op);
  for (const futureAction of [
    "createRuleMark",
    "encodeX2",
    "encodeStroke",
    "encodeStrokeWidth"
  ]) {
    assert.equal(ops.includes(futureAction), false, futureAction);
  }
});

test("renders exact concrete rule endpoints through the shared line renderer", () => {
  const values = createRuleGeometryReferenceValues();
  const context = createMockCanvasContext();

  renderRuleGeometryPrimitives(context);

  assert.deepEqual(
    findCanvasCalls(context, "moveTo").slice(0, 5).map(call => call.args),
    values.rules.map(rule => [rule.x1, rule.y1])
  );
  assert.deepEqual(
    findCanvasCalls(context, "lineTo").slice(0, 5).map(call => call.args),
    values.rules.map(rule => [rule.x2, rule.y2])
  );
  assert.deepEqual(
    findCanvasCalls(context, "stroke").slice(0, 5).map(call => call.strokeStyle),
    values.rules.map(rule => rule.stroke)
  );
});

test("authors the canonical error-bar gate with raw interval and line primitives", () => {
  const cars = loadCars();
  const values = createErrorBarReferenceValues(cars);
  const program = createErrorBarBaselinePrimitives(cars);
  const summary = program.semanticSpec.datasets.find(
    dataset => dataset.id === "errorBarIntervalData"
  );

  assert.equal(program.semanticSpec.datasets[0].id, "data");
  assert.deepEqual(summary, {
    id: "errorBarIntervalData",
    source: "data",
    transform: [values.transform],
    values: values.rows
  });
  assert.deepEqual(
    program.semanticSpec.layers.map(layer => [layer.id, layer.mark.type]),
    [
      ["errorBar", "rule"],
      ["errorBarLowerCap", "rule"],
      ["errorBarUpperCap", "rule"]
    ]
  );
  assert.deepEqual(program.semanticSpec.guides, {
    axis: {
      x: { scale: "x", coordinate: "main", title: "Origin" },
      y: {
        scale: "y",
        coordinate: "main",
        title: "mean(Acceleration)"
      }
    },
    grid: { horizontal: { scale: "y", coordinate: "main" } }
  });
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "errorBar",
    "errorBarLowerCap",
    "errorBarUpperCap",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "chartTitle",
    "chartSubtitle"
  ]);
  const ops = program.trace.children.map(node => node.op);
  for (const futureAction of ["createIntervalData", "createErrorBar"]) {
    assert.equal(ops.includes(futureAction), false, futureAction);
  }
});

test("stores complete main rules and fixed caps in declared order", () => {
  const cars = loadCars();
  const values = createErrorBarReferenceValues(cars);
  const program = createErrorBarBaselinePrimitives(cars);

  for (const [id, expected] of [
    ["errorBar", values.mainRules],
    ["errorBarLowerCap", values.lowerCaps],
    ["errorBarUpperCap", values.upperCaps]
  ]) {
    assert.deepEqual(
      program.graphicSpec.objects[id].children.map(child => child.properties),
      expected.map(line => ({
        ...line,
        stroke: ERROR_BAR_COLOR,
        strokeWidth: 1.5,
        strokeDash: [],
        opacity: 1
      }))
    );
  }
});

test("renders grid, main intervals, and caps before the axes", () => {
  const cars = loadCars();
  const values = createErrorBarReferenceValues(cars);
  const context = createMockCanvasContext();

  renderErrorBarBaselinePrimitives(cars, context);

  const lines = [
    ...values.horizontalGrid,
    ...values.mainRules,
    ...values.lowerCaps,
    ...values.upperCaps
  ];
  assert.deepEqual(
    findCanvasCalls(context, "moveTo").slice(0, lines.length).map(call => call.args),
    lines.map(line => [line.x1, line.y1])
  );
  assert.deepEqual(
    findCanvasCalls(context, "lineTo").slice(0, lines.length).map(call => call.args),
    lines.map(line => [line.x2, line.y2])
  );
});

test("authors an inferred error-bar overlay from an encoded point layer", () => {
  const cars = loadCars();
  const values = createEncodedLayerInferenceReferenceValues(cars);
  const program = createEncodedLayerInferencePrimitives(cars);
  const [point, main, lowerCap, upperCap] = program.semanticSpec.layers;

  assert.deepEqual(
    [point, main, lowerCap, upperCap].map(layer => [
      layer.id,
      layer.mark.type,
      layer.coordinate,
      layer.encoding.x.scale,
      layer.encoding.y.scale
    ]),
    [
      ["point", "point", "main", "x", "y"],
      ["errorBar", "rule", "main", "x", "y"],
      ["errorBarLowerCap", "rule", "main", "x", "y"],
      ["errorBarUpperCap", "rule", "main", "x", "y"]
    ]
  );
  assert.equal(point.data, "data");
  assert.equal(main.data, "errorBarIntervalData");
  assert.deepEqual(program.resolvedScales.x.domain, values.xDomain);
  assert.deepEqual(program.resolvedScales.y.domain, values.yDomain);
  assert.deepEqual(program.graphicSpec.order, [
    "canvas",
    "horizontalGridLines",
    "point",
    "errorBar",
    "errorBarLowerCap",
    "errorBarUpperCap",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "chartTitle",
    "chartSubtitle"
  ]);
  for (const [id, expected] of [
    ["errorBar", values.mainRules],
    ["errorBarLowerCap", values.lowerCaps],
    ["errorBarUpperCap", values.upperCaps]
  ]) {
    assert.deepEqual(
      program.graphicSpec.objects[id].children.map(child => child.properties),
      expected.map(line => ({
        ...line,
        stroke: ERROR_BAR_COLOR,
        strokeWidth: 1.5,
        strokeDash: [],
        opacity: 1
      }))
    );
  }
  const ops = program.trace.children.map(node => node.op);
  assert.equal(ops.includes("createIntervalData"), false);
  assert.equal(ops.includes("createErrorBar"), false);
});

test("authors horizontal x/x2 intervals with vertical fixed caps", () => {
  const cars = loadCars();
  const values = createHorizontalErrorBarReferenceValues(cars);
  const program = createHorizontalErrorBarPrimitives(cars);
  const [main, lowerCap, upperCap] = program.semanticSpec.layers;

  assert.deepEqual(Object.keys(main.encoding), [
    "y", "x", "x2", "strokeDash"
  ]);
  assert.equal(main.encoding.x.field, "__errorBar_lower");
  assert.equal(main.encoding.x2.field, "__errorBar_upper");
  assert.equal(main.encoding.y.field, "Origin");
  assert.deepEqual([lowerCap.id, upperCap.id], [
    "errorBarLowerCap", "errorBarUpperCap"
  ]);
  assert.deepEqual(program.semanticSpec.guides.grid, {
    vertical: { scale: "x", coordinate: "main" }
  });
  for (const [id, expected] of [
    ["errorBar", values.mainRules],
    ["errorBarLowerCap", values.lowerCaps],
    ["errorBarUpperCap", values.upperCaps]
  ]) {
    assert.deepEqual(
      program.graphicSpec.objects[id].children.map(child => child.properties),
      expected.map(line => ({
        ...line,
        stroke: ERROR_BAR_COLOR,
        strokeWidth: 1.5,
        strokeDash: [],
        opacity: 1
      }))
    );
  }
});

test("authors explicit interval fields without derived data or stale cap objects", () => {
  const cars = loadCars();
  const values = createExplicitIntervalReferenceValues(cars);
  const program = createExplicitIntervalPrimitives(cars);
  const [main] = program.semanticSpec.layers;

  assert.equal(program.semanticSpec.datasets.length, 1);
  assert.deepEqual(program.semanticSpec.datasets[0].values, values.sourceRows);
  assert.equal(program.semanticSpec.datasets[0].transform, undefined);
  assert.equal(main.data, "data");
  assert.equal(main.encoding.y.field, "lowerAcceleration");
  assert.equal(main.encoding.y2.field, "upperAcceleration");
  assert.deepEqual(program.semanticSpec.layers.map(layer => layer.id), ["errorBar"]);
  assert.equal(program.graphicSpec.objects.errorBarLowerCap, undefined);
  assert.equal(program.graphicSpec.objects.errorBarUpperCap, undefined);
  assert.equal(program.graphicSpec.order.includes("errorBarLowerCap"), false);
  assert.equal(program.graphicSpec.order.includes("errorBarUpperCap"), false);
});

test("authors custom cap size and one constant appearance across all rules", () => {
  const cars = loadCars();
  const values = createStyledErrorBarReferenceValues(cars);
  const program = createStyledCapsPrimitives(cars);

  for (const [id, expected] of [
    ["errorBar", values.mainRules],
    ["errorBarLowerCap", values.lowerCaps],
    ["errorBarUpperCap", values.upperCaps]
  ]) {
    assert.deepEqual(
      program.graphicSpec.objects[id].children.map(child => child.properties),
      expected.map(line => ({
        ...line,
        stroke: ERROR_BAR_VARIANT_STYLE.stroke,
        strokeWidth: ERROR_BAR_VARIANT_STYLE.strokeWidth,
        strokeDash: [...ERROR_BAR_VARIANT_STYLE.strokeDash],
        opacity: ERROR_BAR_VARIANT_STYLE.opacity
      }))
    );
  }
  for (const programFactory of [
    createHorizontalErrorBarPrimitives,
    createExplicitIntervalPrimitives,
    createStyledCapsPrimitives
  ]) {
    const ops = programFactory(cars).trace.children.map(node => node.op);
    assert.equal(ops.includes("createErrorBar"), false);
  }
});
