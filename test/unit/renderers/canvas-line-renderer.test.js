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

test("renders a single concrete line", () => {
  const program = createCanvas(new ChartProgram())
    .createGraphics({ id: "axis", type: "line" })
    .editGraphics({ target: "axis", property: "x1", value: 10 })
    .editGraphics({ target: "axis", property: "y1", value: 70 })
    .editGraphics({ target: "axis", property: "x2", value: 90 })
    .editGraphics({ target: "axis", property: "y2", value: 70 })
    .editGraphics({ target: "axis", property: "stroke", value: "#333333" })
    .editGraphics({ target: "axis", property: "strokeWidth", value: 2 });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(findCanvasCalls(context, "moveTo")[0].args, [10, 70]);
  assert.deepEqual(findCanvasCalls(context, "lineTo")[0].args, [90, 70]);
  assert.deepEqual(findCanvasCalls(context, "stroke")[0], {
    op: "stroke",
    strokeStyle: "#333333",
    lineWidth: 2,
    globalAlpha: 1
  });
});

test("renders a line collection with per-child properties", () => {
  const program = createCanvas(new ChartProgram())
    .createGraphics({ id: "ticks", type: "line", length: 2 })
    .editGraphics({ target: "ticks", property: "x1", value: [20, 40] })
    .editGraphics({ target: "ticks", property: "y1", value: 60 })
    .editGraphics({ target: "ticks", property: "x2", value: [20, 40] })
    .editGraphics({ target: "ticks", property: "y2", value: 65 })
    .editGraphics({ target: "ticks", property: "stroke", value: "black" })
    .editGraphics({ target: "ticks", property: "strokeWidth", value: 1 });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(
    findCanvasCalls(context, "moveTo").map(call => call.args),
    [
      [20, 60],
      [40, 60]
    ]
  );
  assert.equal(findCanvasCalls(context, "stroke").length, 2);
});

test("rejects incomplete concrete lines", () => {
  const program = createCanvas(new ChartProgram()).createGraphics({
    id: "axis",
    type: "line"
  });

  assert.throws(
    () => render(program, createMockCanvasContext()),
    /requires a finite x1 property/
  );
});
