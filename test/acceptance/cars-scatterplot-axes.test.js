import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";
import {
  createCarsScatterplotAxes,
  renderCarsScatterplotAxes
} from "../programs/carsScatterplotAxes.js";

const cars = JSON.parse(
  readFileSync(new URL("../../data/cars.json", import.meta.url), "utf8")
);

test("renders the cars scatterplot with manually authored axes", () => {
  const program = createCarsScatterplotAxes(cars);
  const context = createMockCanvasContext();

  renderCarsScatterplotAxes(program, context);

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
