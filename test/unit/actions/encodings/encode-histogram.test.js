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

test("forwards exact-step and explicit-boundary bin modes", () => {
  const stepped = barProgram().encodeHistogram({
    field: "Displacement",
    binStep: 60
  });
  const bounded = barProgram().encodeHistogram({
    field: "Displacement",
    binBoundaries: [60, 120, 240, 480]
  });

  assert.deepEqual(stepped.semanticSpec.layers[0].encoding.x.bin, { step: 60 });
  assert.deepEqual(stepped.resolvedScales.x.domain, [60, 480]);
  assert.deepEqual(bounded.semanticSpec.layers[0].encoding.x.bin, {
    boundaries: [60, 120, 240, 480]
  });
  assert.deepEqual(bounded.resolvedScales.x.domain, [60, 480]);
  assert.deepEqual(
    stepped.trace.children.at(-1).children[0].args.bin,
    { step: 60 }
  );
  assert.deepEqual(
    bounded.trace.children.at(-1).children[0].args.bin,
    { boundariesCount: 4 }
  );
});

test("atomically reassigns histogram fields and inferred guides", () => {
  const rows = [
    { Displacement: 60, Horsepower: 40, Origin: "A" },
    { Displacement: 100, Horsepower: 80, Origin: "B" },
    { Displacement: 200, Horsepower: 120, Origin: "A" },
    { Displacement: 455, Horsepower: 220, Origin: "B" }
  ];
  const before = chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 140, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values: rows })
    .createBarMark({ id: "bars" })
    .encodeHistogram({ field: "Displacement", maxBins: 10 })
    .encodeColor({ field: "Origin" })
    .createGuides({
      grid: { horizontal: {}, vertical: {} }
    });
  const after = before.encodeHistogram({
    field: "Horsepower",
    binStep: 40
  });

  assert.equal(before.semanticSpec.layers[0].encoding.x.field, "Displacement");
  assert.deepEqual(before.semanticSpec.layers[0].encoding.x.bin, { maxBins: 10 });
  assert.equal(after.semanticSpec.layers[0].encoding.x.field, "Horsepower");
  assert.equal(after.semanticSpec.layers[0].encoding.y.field, "Horsepower");
  assert.deepEqual(after.semanticSpec.layers[0].encoding.x.bin, { step: 40 });
  assert.equal(after.semanticSpec.layers[0].encoding.y.stack, "zero");
  assert.deepEqual(after.semanticSpec.layers[0].encoding.color, {
    field: "Origin",
    fieldType: "nominal",
    scale: "color"
  });
  assert.equal(after.semanticSpec.guides.axis.x.title, "Horsepower");
  assert.equal(after.semanticSpec.guides.axis.y.title, "count(Horsepower)");
  assert.deepEqual(after.guideConfigs.axis.x.ticks.values, [40, 80, 120, 160, 200, 240]);
  assert.deepEqual(after.guideConfigs.axis.x.labels.values, [40, 80, 120, 160, 200, 240]);
  assert.deepEqual(after.guideConfigs.grid.vertical.values, [40, 80, 120, 160, 200, 240]);
  assert.equal(after.graphicSpec.objects.colorLegendSymbols.children.length, 2);
  assert.deepEqual(after.graphicSpec.order, before.graphicSpec.order);
});

test("preserves explicit guide values during histogram reassignment", () => {
  const before = barProgram()
    .encodeHistogram({ field: "Displacement", maxBins: 10 })
    .createGuides({
      axes: {
        x: { ticksAndLabels: { values: [100, 200, 300] } }
      },
      grid: false,
      legend: false
    });
  const after = before.encodeHistogram({
    field: "Displacement",
    binBoundaries: [60, 100, 200, 300, 480]
  });

  assert.deepEqual(after.guideConfigs.axis.x.ticks.values, [100, 200, 300]);
  assert.deepEqual(after.guideConfigs.axis.x.labels.values, [100, 200, 300]);
});

test("rejects invalid bin combinations and conflicts without mutation", () => {
  const program = barProgram();
  for (const options of [
    { maxBins: 10, binStep: 60 },
    { binStep: 60, binBoundaries: [60, 120] },
    { maxBins: 10, binBoundaries: [60, 120] }
  ]) {
    assert.throws(
      () => program.encodeHistogram({ field: "Displacement", ...options }),
      /only one/
    );
  }
  assert.throws(
    () => program.encodeHistogram({ field: "Displacement", binStep: 0 }),
    /positive finite/
  );
  assert.throws(
    () => program.encodeHistogram({
      field: "Displacement",
      binBoundaries: [60, 120, 100, 480]
    }),
    /strictly increasing/
  );
  assert.throws(
    () => program.encodeHistogram({
      field: "Displacement",
      binStep: 60,
      xScale: { domain: [50, 500] }
    }),
    /align.*bin step/
  );
  assert.throws(
    () => program.encodeHistogram({
      field: "Displacement",
      binBoundaries: [60, 120, 240]
    }),
    /contain.*data extent/
  );
  assert.equal(program.semanticSpec.layers[0].encoding, undefined);
  assert.deepEqual(program.resolvedScales, {});
});

test("infers a unique histogram target and rejects ambiguity", () => {
  const unique = barProgram()._clone({ context: {} });
  const inferred = unique.encodeHistogram({ field: "Displacement" });
  assert.equal(inferred.semanticSpec.layers[0].encoding.x.field, "Displacement");

  const ambiguous = barProgram()
    .createBarMark({ id: "otherBars", data: "cars" })
    ._clone({ context: {} });
  assert.throws(
    () => ambiguous.encodeHistogram({ field: "Displacement" }),
    /target is ambiguous/
  );
  const explicit = ambiguous.encodeHistogram({
    target: "bars",
    field: "Displacement"
  });
  assert.equal(explicit.semanticSpec.layers[0].encoding.x.field, "Displacement");
  assert.equal(explicit.semanticSpec.layers[1].encoding, undefined);
  assert.equal(ambiguous.semanticSpec.layers[0].encoding, undefined);
});
