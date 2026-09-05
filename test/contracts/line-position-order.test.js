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
  Object.freeze({ x: 1, y: 2, series: "A" }),
  Object.freeze({ x: 2, y: 3, series: "A" }),
  Object.freeze({ x: 1, y: 4, series: "B" }),
  Object.freeze({ x: 2, y: 6, series: "B" })
]);

function base(values = rows) {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values })
    .createLineMark({ id: "line" });
}

function encodeDirectLine(program, first) {
  return first === "x"
    ? program
        .encodeX({ field: "x", fieldType: "quantitative", target: "line" })
        .encodeY({ field: "y", fieldType: "quantitative", target: "line" })
    : program
        .encodeY({ field: "y", fieldType: "quantitative", target: "line" })
        .encodeX({ field: "x", fieldType: "quantitative", target: "line" });
}

function orderedScales(program) {
  return [...program.semanticSpec.scales].sort((left, right) =>
    left.id.localeCompare(right.id)
  );
}

function permutations(values) {
  return values.length === 0 ? [[]] : values.flatMap((value, index) =>
    permutations(values.filter((_, other) => other !== index)).map(rest => [value, ...rest])
  );
}

test("converges across all position, color, and stroke-dash authoring orders", () => {
  const initial = base();
  const before = JSON.stringify(initial);
  const encoders = {
    x: program => program.encodeX({ field: "x", target: "line" }),
    y: program => program.encodeY({ field: "y", target: "line" }),
    color: program => program.encodeColor({ field: "series", target: "line" }),
    dash: program => program.encodeStrokeDash({ field: "series", target: "line" })
  };
  const reference = Object.values(encoders).reduce((program, encode) => encode(program), initial);
  assert.equal(reference.graphicSpec.objects.line.items.length, 2);
  for (const order of permutations(Object.keys(encoders))) {
    let program = initial;
    const applied = new Set();
    for (const key of order) {
      program = encoders[key](program);
      applied.add(key);
      if (!applied.has("x") || !applied.has("y")) {
        assert.deepEqual(program.graphicSpec.objects.line.items, [], order.join(","));
      }
    }
    assert.deepEqual(program.semanticSpec.layers, reference.semanticSpec.layers, order.join(","));
    assert.deepEqual(orderedScales(program), orderedScales(reference));
    assert.deepEqual(program.resolvedScales, reference.resolvedScales);
    assert.deepEqual(program.graphicSpec, reference.graphicSpec);
  }
  assert.equal(JSON.stringify(initial), before);
});

test("preserves constant stroke dash before, between, and after position assignments", () => {
  const initial = base().encodeGroup({ field: "series" });
  const before = JSON.stringify(initial);
  const steps = [
    program => program.encodeX({ field: "x" }),
    program => program.encodeY({ field: "y" }),
    program => program.encodeStrokeDash({ value: [6, 2] })
  ];
  const reference = steps.reduce((program, encode) => encode(program), initial);
  for (const order of permutations(steps)) {
    const result = order.reduce((program, encode) => encode(program), initial);
    assert.deepEqual(result.semanticSpec.layers, reference.semanticSpec.layers);
    assert.deepEqual(result.graphicSpec, reference.graphicSpec);
    assert.equal(result.graphicSpec.objects.line.items.length, 2);
  }
  assert.equal(JSON.stringify(initial), before);
});

test("converges for quantitative x then y and y then x", () => {
  const initial = base();
  const xPartial = initial.encodeX({ field: "x", target: "line" });
  const xThenY = xPartial.encodeY({ field: "y", target: "line" });
  const yThenX = encodeDirectLine(initial, "y");

  assert.equal(xPartial.semanticSpec.layers[0].encoding.x.field, "x");
  assert.equal(xPartial.semanticSpec.layers[0].encoding.y, undefined);
  assert.deepEqual(xPartial.graphicSpec.objects.line.items, []);
  assert.deepEqual(xThenY.semanticSpec.layers, yThenX.semanticSpec.layers);
  assert.deepEqual(orderedScales(xThenY), orderedScales(yThenX));
  assert.deepEqual(xThenY.resolvedScales, yThenX.resolvedScales);
  assert.deepEqual(xThenY.graphicSpec, yThenX.graphicSpec);
  assert.equal(xThenY.graphicSpec.objects.line.items[0].properties.commands.length, 4);
  assert.deepEqual(initial.semanticSpec.layers[0].encoding, undefined);
  assert.deepEqual(initial.graphicSpec.objects.line.items, []);
  assert.deepEqual(rows, [
    { x: 1, y: 2, series: "A" },
    { x: 2, y: 3, series: "A" },
    { x: 1, y: 4, series: "B" },
    { x: 2, y: 6, series: "B" }
  ]);
});

test("keeps grouped quantitative lines independent of position action order", () => {
  const xThenY = encodeDirectLine(base(), "x")
    .encodeGroup({ field: "series" });
  const yThenX = encodeDirectLine(base(), "y")
    .encodeGroup({ field: "series" });

  assert.deepEqual(xThenY.semanticSpec.layers, yThenX.semanticSpec.layers);
  assert.deepEqual(orderedScales(xThenY), orderedScales(yThenX));
  assert.deepEqual(xThenY.resolvedScales, yThenX.resolvedScales);
  assert.deepEqual(xThenY.graphicSpec, yThenX.graphicSpec);
  assert.equal(xThenY.graphicSpec.objects.line.items.length, 2);
});

test("does not reinterpret a quantitative x partial as an aggregate line", () => {
  const partial = base().encodeX({ field: "x", target: "line" });
  const before = JSON.stringify(partial);

  assert.throws(
    () => partial.encodeY({ field: "y", aggregate: "mean", target: "line" }),
    /requires a temporal or binned quantitative x encoding/
  );
  assert.equal(JSON.stringify(partial), before);
});

test("preserves temporal aggregate line behavior", () => {
  const values = [
    { date: "2020-01-01", value: 2 },
    { date: "2020-01-01", value: 4 },
    { date: "2021-01-01", value: 8 }
  ];
  const program = base(values)
    .encodeX({ field: "date", fieldType: "temporal", target: "line" })
    .encodeY({ field: "value", aggregate: "mean", target: "line" });

  assert.equal(program.semanticSpec.layers[0].encoding.y.aggregate, "mean");
  assert.equal(program.graphicSpec.objects.line.items[0].properties.commands.length, 2);
});

test("renders the x-first quantitative line through Browser Canvas and Node PNG", async () => {
  const program = encodeDirectLine(base(rows.slice(0, 2)), "x");
  const context = createMockCanvasContext();
  const directory = await mkdtemp(join(tmpdir(), "ggaction-line-order-"));

  try {
    render(program, context);
    assert.equal(findCanvasCalls(context, "moveTo").length, 1);
    assert.equal(findCanvasCalls(context, "lineTo").length, 1);

    const result = await renderToPNG(program, {
      output: join(directory, "x-first-line.png"),
      pixelRatio: 2
    });
    assert.equal(result.width, 480);
    assert.equal(result.height, 360);
    assert.equal(result.bytes > 0, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
