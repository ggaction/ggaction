import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import {
  createCurveMonotoneEditPrimitives,
  createCurveStepPrimitives
} from "./phase2-primitives.program.js";
import {
  createCarsLineCurvePrimitiveValues,
  createMonotoneReferenceCommands,
  createStepReferenceCommands
} from "./phase2-reference-values.js";
import {
  createCarsLineChartPrimitives,
  renderCarsLineChartPrimitives
} from "./primitive.program.js";

const cars = loadCars();

function withoutTrends(graphicSpec) {
  const { trends: _, ...objects } = graphicSpec.objects;
  return { objects, order: graphicSpec.order };
}

test("locks the midpoint step command fixture independently", () => {
  assert.deepEqual(
    createStepReferenceCommands([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 1 }
    ]),
    [
      { op: "M", x: 0, y: 0 },
      { op: "L", x: 1, y: 0 },
      { op: "L", x: 1, y: 2 },
      { op: "L", x: 2, y: 2 },
      { op: "L", x: 3, y: 2 },
      { op: "L", x: 3, y: 1 },
      { op: "L", x: 4, y: 1 }
    ]
  );
});

test("locks the monotone cubic command fixture independently", () => {
  assert.deepEqual(
    createMonotoneReferenceCommands([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 1 }
    ]),
    [
      { op: "M", x: 0, y: 0 },
      {
        op: "C",
        x1: 2 / 3,
        y1: 2 / 3,
        x2: 2 - 2 / 3,
        y2: 2,
        x: 2,
        y: 2
      },
      {
        op: "C",
        x1: 8 / 3,
        y1: 2,
        x2: 10 / 3,
        y2: 4 / 3,
        x: 4,
        y: 1
      }
    ]
  );
  assert.throws(
    () => createMonotoneReferenceCommands([
      { x: 1, y: 0 },
      { x: 1, y: 2 }
    ]),
    /strictly increasing x/
  );
});

test("authors the approved-target step geometry with raw primitive commands", () => {
  const values = createCarsLineCurvePrimitiveValues(cars);
  const baseline = createCarsLineChartPrimitives(cars);
  const program = createCurveStepPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsLineChartPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(withoutTrends(program.graphicSpec), withoutTrends(baseline.graphicSpec));
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands
    ),
    values.stepCommands
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands.length
    ),
    [34, 34, 34]
  );
  assert.equal(findCanvasCalls(context, "bezierCurveTo").length, 0);
  assert.equal(findCanvasCalls(context, "lineTo").length, 123);
  assert.deepEqual(baseline.graphicSpec.objects.trends.children.map(
    child => child.properties.commands.length
  ), [12, 12, 12]);
});

test("authors the approved-target monotone edit with cubic commands", () => {
  const values = createCarsLineCurvePrimitiveValues(cars);
  const baseline = createCarsLineChartPrimitives(cars);
  const program = createCurveMonotoneEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsLineChartPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(withoutTrends(program.graphicSpec), withoutTrends(baseline.graphicSpec));
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.commands
    ),
    values.monotoneCommands
  );
  assert.deepEqual(
    program.graphicSpec.objects.trends.children.map(
      child => child.properties.strokeWidth
    ),
    [4, 4, 4]
  );
  assert.equal(findCanvasCalls(context, "bezierCurveTo").length, 33);
  assert.equal(findCanvasCalls(context, "lineTo").length, 24);
  assert.deepEqual(baseline.graphicSpec.objects.trends.children.map(
    child => child.properties.strokeWidth
  ), [2, 2, 2]);
});

test("keeps curve primitive programs free of future public curve actions", () => {
  for (const program of [
    createCurveStepPrimitives(cars),
    createCurveMonotoneEditPrimitives(cars)
  ]) {
    const operations = program.trace.children.map(node => node.op);
    assert.equal(operations.includes("editLineMark"), false);
    assert.equal(operations.includes("createLineMark"), false);
    assert.equal(operations.at(-1), "editGraphics");
    assert.deepEqual(program.actionStack, []);
  }
});
