import assert from "node:assert/strict";
import test from "node:test";

import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { loadCars } from "../../support/data.js";
import { createCarsTemporalBarLinePrimitives } from "./primitive.program.js";

test("authors Gate K-A only through semantic and graphic primitives", () => {
  const program = createCarsTemporalBarLinePrimitives(loadCars());
  const context = createMockCanvasContext();
  render(program, context);

  const bars = program.semanticSpec.layers.find(layer => layer.id === "bars");
  const trend = program.semanticSpec.layers.find(layer => layer.id === "trend");
  assert.equal(bars.encoding.x.scale, "x");
  assert.equal(trend.encoding.x.scale, "x");
  assert.equal(bars.encoding.y.scale, "y");
  assert.equal(trend.encoding.y.scale, "y");
  assert.equal(program.graphicSpec.objects.bars.items.length, 12);
  assert.equal(program.graphicSpec.objects.trend.type, "path");
  assert.equal(context.calls.some(call => call.op === "fillRect"), true);
  assert.equal(context.calls.some(call => call.op === "lineTo"), true);
  assert.equal(program.trace.children.some(node => node.op === "createBarMark"), false);
  assert.equal(program.trace.children.some(node => node.op === "createLineMark"), false);
  assert.equal(program.trace.children.some(node => node.op === "encodeX"), false);
  assert.equal(program.trace.children.some(node => node.op === "encodeY"), false);
});

test("aligns every bar center and top with the shared line vertex", () => {
  const program = createCarsTemporalBarLinePrimitives(loadCars());
  const bars = program.graphicSpec.objects.bars.items;
  const commands = program.graphicSpec.objects.trend.properties.commands;

  assert.equal(commands.length, bars.length);
  bars.forEach((bar, index) => {
    assert.ok(Math.abs(
      bar.properties.x + bar.properties.width / 2 - commands[index].x
    ) < 1e-9);
    assert.equal(bar.properties.y, commands[index].y);
  });
  assert.deepEqual(program.graphicSpec.objects["plot-main"].children.slice(0, 3), [
    "horizontalGridLines", "bars", "trend"
  ]);
});
