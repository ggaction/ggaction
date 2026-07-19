import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chart } from "../../src/index.js";
import { render } from "../../src/renderers/canvas/index.js";
import { renderToPNG } from "../../src/renderers/png.js";
import {
  createMockCanvasContext,
  findCanvasCalls
} from "../support/canvas.js";

const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);
const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, size: 1 }),
  Object.freeze({ x: 2, y: 4, size: 9 })
]);

function cartesianPointProgram() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("materializes a default Cartesian point radius for Browser and PNG rendering", async () => {
  const program = cartesianPointProgram();
  const context = createMockCanvasContext();
  const directory = await mkdtemp(join(tmpdir(), "ggaction-point-radius-"));

  try {
    assert.deepEqual(
      program.graphicSpec.objects.point.items.map(item => item.properties.radius),
      [3, 3]
    );
    render(program, context);
    assert.deepEqual(
      findCanvasCalls(context, "arc").map(call => call.args[2]),
      [3, 3]
    );

    const result = await renderToPNG(program, {
      output: join(directory, "default-radius.png"),
      pixelRatio: 2
    });
    const png = await readFile(result.output);
    assert.deepEqual([...png.subarray(0, 8)], PNG_SIGNATURE);
    assert.equal(result.width, 480);
    assert.equal(result.height, 360);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("lets explicit radius and field-driven size override the default immutably", () => {
  const base = cartesianPointProgram();
  const explicit = base.encodePointRadius({ value: 5 });
  const sized = base.encodeSize({ field: "size" });
  const resized = base.editCanvas({ width: 300 });

  assert.deepEqual(
    base.graphicSpec.objects.point.items.map(item => item.properties.radius),
    [3, 3]
  );
  assert.deepEqual(
    explicit.graphicSpec.objects.point.items.map(item => item.properties.radius),
    [5, 5]
  );
  assert.notDeepEqual(
    sized.graphicSpec.objects.point.items.map(item => item.properties.radius),
    [3, 3]
  );
  assert.deepEqual(
    resized.graphicSpec.objects.point.items.map(item => item.properties.radius),
    [3, 3]
  );
  assert.equal(base.resolvedScales.size, undefined);
  assert.equal(Object.hasOwn(base.semanticSpec.layers[0].encoding, "size"), false);
  assert.deepEqual(rows, [
    { x: 1, y: 2, size: 1 },
    { x: 2, y: 4, size: 9 }
  ]);
});

test("materializes the same default glyph radius for Polar point positions", () => {
  const program = chart()
    .createCanvas({ width: 200, height: 200, margin: 20 })
    .createData({ values: [{ angle: 0, distance: 1 }] })
    .createPointMark()
    .encodeTheta({ field: "angle" })
    .encodeR({ field: "distance" });
  const context = createMockCanvasContext();

  assert.equal(
    program.graphicSpec.objects.point.items[0].properties.radius,
    3
  );
  render(program, context);
  assert.equal(findCanvasCalls(context, "arc")[0].args[2], 3);
});
