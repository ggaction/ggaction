import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../../support/canvas.js";
import { loadCars } from "../../../support/data.js";
import {
  createCarsDensityAreaPrimitives,
  renderCarsDensityAreaPrimitives
} from "../primitive.program.js";
import { createAreaOutlineEditPrimitives } from "./primitive-programs.js";

const cars = loadCars();

test("authors the density area outline target with low-level graphic edits", () => {
  const baseline = createCarsDensityAreaPrimitives(cars);
  const program = createAreaOutlineEditPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsDensityAreaPrimitives(program, context);

  assert.deepEqual(program.semanticSpec, baseline.semanticSpec);
  assert.deepEqual(program.graphicSpec.order, baseline.graphicSpec.order);
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => ({
      opacity: child.properties.opacity,
      stroke: child.properties.stroke,
      strokeWidth: child.properties.strokeWidth
    })),
    Array.from({ length: 3 }, () => ({
      opacity: 0.35,
      stroke: "#334155",
      strokeWidth: 1.5
    }))
  );
  const outlinedStrokes = findCanvasCalls(context, "stroke").filter(
    call => call.strokeStyle === "#334155" && call.lineWidth === 1.5
  );
  assert.equal(outlinedStrokes.length, 3);
  for (const stroke of outlinedStrokes) {
    assert.equal(stroke.globalAlpha, 0.35);
  }
});
