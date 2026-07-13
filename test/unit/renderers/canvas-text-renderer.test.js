import assert from "node:assert/strict";
import test from "node:test";

import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { render } from "../../../src/renderers/canvas/index.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";

function createCanvas(program) {
  return program
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 100 })
    .editGraphics({ target: "canvas", property: "height", value: 80 });
}

function editTextProperties(program, target) {
  return program
    .editGraphics({ target, property: "fill", value: "#333333" })
    .editGraphics({ target, property: "fontSize", value: 12 })
    .editGraphics({ target, property: "fontFamily", value: "sans-serif" })
    .editGraphics({ target, property: "fontWeight", value: 600 })
    .editGraphics({ target, property: "textAlign", value: "center" })
    .editGraphics({ target, property: "textBaseline", value: "middle" });
}

test("renders a rotated concrete text graphic", () => {
  let program = createCanvas(new ChartProgram()).createGraphics({
    id: "title",
    type: "text"
  });
  program = editTextProperties(program, "title")
    .editGraphics({ target: "title", property: "x", value: 12 })
    .editGraphics({ target: "title", property: "y", value: 40 })
    .editGraphics({ target: "title", property: "text", value: "Mileage" })
    .editGraphics({
      target: "title",
      property: "rotation",
      value: -Math.PI / 2
    });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(findCanvasCalls(context, "translate")[0].args, [12, 40]);
  assert.deepEqual(findCanvasCalls(context, "rotate")[0].args, [-Math.PI / 2]);
  assert.deepEqual(findCanvasCalls(context, "fillText")[0], {
    op: "fillText",
    args: ["Mileage", 0, 0],
    fillStyle: "#333333",
    globalAlpha: 1,
    font: "600 12px sans-serif",
    textAlign: "center",
    textBaseline: "middle"
  });
});

test("renders a text collection with distributed positions and values", () => {
  let program = createCanvas(new ChartProgram()).createGraphics({
    id: "labels",
    type: "text",
    length: 2
  });
  program = editTextProperties(program, "labels")
    .editGraphics({ target: "labels", property: "x", value: [20, 40] })
    .editGraphics({ target: "labels", property: "y", value: 70 })
    .editGraphics({ target: "labels", property: "text", value: ["A", "B"] });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(
    findCanvasCalls(context, "translate").map(call => call.args),
    [
      [20, 70],
      [40, 70]
    ]
  );
  assert.deepEqual(
    findCanvasCalls(context, "fillText").map(call => call.args[0]),
    ["A", "B"]
  );
});

test("rejects incomplete concrete text graphics", () => {
  const program = createCanvas(new ChartProgram()).createGraphics({
    id: "title",
    type: "text"
  });

  assert.throws(
    () => render(program, createMockCanvasContext()),
    /requires a finite x property/
  );
});
