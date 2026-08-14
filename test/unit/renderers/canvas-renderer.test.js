import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  drawResolvedGraphicSpec,
  render,
  requireProgramGraphicSpec,
  resolveGraphicRenderTarget
} from "../../../src/renderers/canvas/index.js";
import { drawRectGraphic } from "../../../src/renderers/canvas/rect.js";
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

test("draws a resolved graphic target without a Canvas backing store", () => {
  const graphicSpec = createGraphicSpec();
  const target = resolveGraphicRenderTarget(
    requireProgramGraphicSpec({ graphicSpec })
  );
  const context = createMockCanvasContext();
  delete context.canvas;
  delete context.clearRect;
  delete context.scale;

  drawResolvedGraphicSpec(target, context);

  assert.equal(target.width, 100);
  assert.equal(target.height, 80);
  assert.deepEqual(findCanvasCalls(context, "fillRect")[0].args, [0, 0, 100, 80]);
  assert.deepEqual(
    findCanvasCalls(context, "arc").map(call => call.args.slice(0, 3)),
    [
      [10, 20, 3],
      [30, 40, 4]
    ]
  );
  assert.equal(findCanvasCalls(context, "clearRect").length, 0);
  assert.equal(findCanvasCalls(context, "scale").length, 0);
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

test("renders an item-local linear gradient on a concrete rect", () => {
  const graphicSpec = {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 120, height: 90, background: "white" }
      },
      strip: {
        type: "rect",
        properties: {
          x: 20,
          y: 10,
          width: 40,
          height: 70,
          fill: {
            type: "linear-gradient",
            from: { x: 0.5, y: 1 },
            to: { x: 0.5, y: 0 },
            stops: [
              { offset: 0, color: "rgba(207, 225, 242, 0)" },
              { offset: 0.5, color: "rgba(79, 142, 195, 0.7)" },
              { offset: 1, color: "rgba(10, 74, 144, 1)" }
            ]
          },
          stroke: "#cbd5e1",
          strokeWidth: 1
        }
      }
    },
    order: ["canvas", "strip"]
  };
  const context = createMockCanvasContext();

  render({ graphicSpec }, context);

  assert.deepEqual(findCanvasCalls(context, "createLinearGradient")[0].args, [
    40, 80, 40, 10
  ]);
  assert.deepEqual(
    findCanvasCalls(context, "addColorStop").map(call => [call.offset, call.color]),
    [
      [0, "rgba(207, 225, 242, 0)"],
      [0.5, "rgba(79, 142, 195, 0.7)"],
      [1, "rgba(10, 74, 144, 1)"]
    ]
  );
  assert.equal(findCanvasCalls(context, "fillRect").at(-1).fillStyle.type, "mock-linear-gradient");
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
  assert.equal(findCanvasCalls(context, "save").length, 2);
  assert.equal(findCanvasCalls(context, "restore").length, 2);
});

test("renders nested Canvas scopes without resizing the physical backing store", () => {
  const graphicSpec = {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 500, height: 320, background: "#f1f5f9" },
        children: ["leftPanel"]
      },
      leftPanel: {
        type: "canvas",
        properties: {
          x: 24,
          y: 30,
          width: 220,
          height: 180,
          background: "white"
        },
        children: ["panelPoint"]
      },
      panelPoint: {
        type: "circle",
        properties: { x: 35, y: 42, radius: 4, fill: "#4c78a8" }
      }
    },
    order: ["canvas"]
  };
  const context = createMockCanvasContext();

  render({ graphicSpec }, context, { pixelRatio: 2 });

  assert.equal(context.canvas.width, 1000);
  assert.equal(context.canvas.height, 640);
  assert.equal(findCanvasCalls(context, "clearRect").length, 1);
  assert.deepEqual(findCanvasCalls(context, "translate").map(call => call.args), [
    [24, 30]
  ]);
  assert.deepEqual(findCanvasCalls(context, "rect").map(call => call.args), [
    [0, 0, 220, 180]
  ]);
  assert.equal(findCanvasCalls(context, "clip").length, 1);
  assert.deepEqual(findCanvasCalls(context, "fillRect").map(call => call.args), [
    [0, 0, 500, 320],
    [0, 0, 220, 180]
  ]);
  assert.deepEqual(findCanvasCalls(context, "arc")[0].args.slice(0, 3), [
    35, 42, 4
  ]);
  assert.equal(findCanvasCalls(context, "save").length, 2);
  assert.equal(findCanvasCalls(context, "restore").length, 2);
});

test("requires complete nested Canvas geometry and clipping support", () => {
  const base = {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 100, height: 80 },
        children: ["panel"]
      },
      panel: {
        type: "canvas",
        properties: { x: 1, y: 2, width: 40, height: 30 }
      }
    },
    order: ["canvas"]
  };
  const missingX = structuredClone(base);
  delete missingX.objects.panel.properties.x;
  assert.throws(
    () => render({ graphicSpec: missingX }, createMockCanvasContext()),
    /requires a finite x/
  );
  const missingClip = createMockCanvasContext();
  delete missingClip.clip;
  assert.throws(
    () => render({ graphicSpec: base }, missingClip),
    /requires Canvas context clip/
  );
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
  assert.equal(context.canvas.style.width, "100px");
  assert.equal(context.canvas.style.height, "80px");
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

test("draws rect collections with item-local identity and opacity", () => {
  const context = createMockCanvasContext();

  drawRectGraphic(context, "bars", {
    items: [
      {
        properties: {
          x: 2,
          y: 3,
          width: 4,
          height: 5,
          fill: "red",
          stroke: "black",
          strokeWidth: 1
        }
      },
      {
        id: "bars:custom",
        properties: {
          x: 8,
          y: 9,
          width: 10,
          height: 11,
          fill: "blue",
          stroke: "navy",
          strokeWidth: 2,
          opacity: 0.25
        }
      }
    ]
  });

  assert.deepEqual(findCanvasCalls(context, "fillRect").map(call => call.args), [
    [2, 3, 4, 5],
    [8, 9, 10, 11]
  ]);
  assert.deepEqual(findCanvasCalls(context, "stroke").map(call => [
    call.strokeStyle,
    call.lineWidth,
    call.globalAlpha
  ]), [
    ["black", 1, 1],
    ["navy", 2, 0.25]
  ]);
});

test("rejects missing required rect paint properties", () => {
  const valid = {
    x: 2,
    y: 3,
    width: 4,
    height: 5,
    fill: "red",
    stroke: "black",
    strokeWidth: 1
  };

  for (const [property, message] of [
    ["fill", /requires a fill property/],
    ["stroke", /requires a string stroke property/]
  ]) {
    const properties = { ...valid };
    delete properties[property];
    assert.throws(
      () => drawRectGraphic(createMockCanvasContext(), "frame", { properties }),
      message
    );
  }
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

test("rejects unsafe raster allocations before mutating the Canvas", () => {
  const cases = [
    [Number.MAX_VALUE, 1, 2, /finite safe integers/],
    [32_768, 1, 1, /must not exceed 32767/],
    [4_097, 4_096, 1, /pixel count must not exceed 16777216/]
  ];

  for (const [width, height, pixelRatio, message] of cases) {
    const graphicSpec = createGraphicSpec();
    graphicSpec.objects.canvas.properties.width = width;
    graphicSpec.objects.canvas.properties.height = height;
    const context = createMockCanvasContext();
    context.canvas.width = 7;
    context.canvas.height = 9;
    context.canvas.style.width = "unchanged";

    assert.throws(
      () => render({ graphicSpec }, context, { pixelRatio }),
      message
    );
    assert.deepEqual(context.canvas, {
      width: 7,
      height: 9,
      style: { width: "unchanged" }
    });
    assert.equal(context.calls.length, 0);
  }
});

test("preflights every Canvas-backed native geometry family atomically", () => {
  const limit = 16_777_216;
  const graphic = (type, properties) => ({
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 10, height: 10 }
      },
      native: { type, properties }
    },
    order: ["canvas", "native"]
  });
  const line = {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    stroke: "black",
    strokeWidth: 1
  };
  const cases = [
    graphic("circle", { x: limit, y: 0, radius: 1, fill: "red" }),
    graphic("rect", {
      x: limit,
      y: 0,
      width: 1,
      height: 1,
      fill: "red",
      stroke: "none",
      strokeWidth: 0
    }),
    graphic("line", { ...line, x1: limit + 1 }),
    graphic("line", { ...line, strokeWidth: limit + 1 }),
    graphic("line", { ...line, strokeDash: [1, limit + 1] }),
    graphic("path", {
      commands: [
        { op: "M", x: 0, y: 0 },
        { op: "C", x1: limit + 1, y1: 0, x2: 1, y2: 1, x: 2, y: 2 }
      ],
      stroke: "black",
      strokeWidth: 1
    }),
    graphic("text", {
      x: 0,
      y: 0,
      text: "unsafe",
      fill: "black",
      fontFamily: "Arial",
      fontSize: limit + 1,
      textAlign: "left",
      textBaseline: "top"
    }),
    graphic("rect", {
      x: 0,
      y: 0,
      width: limit,
      height: limit,
      fill: {
        type: "linear-gradient",
        from: { x: 0, y: 0 },
        to: { x: 1, y: 1 },
        stops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "blue" }
        ]
      },
      stroke: "none",
      strokeWidth: 0
    }),
    {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 10, height: 10 },
          children: ["outer"]
        },
        outer: {
          type: "canvas",
          properties: { x: limit, y: 0, width: 0, height: 1 },
          children: ["inner"]
        },
        inner: {
          type: "canvas",
          properties: { x: 1, y: 0, width: 0, height: 1 }
        }
      },
      order: ["canvas"]
    },
    {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 10, height: 10 },
          children: ["panel"]
        },
        panel: {
          type: "canvas",
          properties: { x: limit, y: 0, width: 0, height: 1 },
          children: ["point"]
        },
        point: {
          type: "circle",
          properties: { x: 1, y: 0, radius: 0.25, fill: "red" }
        }
      },
      order: ["canvas"]
    },
    {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 10, height: 10 },
          children: ["panel"]
        },
        panel: {
          type: "canvas",
          properties: { x: limit, y: 0, width: 1, height: 1 }
        }
      },
      order: ["canvas"]
    }
  ];

  for (const graphicSpec of cases) {
    const context = createMockCanvasContext();
    context.canvas.width = 7;
    context.canvas.height = 9;
    context.canvas.style.width = "unchanged";
    assert.throws(
      () => render({ graphicSpec }, context),
      /Canvas (?:native geometry|linear gradient geometry|nested translation).*16777216/
    );
    assert.deepEqual(context.canvas, {
      width: 7,
      height: 9,
      style: { width: "unchanged" }
    });
    assert.equal(context.calls.length, 0);
  }
});

test("rejects invalid native scalars before mutating the Canvas", () => {
  for (const [property, value] of [
    ["x", NaN],
    ["x", Infinity],
    ["x", "1"],
    ["x", null],
    ["radius", -1],
    ["opacity", 2]
  ]) {
    const graphicSpec = createGraphicSpec();
    graphicSpec.objects.points.items[0].properties[property] = value;
    const context = createMockCanvasContext();
    context.canvas.width = 7;
    context.canvas.height = 9;

    assert.throws(
      () => render({ graphicSpec }, context),
      /Canvas native geometry must be finite|circle\.(?:radius|opacity)/
    );
    assert.equal(context.canvas.width, 7);
    assert.equal(context.canvas.height, 9);
    assert.equal(context.calls.length, 0);
  }
});

test("rejects native-precision pixel ratios before mutating the Canvas", () => {
  for (const pixelRatio of [Number.MIN_VALUE, 16_777_217]) {
    const context = createMockCanvasContext();
    context.canvas.width = 7;
    context.canvas.height = 9;
    assert.throws(
      () => render({ graphicSpec: createGraphicSpec() }, context, { pixelRatio }),
      /Canvas pixelRatio/
    );
    assert.equal(context.canvas.width, 7);
    assert.equal(context.canvas.height, 9);
    assert.equal(context.calls.length, 0);
  }

  const graphicSpec = createGraphicSpec();
  graphicSpec.objects.canvas.properties.width = Number.MIN_VALUE;
  graphicSpec.objects.canvas.properties.height = Number.MIN_VALUE;
  graphicSpec.objects.points.items = [{
    id: "points:0",
    properties: { x: 2, y: 0, radius: 0.25, fill: "red" }
  }];
  const context = createMockCanvasContext();
  context.canvas.width = 7;
  context.canvas.height = 9;
  assert.throws(
    () => render({ graphicSpec }, context, { pixelRatio: 16_777_216 }),
    /Canvas native geometry/
  );
  assert.equal(context.canvas.width, 7);
  assert.equal(context.canvas.height, 9);
  assert.equal(context.calls.length, 0);
});

test("contains native Canvas panic regressions in a subprocess", () => {
  const source = `
    import { createCanvas } from "@napi-rs/canvas";
    import { render } from "./src/renderers/canvas/index.js";
    const graphicSpec = {
      objects: {
        canvas: { type: "canvas", properties: { width: 10, height: 10 } },
        unsafe: {
          type: "circle",
          properties: { x: Number.MAX_VALUE, y: 0, radius: 1, fill: "red" }
        }
      },
      order: ["canvas", "unsafe"]
    };
    try {
      render({ graphicSpec }, createCanvas(1, 1).getContext("2d"));
    } catch (error) {
      if (error instanceof RangeError && /16777216/.test(error.message)) {
        process.stdout.write("bounded");
        process.exit(0);
      }
    }
    process.exit(2);
  `;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 10_000 }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, "bounded");
});
