import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";
import { render } from "../../src/renderers/canvas.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";

function canvasProgram() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 });
}

test("renders one backend-neutral path per series", () => {
  const points = [
    [
      { x: 10, y: 90 },
      { x: 60, y: 50 },
      { x: 110, y: 70 }
    ],
    [
      { x: 10, y: 100 },
      { x: 60, y: 80 }
    ]
  ];
  const program = canvasProgram()
    .createGraphics({ id: "trends", type: "path", length: 2 })
    .editGraphics({ target: "trends", property: "points", value: points })
    .editGraphics({
      target: "trends",
      property: "stroke",
      value: ["#4c78a8", "#f58518"]
    })
    .editGraphics({ target: "trends", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "trends",
      property: "strokeDash",
      value: [[], [6, 4]]
    });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(
    findCanvasCalls(context, "moveTo").map(call => call.args),
    [[10, 90], [10, 100]]
  );
  assert.deepEqual(
    findCanvasCalls(context, "lineTo").map(call => call.args),
    [[60, 50], [110, 70], [60, 80]]
  );
  assert.deepEqual(
    findCanvasCalls(context, "setLineDash").map(call => call.value),
    [[], [6, 4]]
  );
  assert.equal(findCanvasCalls(context, "stroke").length, 2);
  assert.deepEqual(
    program.graphicSpec.objects.trends.children[0].properties.points,
    points[0]
  );
  assert.notEqual(
    program.graphicSpec.objects.trends.children[0].properties.points,
    points[0]
  );
});

test("applies and resets strokeDash on independent lines", () => {
  const program = canvasProgram()
    .createGraphics({ id: "symbols", type: "line", length: 2 })
    .editGraphics({ target: "symbols", property: "x1", value: 10 })
    .editGraphics({ target: "symbols", property: "y1", value: [30, 60] })
    .editGraphics({ target: "symbols", property: "x2", value: 40 })
    .editGraphics({ target: "symbols", property: "y2", value: [30, 60] })
    .editGraphics({ target: "symbols", property: "stroke", value: "black" })
    .editGraphics({ target: "symbols", property: "strokeWidth", value: 2 })
    .editGraphics({
      target: "symbols",
      property: "strokeDash",
      value: [[6, 4], []]
    });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(
    findCanvasCalls(context, "setLineDash").map(call => call.value),
    [[6, 4], []]
  );
});

test("rejects invalid primitive and incomplete rendered paths", () => {
  const paths = canvasProgram().createGraphics({
    id: "trends",
    type: "path",
    length: 1
  });

  assert.throws(
    () => paths.editGraphics({
      target: "trends",
      property: "points",
      value: [[{ x: 1, y: 2 }]]
    }),
    /at least two finite/
  );
  assert.throws(
    () => paths.editGraphics({
      target: "trends",
      property: "strokeDash",
      value: [[4, -1]]
    }),
    /non-negative finite/
  );
  assert.throws(
    () => render(paths, createMockCanvasContext()),
    /requires at least two finite path points/
  );
});
