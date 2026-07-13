import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function barProgram(values = [{ Displacement: 68 }, { Displacement: 455 }]) {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values })
    .createBarMark({ id: "bars" });
}

test("encodes a binned quantitative bar x field with defaults", () => {
  const before = barProgram();
  const program = before.encodeX({
    field: "Displacement",
    bin: {}
  });

  assert.deepEqual(program.semanticSpec.layers, [
    {
      id: "bars",
      mark: { type: "bar" },
      data: "cars",
      coordinate: "main",
      encoding: {
        x: {
          field: "Displacement",
          fieldType: "quantitative",
          bin: { maxBins: 10 },
          scale: "x"
        }
      }
    }
  ]);
  assert.deepEqual(program.semanticSpec.scales, [
    {
      id: "x",
      type: "linear",
      domain: "auto",
      range: "auto",
      nice: true,
      zero: false
    }
  ]);
  assert.deepEqual(program.semanticSpec.coordinates, [
    { id: "main", type: "cartesian" }
  ]);
  assert.deepEqual(program.resolvedScales.x, {
    type: "linear",
    domain: [50, 500],
    range: [80, 372]
  });
  assert.deepEqual(program.graphicSpec.objects.bars, {
    type: "rect",
    children: []
  });
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeX");
  assert.deepEqual(node.children.map(child => child.op), [
    "createCoordinate",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "editSemantic",
    "createScale",
    "rematerializeScale"
  ]);
  assert.deepEqual(node.children[3].args, {
    property: "layer[bars].encoding.x.bin.maxBins",
    value: 10
  });
});

test("keeps explicit scale bounds ahead of nice and zero", () => {
  const program = barProgram([]).encodeX({
    field: "Displacement",
    bin: { maxBins: 5 },
    scale: {
      id: "displacementX",
      domain: [0, 500],
      range: [10, 210],
      nice: true,
      zero: true
    }
  });

  assert.equal(program.semanticSpec.layers[0].encoding.x.scale, "displacementX");
  assert.deepEqual(program.resolvedScales.displacementX, {
    type: "linear",
    domain: [0, 500],
    range: [10, 210]
  });
  assert.equal(program.graphicSpec.objects.bars.children.length, 0);
});

test("supports a non-nice automatic binned domain", () => {
  const program = barProgram().encodeX({
    field: "Displacement",
    bin: { maxBins: 10 },
    scale: { nice: false, zero: false }
  });

  assert.deepEqual(program.resolvedScales.x.domain, [68, 455]);
  assert.equal(program.semanticSpec.scales[0].nice, false);
});

test("validates bar bin and x scale options before changing the program", () => {
  const program = barProgram();

  assert.throws(
    () => program.encodeX({ field: "Displacement" }),
    /requires bin/
  );
  assert.throws(
    () => program.encodeX({ field: "Displacement", bin: true }),
    /plain object/
  );
  assert.throws(
    () =>
      program.encodeX({
        field: "Displacement",
        bin: { maxBins: 0 }
      }),
    /positive integer/
  );
  assert.throws(
    () =>
      program.encodeX({
        field: "Displacement",
        bin: { maxBins: 10, step: 5 }
      }),
    /Unknown bin option/
  );
  assert.throws(
    () =>
      program.encodeX({
        field: "Displacement",
        fieldType: "temporal",
        bin: {}
      }),
    /requires a quantitative field/
  );
  assert.throws(
    () =>
      program.encodeX({
        field: "Displacement",
        aggregate: "mean",
        bin: {}
      }),
    /does not support aggregate/
  );
  assert.throws(
    () =>
      program.encodeX({
        field: "Displacement",
        bin: {},
        scale: { domain: [500, 0] }
      }),
    /ascending/
  );
  assert.throws(
    () => program.encodeY({ field: "Displacement", bin: {} }),
    /requires a binned x encoding/
  );
  assert.equal(program.semanticSpec.layers[0].encoding, undefined);
});

test("rejects ambiguous binned scale sharing", () => {
  const withPoint = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "values", values: [{ value: 1 }, { value: 2 }] })
    .createPointMark({ id: "points" })
    .encodeX({
      field: "value",
      scale: { nice: true, zero: false }
    })
    .createBarMark({ id: "bars" });

  assert.throws(
    () =>
      withPoint.encodeX({
        field: "value",
        bin: {},
        scale: { nice: true, zero: false }
      }),
    /cannot be shared with an unbinned consumer/
  );

  const firstBar = barProgram()
    .encodeX({ field: "Displacement", bin: { maxBins: 10 } })
    .createBarMark({ id: "otherBars", data: "cars" });

  assert.throws(
    () =>
      firstBar.encodeX({
        target: "otherBars",
        field: "Displacement",
        bin: { maxBins: 5 }
      }),
    /one shared maxBins value/
  );
});
