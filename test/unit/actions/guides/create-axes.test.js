import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function encodedProgram({ x = true, y = true } = {}) {
  let program = chart()
    .createCanvas({
      width: 400,
      height: 280,
      margin: { top: 20, right: 20, bottom: 60, left: 70 }
    })
    .createData({
      id: "cars",
      values: [
        { horsepower: 100, mpg: 30 },
        { horsepower: 200, mpg: 20 }
      ]
    })
    .createPointMark({ id: "points", data: "cars" });

  if (x) program = program.encodeX({ field: "horsepower" });
  if (y) program = program.encodeY({ field: "mpg" });
  return program;
}

test("createAxes reads a stored Cartesian coordinate and creates both axes", () => {
  const before = encodedProgram();
  const program = before.createAxes({
    x: { title: { text: "Horsepower" } },
    y: { title: { text: "Miles per Gallon" } }
  });

  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.equal(program.semanticSpec.layers[0].coordinate, "main");
  assert.deepEqual(program.semanticSpec.coordinates, before.semanticSpec.coordinates);
  assert.equal(before.semanticSpec.layers[0].coordinate, "main");
  assert.equal(program.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(program.semanticSpec.guides.axis.y.scale, "y");
  assert.equal(program.semanticSpec.guides.axis.x.coordinate, "main");
  assert.equal(program.semanticSpec.guides.axis.y.coordinate, "main");

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "createAxes");
  assert.deepEqual(node.children.map(child => child.op), [
    "createXAxis",
    "createYAxis"
  ]);
});

test("createAxes creates only encoded axes and supports false opt-out", () => {
  const xOnly = encodedProgram({ y: false }).createAxes();
  assert.ok(xOnly.semanticSpec.guides.axis.x);
  assert.equal(xOnly.semanticSpec.guides.axis.y, undefined);

  const withoutY = encodedProgram().createAxes({ y: false });
  assert.ok(withoutY.semanticSpec.guides.axis.x);
  assert.equal(withoutY.semanticSpec.guides.axis.y, undefined);
  assert.deepEqual(
    withoutY.trace.children.at(-1).children.map(child => child.op),
    ["createXAxis"]
  );
});

test("createAxes reuses an explicitly named coordinate", () => {
  const program = chart()
    .createCanvas({
      width: 400,
      height: 280,
      margin: { top: 20, right: 20, bottom: 60, left: 70 }
    })
    .createData({
      id: "cars",
      values: [
        { horsepower: 100, mpg: 30 },
        { horsepower: 200, mpg: 20 }
      ]
    })
    .createPointMark({ id: "points", data: "cars" })
    .encodeX({ field: "horsepower", coordinate: "plot" })
    .encodeY({ field: "mpg", coordinate: "plot" })
    .createAxes({
    coordinate: { id: "plot", type: "auto" },
    x: { position: "bottom" },
    y: { position: "left" }
  });

  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "plot", type: "cartesian" }
  ]);
  assert.equal(program.semanticSpec.layers[0].coordinate, "plot");
});

test("createAxes requires explicit scale selection when a channel is ambiguous", () => {
  const program = encodedProgram({ y: false })
    .createData({ id: "other", values: [{ value: 10 }, { value: 20 }] })
    .createPointMark({ id: "otherPoints", data: "other" })
    .encodeX({
      target: "otherPoints",
      field: "value",
      scale: { id: "otherX" }
    });

  assert.throws(
    () => program.createAxes(),
    /multiple x-axis scales/
  );

  const resolved = program.createAxes({ x: { scale: "x" } });
  assert.equal(resolved.semanticSpec.guides.axis.x.scale, "x");
});

test("createAxes rejects missing, disabled, incomplete Polar, and mixed channels", () => {
  const empty = chart();
  assert.throws(() => empty.createAxes(), /requires an x or y encoding/);

  const encoded = encodedProgram();
  assert.throws(
    () => encoded.createAxes({ x: false, y: false }),
    /at least one selected axis/
  );
  assert.throws(
    () => encoded.createAxes({ coordinate: { type: "polar" } }),
    /has type "cartesian", not "polar"/
  );

  const polar = chart()
    .createData({ id: "polarData", values: [{ angle: 1 }] })
    .createPointMark({ id: "polarPoints", data: "polarData" })
    .createCoordinate({ id: "polar", type: "polar", layers: ["polarPoints"] })
    .editSemantic({
      property: "layer[polarPoints].encoding.theta.field",
      value: "angle"
    });
  assert.throws(() => polar.createAxes(), /stored theta encoding/);

  const mixed = encoded.editSemantic({
    property: "layer[points].encoding.theta.field",
    value: "horsepower"
  });
  assert.throws(() => mixed.createAxes(), /mixed Cartesian and Polar/);

  const missingCoordinate = chart()
    .createData({ id: "raw", values: [{ value: 1 }] })
    .createPointMark({ id: "rawPoints", data: "raw" })
    .editSemantic({
      property: "layer[rawPoints].encoding.x.scale",
      value: "x"
    });
  assert.throws(
    () => missingCoordinate.createAxes(),
    /stored coordinate/
  );
});

test("createAxes ignores a separate Polar layer when selecting Cartesian axes", () => {
  const program = encodedProgram()
    .createData({ id: "polarData", values: [{ angle: 1 }] })
    .createPointMark({ id: "polarPoints", data: "polarData" })
    .createCoordinate({
      id: "polar",
      type: "polar",
      layers: ["polarPoints"]
    })
    .editSemantic({
      property: "layer[polarPoints].encoding.theta.field",
      value: "angle"
    })
    .createAxes();

  assert.equal(program.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(program.semanticSpec.guides.axis.y.scale, "y");
});

test("createAxes validates its public options", () => {
  const program = encodedProgram();

  assert.throws(
    () => program.createAxes({ x: true }),
    /must be false or a plain object/
  );
  assert.throws(
    () => program.createAxes({ coordinate: "main" }),
    /must be a plain object/
  );
  assert.throws(
    () => program.createAxes({ coordinate: { type: "radial" } }),
    /Unknown createAxes coordinate type/
  );
  assert.throws(
    () => program.createAxes({ extra: true }),
    /Unknown createAxes option/
  );
});

test("createAxes rejects conflicting family assertions and channel options atomically", () => {
  const rows = [{ x: 1, y: 2 }, { x: 2, y: 3 }];
  const programs = {
    cartesian: encodedProgram(),
    polar: chart().createCanvas().createData({ values: [{ c: "a", v: 2 }, { c: "b", v: 3 }] })
      .createRosePlot({ category: "c", value: "v", aggregate: "sum", color: false, guides: false }),
    parallel: chart().createCanvas().createData({ values: rows })
      .createParallelCoordinates({ dimensions: [{ field: "x" }, { field: "y" }], guides: false })
  };
  for (const [family, program] of Object.entries(programs)) {
    const before = { semantic: program.semanticSpec, graphic: program.graphicSpec, trace: program.trace };
    const id = program.semanticSpec.coordinates[0].id;
    for (const type of Object.keys(programs)) {
      if (type === family) {
        const inferred = program.createAxes();
        assert.deepEqual(program.createAxes({ coordinate: { id, type } }).graphicSpec, inferred.graphicSpec);
        assert.deepEqual(program.createAxes({ coordinate: { type } }).graphicSpec, inferred.graphicSpec);
        assert.deepEqual(program.createAxes({ coordinate: { id, type: "auto" } }).graphicSpec, inferred.graphicSpec);
      } else {
        assert.throws(() => program.createAxes({ coordinate: { type } }), /coordinate type conflicts|has type/);
        assert.throws(() => program.createAxes({ coordinate: { id, type } }), /has type/);
      }
    }
    for (const channel of family === "cartesian" ? ["theta", "radius"]
      : family === "polar" ? ["x", "y"] : ["x", "y", "theta", "radius"]) {
      for (const value of [{}, false]) {
        assert.throws(() => program.createAxes({ [channel]: value }), /require Polar|require Cartesian|not supported for Parallel/);
      }
    }
    assert.throws(() => program.createAxes({ coordinate: { id: "missing" } }), /Unknown coordinate/);
    assert.throws(() => program.createAxes({ coordinate: { id: "bad id" } }), /Coordinate id must/);
    assert.equal(program.semanticSpec, before.semantic);
    assert.equal(program.graphicSpec, before.graphic);
    assert.equal(program.trace, before.trace);
  }
});
