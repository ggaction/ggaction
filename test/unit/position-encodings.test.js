import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/core/ChartProgram.js";

function createPointProgram(values = [
  { horsepower: 50, mpg: 40 },
  { horsepower: 150, mpg: 20 }
]) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "cars", values })
    .createPointMark({ id: "points" });
}

test("encodes horizontal and vertical quantitative positions", () => {
  const before = createPointProgram();
  const program = before
    .encodeX({ field: "horsepower" })
    .encodeY({ field: "mpg" });
  const layer = program.semanticSpec.layers[0];
  const children = program.graphicSpec.objects.points.children;

  assert.deepEqual(layer.encoding, {
    x: { field: "horsepower", fieldType: "quantitative", scale: "x" },
    y: { field: "mpg", fieldType: "quantitative", scale: "y" }
  });
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "linear", domain: "auto", range: "auto" },
    { id: "y", type: "linear", domain: "auto", range: "auto" }
  ]);
  assert.deepEqual(program.resolvedScales, {
    x: { type: "linear", domain: [50, 150], range: [20, 220] },
    y: { type: "linear", domain: [20, 40], range: [140, 20] }
  });
  assert.deepEqual(
    children.map(child => child.properties.x),
    [20, 220]
  );
  assert.deepEqual(
    children.map(child => child.properties.y),
    [20, 140]
  );
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);
});

test("records the explicit nested encoding action hierarchy", () => {
  const program = createPointProgram().encodeX({ field: "horsepower" });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodeX");
  assert.deepEqual(
    node.children.map(child => child.op),
    [
      "editSemantic",
      "editSemantic",
      "editSemantic",
      "createScale",
      "rematerializeScale"
    ]
  );
  assert.deepEqual(
    node.children.at(-1).children.map(child => child.op),
    ["editGraphics"]
  );
});

test("supports explicit targets and scale definitions", () => {
  const program = createPointProgram().encodeX({
    field: "horsepower",
    target: "points",
    fieldType: "quantitative",
    scale: {
      id: "horsepower",
      type: "linear",
      domain: [0, 200],
      range: [0, 100]
    }
  });

  assert.deepEqual(program.semanticSpec.scales, [
    {
      id: "horsepower",
      type: "linear",
      domain: [0, 200],
      range: [0, 100]
    }
  ]);
  assert.deepEqual(program.resolvedScales.horsepower, {
    type: "linear",
    domain: [0, 200],
    range: [0, 100]
  });
  assert.deepEqual(
    program.graphicSpec.objects.points.children.map(child => child.properties.x),
    [25, 75]
  );
});

test("reuses an existing scale when omitted options are equivalent", () => {
  const program = createPointProgram()
    .createScale({ id: "custom", domain: [0, 200] })
    .encodeX({ field: "horsepower", scale: { id: "custom" } });

  assert.deepEqual(program.resolvedScales.custom.domain, [0, 200]);
});

test("validates position encoding inputs before changing the program", () => {
  const program = createPointProgram();

  assert.throws(() => program.encodeX(), /field must be a non-empty string/i);
  assert.throws(() => program.encodeX({ field: "missing" }), /finite number/);
  assert.throws(
    () => program.encodeX({ field: "horsepower", fieldType: "nominal" }),
    /Unsupported field type/
  );
  assert.throws(
    () => program.encodeX({ field: "horsepower", scale: { type: "log" } }),
    /Unsupported position scale type/
  );
  assert.throws(
    () => program.encodeX({ field: "horsepower", extra: true }),
    /Unknown encodeX option/
  );
  assert.throws(
    () => chart().encodeX({ field: "horsepower" }),
    /Mark id/
  );
});

test("rejects sharing one scale across x and y channels", () => {
  const withX = createPointProgram().encodeX({
    field: "horsepower",
    scale: { id: "position" }
  });

  assert.throws(
    () => withX.encodeY({ field: "mpg", scale: { id: "position" } }),
    /cannot be shared across channels/
  );
});
