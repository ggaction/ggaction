import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const values = [68, 100, 120, 455].map(Displacement => ({ Displacement }));

function barProgram() {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values })
    .createBarMark({ id: "bars" });
}

test("matches explicit x/y histogram encoding with defaults", () => {
  const before = barProgram();
  const explicit = before
    .encodeX({ field: "Displacement", bin: { maxBins: 10 } })
    .encodeY();
  const program = before.encodeHistogram({ field: "Displacement" });

  assert.deepEqual(program.semanticSpec, explicit.semanticSpec);
  assert.deepEqual(program.resolvedScales, explicit.resolvedScales);
  assert.deepEqual(program.graphicSpec, explicit.graphicSpec);
  assert.equal(before.semanticSpec.layers[0].encoding, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeHistogram");
  assert.deepEqual(node.children.map(child => child.op), [
    "encodeX",
    "encodeY"
  ]);
  assert.deepEqual(node.children[0].args, {
    field: "Displacement",
    bin: { maxBins: 10 }
  });
  assert.deepEqual(node.children[1].args, { stack: "zero" });
});

test("forwards explicit target, coordinate, stack, and scale options", () => {
  const program = barProgram().encodeHistogram({
    field: "Displacement",
    target: "bars",
    coordinate: "plot",
    maxBins: 4,
    stack: "zero",
    xScale: {
      id: "displacementX",
      domain: [0, 500],
      range: [10, 210],
      nice: false,
      zero: false
    },
    yScale: {
      id: "countY",
      domain: [0, 10],
      range: [200, 20],
      nice: false,
      zero: true
    }
  });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children[0].args, {
    field: "Displacement",
    target: "bars",
    coordinate: "plot",
    bin: { maxBins: 4 },
    scale: {
      id: "displacementX",
      domainCount: 2,
      rangeCount: 2,
      nice: false,
      zero: false
    }
  });
  assert.deepEqual(node.children[1].args, {
    target: "bars",
    stack: "zero",
    scale: {
      id: "countY",
      domainCount: 2,
      rangeCount: 2,
      nice: false,
      zero: true
    }
  });
  assert.equal(program.semanticSpec.layers[0].coordinate, "plot");
  assert.deepEqual(program.resolvedScales.displacementX.range, [10, 210]);
  assert.deepEqual(program.resolvedScales.countY.range, [200, 20]);
});

test("delegates validation to aggregate and child actions", () => {
  const program = barProgram();

  assert.throws(
    () => program.encodeHistogram({ field: "Displacement", bins: 10 }),
    /Unknown encodeHistogram option/
  );
  assert.throws(
    () => program.encodeHistogram({ field: "Displacement", maxBins: 0 }),
    /positive integer/
  );
  assert.throws(
    () => program.encodeHistogram({ field: "Displacement", stack: "normalize" }),
    /stack must be "zero"/
  );
  assert.throws(
    () => program.encodeHistogram({ field: "missing" }),
    /finite number/
  );
  assert.throws(
    () => program.encodeHistogram({ field: "Displacement", xScale: null }),
    /plain object/
  );
  assert.equal(program.semanticSpec.layers[0].encoding, undefined);
});
