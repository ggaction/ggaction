import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../src/renderers/canvas.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../helpers/mockCanvasContext.js";

function createGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 100, height: 80, background: "white" }
      },
      points: {
        type: "circle",
        children: [
          {
            id: "points:0",
            properties: { x: 10, y: 20, radius: 3, fill: "red" }
          },
          {
            id: "points:1",
            properties: {
              x: 30,
              y: 40,
              radius: 4,
              fill: "blue",
              opacity: 0.5
            }
          }
        ]
      }
    },
    order: ["canvas", "points"]
  };
}

test("renders a concrete canvas and circle collection", () => {
  const graphicSpec = createGraphicSpec();
  const context = createMockCanvasContext();

  render({ graphicSpec }, context);

  assert.equal(context.canvas.width, 100);
  assert.equal(context.canvas.height, 80);
  assert.deepEqual(findCanvasCalls(context, "fillRect")[0].args, [0, 0, 100, 80]);
  assert.deepEqual(
    findCanvasCalls(context, "arc").map(call => call.args),
    [
      [10, 20, 3, 0, Math.PI * 2],
      [30, 40, 4, 0, Math.PI * 2]
    ]
  );
  assert.deepEqual(
    findCanvasCalls(context, "fill").map(call => [call.fillStyle, call.globalAlpha]),
    [
      ["red", 1],
      ["blue", 0.5]
    ]
  );
});

test("reads only graphicSpec from the supplied program", () => {
  const program = {
    graphicSpec: createGraphicSpec(),
    get semanticSpec() {
      throw new Error("semanticSpec must not be read");
    },
    get context() {
      throw new Error("context must not be read");
    },
    get trace() {
      throw new Error("trace must not be read");
    }
  };

  assert.doesNotThrow(() => render(program, createMockCanvasContext()));
});

test("renders at a higher pixel density without changing logical coordinates", () => {
  const context = createMockCanvasContext();

  render({ graphicSpec: createGraphicSpec() }, context, { pixelRatio: 2 });

  assert.equal(context.canvas.width, 200);
  assert.equal(context.canvas.height, 160);
  assert.deepEqual(findCanvasCalls(context, "scale")[0].args, [2, 2]);
  assert.deepEqual(findCanvasCalls(context, "arc")[0].args, [
    10,
    20,
    3,
    0,
    Math.PI * 2
  ]);
});

test("rejects incomplete and unsupported concrete graphics", () => {
  const missingRadius = createGraphicSpec();
  delete missingRadius.objects.points.children[0].properties.radius;

  assert.throws(
    () => render({ graphicSpec: missingRadius }, createMockCanvasContext()),
    /requires a finite radius/
  );

  const unsupported = createGraphicSpec();
  unsupported.objects.points.type = "rect";

  assert.throws(
    () => render({ graphicSpec: unsupported }, createMockCanvasContext()),
    /does not support "rect" yet/
  );

  const invalidOpacity = createGraphicSpec();
  invalidOpacity.objects.points.children[0].properties.opacity = 2;

  assert.throws(
    () => render({ graphicSpec: invalidOpacity }, createMockCanvasContext()),
    /requires opacity from 0 to 1/
  );
});

test("rejects invalid pixel ratios", () => {
  assert.throws(
    () =>
      render({ graphicSpec: createGraphicSpec() }, createMockCanvasContext(), {
        pixelRatio: 0
      }),
    /pixelRatio must be a positive finite number/
  );
});
