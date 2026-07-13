import assert from "node:assert/strict";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsScatterplotPrimitives,
  renderCarsScatterplotPrimitives
} from "../programs/carsScatterplotPrimitives.js";
import { loadCars } from "../fixtures/data.js";

const cars = loadCars();

test("renders the cars scatterplot with manually authored axes", () => {
  const program = createCarsScatterplotPrimitives(cars);
  const context = createMockCanvasContext();

  renderCarsScatterplotPrimitives(program, context);

  assert.equal(findCanvasCalls(context, "arc").length, 392);
  assert.equal(findCanvasCalls(context, "stroke").length, 10);
  assert.equal(findCanvasCalls(context, "fillText").length, 10);
  assert.deepEqual(
    findCanvasCalls(context, "fillText").map(call => call.args[0]),
    [
      "50",
      "100",
      "150",
      "200",
      "10",
      "20",
      "30",
      "40",
      "Horsepower",
      "Miles per Gallon"
    ]
  );
  assert.deepEqual(
    new Set(program.trace.children.map(node => node.op)),
    new Set(["editSemantic", "createGraphics", "editGraphics"])
  );
  assert.deepEqual(program.actionStack, []);
});
