import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { deriveBarMeans } from "../../../../src/grammar/barAggregate.js";

const values = [
  { year: 1850, perc: 2 },
  { year: 1860, perc: 8 },
  { year: 1850, perc: 4 },
  { year: 1860, perc: 10 }
];

function barProgram(rows = values) {
  return chart()
    .createCanvas({
      width: 420,
      height: 300,
      margin: { top: 30, right: 40, bottom: 50, left: 60 }
    })
    .createData({ id: "jobs", values: rows })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "year", fieldType: "ordinal" });
}

test("derives immutable means in ordinal x appearance order", () => {
  const layer = barProgram()
    .editSemantic({
      property: "layer[bars].encoding.y.field",
      value: "perc"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.aggregate",
      value: "mean"
    })
    .editSemantic({
      property: "layer[bars].encoding.y.stack",
      value: null
    }).semanticSpec.layers[0];
  const derived = deriveBarMeans(values, layer);

  assert.deepEqual(derived, {
    xValues: [1850, 1860],
    yValues: [3, 9],
    values: [
      { x: 1850, y: 3, count: 2 },
      { x: 1860, y: 9, count: 2 }
    ]
  });
  assert.equal(Object.isFrozen(derived.values[0]), true);
});

test("encodes aggregate ordinal bars with inferred mean/non-stack defaults", () => {
  const before = barProgram();
  const program = before.encodeY({ field: "perc" });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.y, {
    field: "perc",
    fieldType: "quantitative",
    aggregate: "mean",
    stack: null,
    scale: "y"
  });
  assert.deepEqual(program.semanticSpec.scales[1], {
    id: "y",
    type: "linear",
    domain: "auto",
    range: "auto",
    nice: true,
    zero: false
  });
  assert.deepEqual(program.resolvedScales.y, {
    type: "linear",
    domain: [2, 10],
    range: [250, 30]
  });
  assert.deepEqual(program.graphicSpec.objects.bars.children, []);
  assert.equal(before.semanticSpec.layers[0].encoding.y, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeY");
  assert.deepEqual(node.args, { field: "perc" });
  assert.deepEqual(node.children.map(child => child.op), [
    "createCoordinate",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeBarMark"
  ]);
  assert.deepEqual(node.children.at(-1).children.map(child => child.op), [
    "rematerializeScale",
    "rematerializeScale",
    "editGraphics"
  ]);
});

test("keeps explicit aggregate y scale bounds ahead of nice and zero", () => {
  const program = barProgram().encodeY({
    field: "perc",
    aggregate: "mean",
    stack: null,
    scale: {
      id: "percentage",
      domain: [0, 20],
      range: [240, 20],
      nice: true,
      zero: true
    }
  });

  assert.equal(program.semanticSpec.layers[0].encoding.y.scale, "percentage");
  assert.deepEqual(program.resolvedScales.percentage, {
    type: "linear",
    domain: [0, 20],
    range: [240, 20]
  });
  assert.deepEqual(program.graphicSpec.objects.bars.children, []);
});

test("validates aggregate ordinal bar y requirements", () => {
  const program = barProgram();

  assert.throws(() => program.encodeY(), /field must be a non-empty string/i);
  assert.throws(
    () => program.encodeY({ field: "perc", aggregate: "count" }),
    /aggregate must be "mean"/
  );
  assert.throws(
    () => program.encodeY({ field: "perc", stack: "zero" }),
    /stack must be null/
  );
  assert.throws(
    () => program.encodeY({ field: "perc", fieldType: "temporal" }),
    /requires a quantitative field/
  );
  assert.throws(
    () => program.encodeY({ field: "perc", bin: {} }),
    /does not support bin/
  );
  assert.throws(
    () => program.encodeY({ field: "missing" }),
    /finite number/
  );

  const pointX = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "jobs", values })
    .createPointMark({ id: "points" })
    .encodeX({ field: "perc" })
    .createBarMark({ id: "bars", data: "jobs" })
    .editSemantic({ property: "layer[bars].encoding.x.field", value: "year" })
    .editSemantic({
      property: "layer[bars].encoding.x.fieldType",
      value: "quantitative"
    })
    .editSemantic({ property: "layer[bars].encoding.x.scale", value: "x" });

  assert.throws(
    () => pointX.encodeY({ target: "bars", field: "perc" }),
    /binned quantitative or ordinal x/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.y, undefined);
});
