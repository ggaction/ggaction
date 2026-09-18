import assert from "node:assert/strict";
import test from "node:test";

import { createCanvas as createNativeCanvas } from "@napi-rs/canvas";

import { ChartProgram } from "../../../src/ChartProgram.js";
import { render } from "../../../src/renderers/canvas/index.js";
import { drawTextGraphic } from "../../../src/renderers/canvas/text.js";
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

test("normalizes numeric font weights before assigning the Canvas font", () => {
  const cases = [
    [600, "600 12px sans-serif"],
    [650, "700 12px sans-serif"],
    [700, "700 12px sans-serif"],
    [1, "100 12px sans-serif"],
    [1000, "900 12px sans-serif"],
    ["normal", "normal 12px sans-serif"],
    ["bold", "bold 12px sans-serif"]
  ];

  for (const [fontWeight, expected] of cases) {
    const context = createMockCanvasContext();
    drawTextGraphic(context, "label", {
      type: "text",
      properties: {
        x: 10,
        y: 10,
        text: "Sample",
        fill: "#000000",
        fontSize: 12,
        fontFamily: "sans-serif",
        fontWeight,
        textAlign: "left",
        textBaseline: "top"
      }
    });
    assert.equal(findCanvasCalls(context, "fillText")[0].font, expected);
  }
});

test("keeps numeric font-weight glyphs bounded on the Node Canvas backend", () => {
  const surfaces = [
    "text-mark",
    "title",
    "facet-header",
    "categorical-legend",
    "cartesian-axis-label",
    "polar-axis-label"
  ];

  for (const surface of surfaces) {
    for (const fontWeight of [650, 700]) {
      const canvas = createNativeCanvas(160, 48);
      const context = canvas.getContext("2d");
      drawTextGraphic(context, surface, {
        type: "text",
        properties: {
          x: 4,
          y: 4,
          text: surface,
          fill: "#000000",
          fontSize: 12,
          fontFamily: "sans-serif",
          fontWeight,
          textAlign: "left",
          textBaseline: "top"
        }
      });

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let firstInkY = Infinity;
      let lastInkY = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (pixels[(y * canvas.width + x) * 4 + 3] > 0) {
            firstInkY = Math.min(firstInkY, y);
            lastInkY = Math.max(lastInkY, y);
          }
        }
      }

      assert.notEqual(lastInkY, -1, `${surface} ${fontWeight} should draw ink`);
      assert.ok(
        lastInkY - firstInkY + 1 <= 24,
        `${surface} ${fontWeight} glyph height should stay within 2× fontSize`
      );
    }
  }
});

test("draws a prepared text collection through the primitive drawer", () => {
  const context = createMockCanvasContext();
  const properties = {
    y: 20,
    fill: "#333333",
    fontSize: 12,
    fontFamily: "sans-serif",
    textAlign: "center",
    textBaseline: "middle"
  };

  drawTextGraphic(context, "labels", {
    type: "text",
    items: [
      { id: "labels:0", properties: { ...properties, x: 10, text: "A" } },
      { id: "labels:1", properties: { ...properties, x: 30, text: "B" } }
    ]
  });

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

test("Canvas renders italic font style and restores normal text independently", () => {
  const properties = { x: 0, y: 0, text: "Credit", fontSize: 12,
    fontFamily: "sans-serif", fontWeight: 400, fill: "black",
    textAlign: "left", textBaseline: "middle" };
  const context = createMockCanvasContext();
  drawTextGraphic(context, "italic", { properties: { ...properties, fontStyle: "italic" } });
  drawTextGraphic(context, "normal", { properties });
  const calls = findCanvasCalls(context, "fillText");
  assert.equal(calls[0].font, "italic 400 12px sans-serif");
  assert.equal(calls[1].font, "400 12px sans-serif");
  assert.throws(() => drawTextGraphic(context, "invalid", { properties: { ...properties, fontStyle: "oblique" } }), /fontStyle/u);
});
