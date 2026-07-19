import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2 }),
  Object.freeze({ x: 2, y: 5 }),
  Object.freeze({ x: 3, y: 8 })
]);

function layeredBase() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: rows })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("turns an inherited opposite position into a horizontal datum span", () => {
  const base = layeredBase();
  const inherited = base.createRuleMark({ id: "threshold" });
  const program = inherited.encodeY({
    datum: 5,
    fieldType: "quantitative"
  });
  const layer = program.semanticSpec.layers.find(item => item.id === "threshold");
  const properties = program.graphicSpec.objects.threshold.items[0].properties;
  const resized = program.editCanvas({ width: 300 });
  const rescaled = resized.editScale({ id: "y", domain: [0, 10] });

  assert.deepEqual(Object.keys(layer.encoding), ["y"]);
  assert.equal(layer.encoding.y.datum, 5);
  assert.equal(program.graphicSpec.objects.threshold.items.length, 1);
  assert.equal(properties.x1, 20);
  assert.equal(properties.x2, 220);
  assert.equal(properties.y1, properties.y2);
  assert.equal(
    resized.graphicSpec.objects.threshold.items[0].properties.x2,
    280
  );
  assert.equal(
    rescaled.graphicSpec.objects.threshold.items[0].properties.y1,
    90
  );
  assert.deepEqual(
    Object.keys(inherited.semanticSpec.layers.find(
      item => item.id === "threshold"
    ).encoding),
    ["x", "y"]
  );
  assert.deepEqual(inherited.markConfigs.threshold.inheritedPosition, {
    source: "points",
    channels: ["x", "y"]
  });
  assert.equal(program.markConfigs.threshold.inheritedPosition, undefined);
  assert.equal(base.semanticSpec.layers.some(item => item.id === "threshold"), false);
  assert.deepEqual(rows, [
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 8 }
  ]);
});

test("turns the symmetric inherited position into a vertical datum span", () => {
  const program = layeredBase()
    .createRuleMark({ id: "threshold" })
    .encodeX({ datum: 2, fieldType: "quantitative" });
  const layer = program.semanticSpec.layers.find(item => item.id === "threshold");
  const properties = program.graphicSpec.objects.threshold.items[0].properties;

  assert.deepEqual(Object.keys(layer.encoding), ["x"]);
  assert.equal(properties.x1, properties.x2);
  assert.equal(properties.y1, 20);
  assert.equal(properties.y2, 160);
});

test("renders the inferred datum span through Browser Canvas and Node PNG", async () => {
  const program = layeredBase()
    .createRuleMark({ id: "threshold" })
    .encodeY({ datum: 5, fieldType: "quantitative" })
    .encodeStroke({ value: "#dc2626" });
  const context = createMockCanvasContext();
  const directory = await mkdtemp(join(tmpdir(), "ggaction-datum-span-"));

  try {
    render(program, context);
    assert.deepEqual(findCanvasCalls(context, "moveTo").at(-1).args, [20, 90]);
    assert.deepEqual(findCanvasCalls(context, "lineTo").at(-1).args, [220, 90]);
    assert.equal(findCanvasCalls(context, "stroke").at(-1).strokeStyle, "#dc2626");

    const result = await renderToPNG(program, {
      output: join(directory, "datum-span.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 480);
    assert.equal(result.height, 360);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keeps explicit-data datum spans independent from layered provenance", () => {
  const horizontal = layeredBase()
    .createRuleMark({ id: "horizontal", data: "data" })
    .encodeY({ datum: 5, fieldType: "quantitative" });
  const vertical = layeredBase()
    .createRuleMark({ id: "vertical", data: "data" })
    .encodeX({ datum: 2, fieldType: "quantitative" });

  assert.equal(horizontal.graphicSpec.objects.horizontal.items.length, 1);
  assert.equal(vertical.graphicSpec.objects.vertical.items.length, 1);
  assert.equal(horizontal.markConfigs.horizontal.inheritedPosition, undefined);
  assert.equal(vertical.markConfigs.vertical.inheritedPosition, undefined);
});

test("preserves inherited orthogonal fields for interval construction", () => {
  const lower = layeredBase()
    .createRuleMark({ id: "interval" })
    .encodeY({ field: "y", fieldType: "quantitative" });
  const interval = lower.encodeY2({
    datum: 8,
    fieldType: "quantitative"
  });
  const layer = interval.semanticSpec.layers.find(item => item.id === "interval");

  assert.equal(layer.encoding.x.field, "x");
  assert.equal(layer.encoding.y.field, "y");
  assert.equal(layer.encoding.y2.datum, 8);
  assert.equal(interval.graphicSpec.objects.interval.items.length, rows.length);
  assert.deepEqual(lower.markConfigs.interval.inheritedPosition, {
    source: "points",
    channels: ["x"]
  });
});

test("keeps field-based full spans available through explicit data", () => {
  const program = layeredBase()
    .createRuleMark({ id: "field-threshold", data: "data" })
    .encodeY({ field: "y", fieldType: "quantitative" });

  assert.equal(program.graphicSpec.objects["field-threshold"].items.length, rows.length);
  assert.deepEqual(
    program.graphicSpec.objects["field-threshold"].items.map(
      item => [item.properties.x1, item.properties.x2]
    ),
    rows.map(() => [20, 220])
  );
});
