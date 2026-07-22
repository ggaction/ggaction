import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPNG } from "../../src/renderers/png.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

function removedAppearanceProgram() {
  return chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [
      { x: 1, y: 2, group: "A", amount: 4 },
      { x: 2, y: 4, group: "B", amount: 16 }
    ] })
    .createPointMark({ stroke: "black", strokeWidth: 2 })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .encodeSize({ field: "amount" })
    .removeEncoding({ channel: "size" })
    .removeEncoding({ channel: "color" })
    .editPointMark({ stroke: false });
}

test("renders encoding and outline teardown through Canvas and Node PNG", async () => {
  const program = removedAppearanceProgram();
  const context = createMockCanvasContext();
  const directory = await mkdtemp(join(tmpdir(), "ggaction-removal-"));

  try {
    render(program, context);
    assert.equal(findCanvasCalls(context, "arc").length, 2);
    assert.equal(findCanvasCalls(context, "fill").length, 2);
    assert.equal(findCanvasCalls(context, "stroke").every(call =>
      call.strokeStyle === "transparent" && call.lineWidth === 0
    ), true);

    const result = await renderToPNG(program, {
      output: join(directory, "encoding-removal.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 320);
    assert.equal(result.height, 240);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
