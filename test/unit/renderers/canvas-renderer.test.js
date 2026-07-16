import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/renderers/canvas/index.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";

function createGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 100, height: 80, background: "white" }
      },
      points: {
        type: "circle",
        items: [
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
              opacity: 0.5,
              stroke: "black",
              strokeWidth: 2
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
  assert.deepEqual(
    findCanvasCalls(context, "stroke").map(call => [
      call.strokeStyle,
      call.lineWidth
    ]),
    [["black", 2]]
  );
});

test("renders concrete children from a heterogeneous drawable collection", () => {
  const graphicSpec = createGraphicSpec();
  graphicSpec.objects.symbols = {
    type: "collection",
    items: [
      {
        id: "symbols:0",
        type: "circle",
        properties: { x: 15, y: 25, radius: 5, fill: "purple" }
      },
      {
        id: "symbols:1",
        type: "rect",
        properties: {
          x: 40,
          y: 30,
          width: 10,
          height: 12,
          fill: "orange",
          stroke: "orange",
          strokeWidth: 0
        }
      }
    ]
  };
  graphicSpec.order.push("symbols");
  const context = createMockCanvasContext();

  render({ graphicSpec }, context);

  assert.deepEqual(findCanvasCalls(context, "arc").at(-1).args, [
    15,
    25,
    5,
    0,
    Math.PI * 2
  ]);
  assert.deepEqual(findCanvasCalls(context, "fillRect").at(-1).args, [
    40,
    30,
    10,
    12
  ]);
});

test("renders attached named graphics in depth-first sibling order", () => {
  const graphicSpec = {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 100, height: 80, background: "white" },
        children: ["plot"]
      },
      plot: { type: "collection", items: [], children: ["back", "front"] },
      back: {
        type: "circle",
        properties: { x: 10, y: 20, radius: 3, fill: "red" }
      },
      front: {
        type: "circle",
        properties: { x: 30, y: 40, radius: 4, fill: "blue" }
      }
    },
    order: ["canvas"]
  };
  const context = createMockCanvasContext();

  render({ graphicSpec }, context);

  assert.deepEqual(findCanvasCalls(context, "arc").map(call => call.args.slice(0, 3)), [
    [10, 20, 3],
    [30, 40, 4]
  ]);
});

test("rejects orphaned, duplicate, cyclic, and unknown graphic attachments", () => {
  const createTree = () => ({
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 100, height: 80, background: "white" },
        children: ["plot"]
      },
      plot: { type: "collection", items: [], children: [] }
    },
    order: ["canvas"]
  });

  const orphaned = createTree();
  orphaned.objects.orphan = { type: "collection", items: [] };
  assert.throws(
    () => render({ graphicSpec: orphaned }, createMockCanvasContext()),
    /not attached/
  );

  const duplicated = createTree();
  duplicated.order.push("plot");
  assert.throws(
    () => render({ graphicSpec: duplicated }, createMockCanvasContext()),
    /attached more than once/
  );

  const cyclic = createTree();
  cyclic.objects.plot.children.push("canvas");
  assert.throws(
    () => render({ graphicSpec: cyclic }, createMockCanvasContext()),
    /attachment cycle/
  );

  const unknown = createTree();
  unknown.objects.plot.children.push("missing");
  assert.throws(
    () => render({ graphicSpec: unknown }, createMockCanvasContext()),
    /Unknown attached graphic/
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

test("renders a backend-neutral filled and stroked rect", () => {
  const program = createGraphicSpec();
  program.objects.frame = {
    type: "rect",
    properties: {
      x: 5,
      y: 6,
      width: 40,
      height: 30,
      fill: "white",
      stroke: "gray",
      strokeWidth: 1
    }
  };
  program.order.splice(1, 0, "frame");
  const context = createMockCanvasContext();

  render({ graphicSpec: program }, context);

  assert.deepEqual(findCanvasCalls(context, "fillRect")[1].args, [5, 6, 40, 30]);
  assert.equal(findCanvasCalls(context, "stroke")[0].strokeStyle, "gray");
});

test("rejects incomplete and unsupported concrete graphics", () => {
  const missingRadius = createGraphicSpec();
  delete missingRadius.objects.points.items[0].properties.radius;

  assert.throws(
    () => render({ graphicSpec: missingRadius }, createMockCanvasContext()),
    /requires a finite radius/
  );

  const unsupported = createGraphicSpec();
  unsupported.objects.points.type = "container";

  assert.throws(
    () => render({ graphicSpec: unsupported }, createMockCanvasContext()),
    /does not support "container" yet/
  );

  const invalidOpacity = createGraphicSpec();
  invalidOpacity.objects.points.items[0].properties.opacity = 2;

  assert.throws(
    () => render({ graphicSpec: invalidOpacity }, createMockCanvasContext()),
    /circle\.opacity must be between 0 and 1/
  );

  const negativeRadius = createGraphicSpec();
  negativeRadius.objects.points.items[0].properties.radius = -1;
  assert.throws(
    () => render({ graphicSpec: negativeRadius }, createMockCanvasContext()),
    /circle\.radius must not be negative/
  );

  const invalidFill = createGraphicSpec();
  invalidFill.objects.points.items[0].properties.fill = null;
  assert.throws(
    () => render({ graphicSpec: invalidFill }, createMockCanvasContext()),
    /circle\.fill must be a non-empty string/
  );
});

test("rejects invalid concrete rect appearance and dimensions", () => {
  function withRect(properties) {
    const graphicSpec = createGraphicSpec();
    graphicSpec.objects.frame = { type: "rect", properties };
    graphicSpec.order.splice(1, 0, "frame");
    return graphicSpec;
  }
  const valid = {
    x: 5,
    y: 6,
    width: 40,
    height: 30,
    fill: "white",
    stroke: "gray",
    strokeWidth: 1
  };

  for (const [patch, message] of [
    [{ width: -1 }, /rect\.width must not be negative/],
    [{ fill: null }, /rect\.fill must be a non-empty string/],
    [{ stroke: null }, /rect\.stroke must be a non-empty string/],
    [{ opacity: 2 }, /rect\.opacity must be between 0 and 1/]
  ]) {
    assert.throws(
      () => render(
        { graphicSpec: withRect({ ...valid, ...patch }) },
        createMockCanvasContext()
      ),
      message
    );
  }
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
