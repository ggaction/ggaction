import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { getPositionCoordinateDefaults } from "../../../../src/grammar/coordinates.js";

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
  assert.equal(layer.coordinate, "main");
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
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
  assert.equal(before.semanticSpec.layers[0].coordinate, undefined);
  assert.deepEqual(before.semanticSpec.coordinates, []);
});

test("records the explicit nested encoding action hierarchy", () => {
  const program = createPointProgram().encodeX({ field: "horsepower" });
  const node = program.trace.children.at(-1);

  assert.equal(node.op, "encodeX");
  assert.deepEqual(
    node.children.map(child => child.op),
    [
      "createCoordinate",
      "editSemantic",
      "editSemantic",
      "editSemantic",
      "createScale",
      "rematerializeScale",
      "rematerializePointMark"
    ]
  );
  assert.deepEqual(
    node.children[0].children.map(child => child.op),
    ["editSemantic", "editSemantic"]
  );
  assert.deepEqual(
    node.children.at(-1).children.map(child => child.op),
    ["editGraphics", "editGraphics"]
  );
  assert.deepEqual(
    node.children.at(-1).children.map(child => child.args.property),
    ["x", "fill"]
  );
});

test("maps temporal and ordinal point positions without rewriting source data", () => {
  const values = [
    { year: 1980, origin: "USA" },
    { year: "1990-08-05", origin: "Japan" }
  ];
  const program = createPointProgram(values)
    .encodeX({ field: "year", fieldType: "temporal" })
    .encodeY({ field: "origin", fieldType: "ordinal" });

  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
  assert.deepEqual(program.resolvedScales.x.domain, [
    Date.UTC(1980, 0, 1),
    Date.UTC(1990, 7, 5)
  ]);
  assert.deepEqual(program.resolvedScales.y.domain, ["USA", "Japan"]);
  assert.deepEqual(
    program.graphicSpec.objects.points.children.map(child => child.properties.y),
    [50, 110]
  );
});

test("materializes horizontal bars from temporal string categories", () => {
  const values = [
    { date: "1990-08-05", value: 1, group: "A" },
    { date: "1990-08-05", value: 2, group: "B" },
    { date: "1997/08/21", value: 3, group: "A" },
    { date: "1997/08/21", value: 4, group: "B" }
  ];
  const program = chart()
    .createCanvas({
      width: 500,
      height: 300,
      margin: { top: 20, right: 120, bottom: 50, left: 70 }
    })
    .createData({ id: "values", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "value", aggregate: "mean" })
    .encodeY({ field: "date", fieldType: "temporal" })
    .encodeColor({ field: "group", layout: "stack" })
    .encodeBarWidth({ band: 0.72 });
  const rectangles = program.graphicSpec.objects.bars.children;

  assert.equal(rectangles.length, 4);
  assert.equal(new Set(rectangles.map(child => child.properties.y)).size, 2);
  assert.equal(rectangles.every(child => child.properties.height > 0), true);
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
  assert.deepEqual(
    program.semanticSpec.layers[0].encoding.y,
    { field: "date", fieldType: "temporal", scale: "y" }
  );
});

test("supports explicit targets and scale definitions", () => {
  const program = createPointProgram().encodeX({
    field: "horsepower",
    target: "points",
    fieldType: "quantitative",
    coordinate: "plot",
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
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "plot", type: "cartesian" }
  ]);
  assert.equal(program.semanticSpec.layers[0].coordinate, "plot");
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
  assert.equal(
    program.encodeX({ field: "horsepower", fieldType: "nominal" })
      .semanticSpec.layers[0].encoding.x.fieldType,
    "nominal"
  );
  assert.equal(
    program.encodeX({ field: "horsepower", scale: { type: "log" } })
      .semanticSpec.scales[0].type,
    "log"
  );
  assert.throws(
    () => program.encodeX({ field: "horsepower", scale: { type: "band" } }),
    /not valid for quantitative-position/
  );
  assert.throws(
    () => program.encodeX({ field: "horsepower", extra: true }),
    /Unknown encodeX option/
  );
  assert.throws(
    () => chart().encodeX({ field: "horsepower" }),
    /requires an eligible layer/
  );
});

test("infers the only eligible mark when authoring context is absent", () => {
  const program = createPointProgram()._clone({ context: {} });
  const encoded = program.encodeX({ field: "horsepower" });

  assert.equal(encoded.semanticSpec.layers[0].encoding.x.field, "horsepower");
  assert.equal(program.semanticSpec.layers[0].encoding, undefined);
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

test("reuses a layer coordinate and rejects incompatible coordinate choices", () => {
  const attached = createPointProgram().createCoordinate({
    id: "plot",
    type: "cartesian",
    layers: ["points"]
  });
  const encoded = attached.encodeX({ field: "horsepower" });

  assert.equal(encoded.semanticSpec.layers[0].coordinate, "plot");
  assert.deepEqual(encoded.semanticSpec.coordinates, [
    { id: "plot", type: "cartesian" }
  ]);
  assert.throws(
    () => attached.encodeX({ field: "horsepower", coordinate: "other" }),
    /already uses coordinate/
  );

  const polar = createPointProgram().createCoordinate({
    id: "polar",
    type: "polar",
    layers: ["points"]
  });
  assert.throws(
    () => polar.encodeX({ field: "horsepower" }),
    /requires a cartesian coordinate/
  );
});

test("position coordinate defaults include future Polar channels", () => {
  assert.deepEqual(getPositionCoordinateDefaults("x"), {
    id: "main",
    type: "cartesian"
  });
  assert.deepEqual(getPositionCoordinateDefaults("theta"), {
    id: "polar",
    type: "polar"
  });
  assert.deepEqual(getPositionCoordinateDefaults("radius"), {
    id: "polar",
    type: "polar"
  });
  assert.throws(
    () => getPositionCoordinateDefaults("color"),
    /Unknown positional channel/
  );
});
