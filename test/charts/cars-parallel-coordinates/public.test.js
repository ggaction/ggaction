import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createCarsParallelCoordinates } from
  "../../../examples/cars-parallel-coordinates/program.js";
import { resolveMarkSelection } from
  "../../../src/materialization/selection/state.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { createCarsParallelPrimitiveResult } from "./primitive.program.js";

const cars = loadCars();

test("creates the approved Parallel facade hierarchy and state", () => {
  const program = createCarsParallelCoordinates(cars);
  const facade = program.trace.children.find(
    node => node.op === "createParallelCoordinates"
  );
  const layer = program.semanticSpec.layers[0];

  assertChartProgramsEquivalent({
    primitiveProgram: createCarsParallelPrimitiveResult(cars).program,
    publicProgram: program,
    compareSemanticSpec: false
  });

  assert.deepEqual(facade.children.map(node => node.op), [
    "createCoordinate",
    "createLineMark",
    "encodeParallelCoordinates",
    "encodeColor",
    "createGuides"
  ]);
  assert.equal(layer.id, "parallelCoordinates");
  assert.equal(layer.coordinate, "parallel");
  assert.deepEqual(
    layer.encoding.parallel.dimensions.map(dimension => dimension.field),
    [
      "Miles_per_Gallon",
      "Horsepower",
      "Weight_in_lbs",
      "Acceleration"
    ]
  );
  assert.deepEqual(
    layer.encoding.parallel.dimensions.map(dimension =>
      program.resolvedScales[dimension.scale].domain
    ),
    [[5, 30], [0, 250], [1000, 5000], [6, 21]]
  );
  assert.equal(program.graphicSpec.objects.parallelCoordinates.items.length, 35);
  assert.equal(program.graphicSpec.objects.parallelAxisLines.items.length, 4);
  assert.equal(program.graphicSpec.objects.seriesLegendSymbols.items.length, 3);
});

test("matches the approved primitive renderer calls exactly", () => {
  const primitive = createCarsParallelPrimitiveResult(cars).program;
  const publicProgram = createCarsParallelCoordinates(cars);
  const primitiveContext = createMockCanvasContext();
  const publicContext = createMockCanvasContext();

  render(primitive, primitiveContext);
  render(publicProgram, publicContext);
  assert.deepEqual(publicContext.calls, primitiveContext.calls);
});

test("rematerializes paths and dimension axes through shared lifecycle plans", () => {
  const original = createCarsParallelCoordinates(cars);
  const resized = original.editCanvas({ width: 960 });
  const scaleId = original.semanticSpec.layers[0]
    .encoding.parallel.dimensions[0].scale;
  const reversed = resized.editScale({ id: scaleId, reverse: true });

  assert.notDeepEqual(
    resized.graphicSpec.objects.parallelCoordinates.items[0].properties.commands,
    original.graphicSpec.objects.parallelCoordinates.items[0].properties.commands
  );
  assert.notDeepEqual(
    resized.graphicSpec.objects.parallelAxisLines.items.map(item => item.properties.x1),
    original.graphicSpec.objects.parallelAxisLines.items.map(item => item.properties.x1)
  );
  assert.notEqual(
    reversed.graphicSpec.objects.parallelCoordinates.items[0]
      .properties.commands[0].y,
    resized.graphicSpec.objects.parallelCoordinates.items[0]
      .properties.commands[0].y
  );
  assert.notDeepEqual(
    reversed.graphicSpec.objects.parallelAxisLabels.items.map(
      item => item.properties.y
    ),
    resized.graphicSpec.objects.parallelAxisLabels.items.map(
      item => item.properties.y
    )
  );
  assert.deepEqual(original.graphicSpec.objects.canvas.properties, {
    width: 860,
    height: 500,
    background: "white"
  });
});

test("selects and highlights one semantic item per source row", () => {
  const program = createCarsParallelCoordinates(cars);
  const selection = resolveMarkSelection(program, "parallelCoordinates", {
    field: "Origin",
    op: "eq",
    value: "Japan"
  });
  const highlighted = program.highlightMarks({
    target: "parallelCoordinates",
    select: { field: "Origin", op: "eq", value: "Japan" },
    strokeWidth: 3,
    dimOthers: { opacity: 0.1 }
  });

  assert.equal(selection.items.length, 35);
  assert.equal(selection.keys.length, 2);
  assert.equal(selection.keys.every(key => key.includes("/row/")), true);
  assert.equal(
    highlighted.graphicSpec.objects.parallelCoordinates.items.filter(
      item => item.properties.strokeWidth === 3
    ).length,
    2
  );
  assert.equal(
    highlighted.graphicSpec.objects.parallelCoordinates.items.filter(
      item => item.properties.opacity === 0.1
    ).length,
    33
  );
});

test("filters Parallel rows and rematerializes dependent paths and guides", () => {
  const original = createCarsParallelCoordinates(cars);
  const filtered = original.filterMarks({
    target: "parallelCoordinates",
    field: "Origin",
    op: "eq",
    value: "Japan"
  });

  assert.equal(filtered.graphicSpec.objects.parallelCoordinates.items.length, 2);
  assert.equal(filtered.graphicSpec.objects.seriesLegendSymbols.items.length, 1);
  assert.deepEqual(filtered.resolvedScales.color.domain, ["Japan"]);
  assert.notDeepEqual(
    filtered.graphicSpec.objects.parallelAxisLabels.items.map(
      item => item.properties.text
    ),
    original.graphicSpec.objects.parallelAxisLabels.items.map(
      item => item.properties.text
    )
  );
});

test("supports existing line appearance actions and rejects facade errors atomically", () => {
  const styled = createCarsParallelCoordinates(cars)
    .encodeStrokeDash({
      target: "parallelCoordinates",
      field: "Origin",
      fieldType: "nominal"
    });
  const before = createCarsParallelCoordinates(cars);
  const serialized = JSON.stringify(before);

  assert.equal(
    styled.graphicSpec.objects.parallelCoordinates.items.some(
      item => item.properties.strokeDash.length > 0
    ),
    true
  );
  assert.throws(
    () => before.createParallelCoordinates({ dimensions: ["A"] }),
    /explicit createparallelcoordinates id|at least two dimensions/i
  );
  assert.equal(JSON.stringify(before), serialized);
});
