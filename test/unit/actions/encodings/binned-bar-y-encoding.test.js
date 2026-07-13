import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { loadCars } from "../../../support/data.js";

const cars = loadCars().filter(row => Number.isFinite(row.Displacement));

function histogramProgram(values = cars) {
  return chart()
    .createCanvas({
      width: 432,
      height: 460,
      margin: { top: 80, right: 60, bottom: 130, left: 80 }
    })
    .createData({ id: "cars", values })
    .createBarMark({ id: "bars" })
    .encodeX({ field: "Displacement", bin: { maxBins: 10 } });
}

test("infers a count/zero-stack bar y encoding", () => {
  const before = histogramProgram();
  const program = before.encodeY();

  assert.deepEqual(program.semanticSpec.layers[0].encoding.y, {
    field: "Displacement",
    fieldType: "quantitative",
    aggregate: "count",
    stack: "zero",
    scale: "y"
  });
  assert.deepEqual(program.semanticSpec.scales[1], {
    id: "y",
    type: "linear",
    domain: "auto",
    range: "auto",
    nice: true,
    zero: true
  });
  assert.deepEqual(program.resolvedScales.y, {
    type: "linear",
    domain: [0, 120],
    range: [330, 80]
  });
  assert.equal(program.graphicSpec.objects.bars.children.length, 9);
  assert.equal(
    program.graphicSpec.objects.bars.children.every(child =>
      ["x", "y", "width", "height"].every(property =>
        Number.isFinite(child.properties[property])
      )
    ),
    true
  );
  assert.equal(before.semanticSpec.layers[0].encoding.y, undefined);

  const node = program.trace.children.at(-1);
  assert.equal(node.op, "encodeY");
  assert.deepEqual(node.args, {});
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
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics",
    "editGraphics"
  ]);
});

test("accepts explicit equivalent semantics and scale bounds", () => {
  const program = histogramProgram().encodeY({
    field: "Displacement",
    aggregate: "count",
    stack: "zero",
    scale: {
      id: "countY",
      domain: [0, 200],
      range: [300, 20],
      nice: false,
      zero: false
    }
  });

  assert.equal(program.semanticSpec.layers[0].encoding.y.scale, "countY");
  assert.deepEqual(program.resolvedScales.countY, {
    type: "linear",
    domain: [0, 200],
    range: [300, 20]
  });
});

test("rematerializes histogram scales and rects after Canvas edits", () => {
  const program = histogramProgram().encodeY();
  const edited = program.editCanvas({ width: 500, height: 500 });

  assert.deepEqual(edited.resolvedScales.x.range, [80, 440]);
  assert.deepEqual(edited.resolvedScales.y.range, [370, 80]);
  assert.equal(edited.graphicSpec.objects.bars.children.length, 9);
  assert.equal(
    edited.graphicSpec.objects.bars.children[0].properties.width,
    40
  );
  assert.notEqual(
    edited.graphicSpec.objects.bars.children[0].properties.height,
    program.graphicSpec.objects.bars.children[0].properties.height
  );
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 432);
});

test("validates histogram y prerequisites and policies", () => {
  const withoutX = chart()
    .createCanvas({ width: 200, height: 200 })
    .createData({ id: "cars", values: [{ Displacement: 100 }] })
    .createBarMark({ id: "bars" });

  assert.throws(() => withoutX.encodeY(), /requires a binned x encoding/);

  const program = histogramProgram();
  assert.throws(
    () => program.encodeY({ field: "Other" }),
    /must match the binned x field/
  );
  assert.throws(
    () => program.encodeY({ fieldType: "temporal" }),
    /requires a quantitative field/
  );
  assert.throws(
    () => program.encodeY({ aggregate: "mean" }),
    /aggregate must be "count"/
  );
  assert.throws(
    () => program.encodeY({ stack: "normalize" }),
    /stack must be "zero"/
  );
  assert.throws(
    () => program.encodeY({ bin: {} }),
    /does not support bin/
  );
  assert.equal(program.semanticSpec.layers[0].encoding.y, undefined);
});

test("rejects sharing a count y scale with an unaggregated consumer", () => {
  const program = chart()
    .createCanvas({ width: 300, height: 240 })
    .createData({
      id: "values",
      values: [{ Displacement: 50 }, { Displacement: 100 }]
    })
    .createPointMark({ id: "points" })
    .encodeY({
      field: "Displacement",
      scale: { nice: true, zero: true }
    })
    .createBarMark({ id: "bars", data: "values" })
    .encodeX({
      field: "Displacement",
      bin: {},
      scale: { id: "histogramX" }
    });

  assert.throws(
    () => program.encodeY({ target: "bars" }),
    /cannot be shared with another policy/
  );
});
