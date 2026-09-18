import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { render } from "../../../src/renderers/canvas/index.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../../support/canvas.js";

function canvasProgram() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 });
}

test("renders one backend-neutral command path per series", () => {
  const commands = [
    [
      { op: "M", x: 10, y: 90 },
      { op: "L", x: 60, y: 50 },
      { op: "C", x1: 70, y1: 40, x2: 90, y2: 60, x: 110, y: 70 }
    ],
    [
      { op: "M", x: 10, y: 100 },
      { op: "L", x: 60, y: 80 }
    ]
  ];
  const program = canvasProgram()
    .createGraphics({ id: "trends", type: "path", length: 2 })
    .editGraphics({ target: "trends", property: "commands", value: commands })
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
    [[60, 50], [60, 80]]
  );
  assert.deepEqual(
    findCanvasCalls(context, "bezierCurveTo").map(call => call.args),
    [[70, 40, 90, 60, 110, 70]]
  );
  assert.deepEqual(
    findCanvasCalls(context, "setLineDash").map(call => call.value),
    [[], [6, 4]]
  );
  assert.equal(findCanvasCalls(context, "stroke").length, 2);
  assert.deepEqual(
    program.graphicSpec.objects.trends.items[0].properties.commands,
    commands[0]
  );
  assert.notEqual(
    program.graphicSpec.objects.trends.items[0].properties.commands,
    commands[0]
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

test("fills a closed path without requiring a stroke", () => {
  const program = canvasProgram()
    .createGraphics({ id: "band", type: "path" })
    .editGraphics({
      target: "band",
      property: "commands",
      value: [
        { op: "M", x: 10, y: 80 },
        { op: "L", x: 70, y: 40 },
        { op: "L", x: 70, y: 60 },
        { op: "L", x: 10, y: 100 },
        { op: "Z" }
      ]
    })
    .editGraphics({ target: "band", property: "fill", value: "#111111" })
    .editGraphics({ target: "band", property: "opacity", value: 0.18 });
  const context = createMockCanvasContext();

  render(program, context);

  assert.equal(findCanvasCalls(context, "closePath").length, 1);
  assert.equal(findCanvasCalls(context, "fill").at(-1).fillStyle, "#111111");
  assert.equal(findCanvasCalls(context, "fill").at(-1).globalAlpha, 0.18);
  assert.equal(findCanvasCalls(context, "stroke").length, 0);
});

test("fills then strokes a closed path", () => {
  const program = canvasProgram()
    .createGraphics({ id: "area", type: "path" })
    .editGraphics({
      target: "area",
      property: "commands",
      value: [
        { op: "M", x: 10, y: 80 },
        { op: "L", x: 80, y: 30 },
        { op: "L", x: 80, y: 90 },
        { op: "Z" }
      ]
    })
    .editGraphics({ target: "area", property: "fill", value: "pink" })
    .editGraphics({ target: "area", property: "stroke", value: "red" })
    .editGraphics({ target: "area", property: "strokeWidth", value: 2 });
  const context = createMockCanvasContext();

  render(program, context);

  const appearanceCalls = context.calls
    .map(call => call.op)
    .filter(op => op === "fill" || op === "stroke");
  assert.deepEqual(appearanceCalls, ["fill", "stroke"]);
});

test("resolves closed-path gradient bounds without stroke extent", () => {
  const program = canvasProgram()
    .createGraphics({ id: "area", type: "path" })
    .editGraphics({
      target: "area",
      property: "commands",
      value: [
        { op: "M", x: 10, y: 80 },
        { op: "L", x: 70, y: 20 },
        { op: "L", x: 90, y: 70 },
        { op: "Z" }
      ]
    })
    .editGraphics({
      target: "area",
      property: "fill",
      value: {
        type: "linear-gradient",
        from: { x: 0, y: 0.5 },
        to: { x: 1, y: 0.5 },
        stops: [
          { offset: 0, color: "#eff6ff" },
          { offset: 1, color: "#1d4ed8" }
        ]
      }
    })
    .editGraphics({ target: "area", property: "stroke", value: "black" })
    .editGraphics({ target: "area", property: "strokeWidth", value: 12 });
  const context = createMockCanvasContext();

  render(program, context);

  assert.deepEqual(findCanvasCalls(context, "createLinearGradient")[0].args, [
    10, 50, 90, 50
  ]);
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
      property: "commands",
      value: [[]]
    }),
    /at least one command/
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
    /requires concrete path commands/
  );

  const noAppearance = paths
    .editGraphics({
      target: "trends",
      property: "commands",
      value: [[
        { op: "M", x: 1, y: 2 },
        { op: "L", x: 3, y: 4 }
      ]]
    });
  assert.throws(
    () => render(noAppearance, createMockCanvasContext()),
    /requires a fill or stroke/
  );

  const openFill = noAppearance
    .editGraphics({ target: "trends", property: "fill", value: "red" });
  assert.throws(
    () => render(openFill, createMockCanvasContext()),
    /requires a final Z command when filled/
  );

  assert.throws(
    () => noAppearance.editGraphics({
      target: "trends",
      property: "commands",
      value: [[
        { op: "L", x: 1, y: 2 },
        { op: "L", x: 3, y: 4 }
      ]]
    }),
    /must start with M/
  );
});
