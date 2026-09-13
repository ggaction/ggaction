import assert from "node:assert/strict";
import test from "node:test";

import { drawCircleGraphic } from
  "../../../src/renderers/canvas/circle.js";
import { drawLineGraphic } from "../../../src/renderers/canvas/line.js";
import { drawPathGraphic } from "../../../src/renderers/canvas/path.js";
import { drawRectGraphic } from "../../../src/renderers/canvas/rect.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";

const explicit = Object.freeze({
  lineCap: "round",
  lineJoin: "bevel",
  miterLimit: 3
});

const DRAW_CASES = Object.freeze([
  {
    draw: drawLineGraphic,
    properties: {
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      stroke: "black",
      strokeWidth: 2
    }
  },
  {
    draw: drawPathGraphic,
    properties: {
      commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 }],
      stroke: "black",
      strokeWidth: 2
    }
  },
  {
    draw: drawRectGraphic,
    properties: {
      x: 0,
      y: 0,
      width: 10,
      height: 5,
      fill: "white",
      stroke: "black",
      strokeWidth: 2
    }
  },
  {
    draw: drawCircleGraphic,
    properties: {
      x: 5,
      y: 5,
      radius: 3,
      fill: "white",
      stroke: "black",
      strokeWidth: 2
    }
  }
]);

test("sets and resets stroke details for every Canvas primitive", () => {
  const context = createMockCanvasContext();
  for (const [index, entry] of DRAW_CASES.entries()) {
    entry.draw(context, `explicit-${index}`, {
      properties: { ...entry.properties, ...explicit }
    });
    entry.draw(context, `default-${index}`, {
      properties: entry.properties
    });
  }

  assert.deepEqual(
    findCanvasCalls(context, "setLineCap").map(call => call.value),
    ["round", "butt", "round", "butt", "round", "butt", "round", "butt"]
  );
  assert.deepEqual(
    findCanvasCalls(context, "setLineJoin").map(call => call.value),
    ["bevel", "miter", "bevel", "miter", "bevel", "miter", "bevel", "miter"]
  );
  assert.deepEqual(
    findCanvasCalls(context, "setMiterLimit").map(call => call.value),
    [3, 10, 3, 10, 3, 10, 3, 10]
  );
});
