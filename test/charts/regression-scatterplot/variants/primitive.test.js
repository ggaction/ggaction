import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import {
  createCarsRegressionScatterplotPrimitives,
  renderCarsRegressionScatterplotPrimitives
} from "../primitive.program.js";
import { createComponentEditPrimitives } from "./primitive-programs.js";

const cars = loadCars();

test("authors regression component edit targets with low-level graphic edits", () => {
  const baseline = createCarsRegressionScatterplotPrimitives(cars);
  const program = createComponentEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsRegressionScatterplotPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionBands.children.map(child => ({
      fill: child.properties.fill,
      opacity: child.properties.opacity,
      stroke: child.properties.stroke,
      strokeWidth: child.properties.strokeWidth
    })),
    Array.from({ length: 2 }, () => ({
      fill: "#475569",
      opacity: 0.12,
      stroke: "#111827",
      strokeWidth: 1.5
    }))
  );
  assert.deepEqual(
    program.graphicSpec.objects.pointsRegressionLines.children.map(
      child => child.properties.strokeWidth
    ),
    [5, 5]
  );
  assert.equal(findCanvasCalls(context, "stroke").filter(
    call => call.strokeStyle === "#111827" && call.lineWidth === 1.5
  ).length, 2);
  assert.equal(findCanvasCalls(context, "stroke").filter(
    call => call.lineWidth === 5
  ).length, 2);
});
