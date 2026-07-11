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
  assert.equal(findCanvasCalls(context, "arc").length, 392);
  assert.equal(findCanvasCalls(context, "stroke").length, 10);
  assert.equal(findCanvasCalls(context, "fillText").length, 10);

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
  assert.deepEqual(program.actionStack, []);
});
