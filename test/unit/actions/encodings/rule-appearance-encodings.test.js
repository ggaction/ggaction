import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function encodedRule() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({
      id: "values",
      values: [
        { lower: 10, upper: 40, row: "A", amount: 0 },
        { lower: 60, upper: 90, row: "B", amount: 10 }
      ]
    })
    .createRuleMark({ id: "intervals" })
    .encodeY({
      field: "amount",
      fieldType: "quantitative",
      scale: { domain: [0, 10] }
    })
    .encodeX({
      field: "lower",
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    })
    .encodeX2({ field: "upper", fieldType: "quantitative" });
}

test("assigns and reassigns constant rule stroke appearance", () => {
  const before = encodedRule();
  const styled = before
    .encodeStroke({ value: "#d9485f" })
    .encodeStrokeWidth({ value: 0 })
    .encodeStrokeDash({ value: "dotted" })
    .encodeOpacity({ value: 0.4 });

  for (const child of styled.graphicSpec.objects.intervals.items) {
    assert.equal(child.properties.stroke, "#d9485f");
    assert.equal(child.properties.strokeWidth, 0);
    assert.deepEqual(child.properties.strokeDash, [1, 3]);
    assert.equal(child.properties.opacity, 0.4);
  }
  assert.equal(before.markConfigs.intervals.stroke, "#4c78a8");
  assert.equal(styled.semanticSpec.layers[0].encoding.strokeDash.datum, "dotted");
});

test("maps field-driven dash and opacity per concrete rule", () => {
  const program = encodedRule()
    .encodeStrokeDash({ field: "row" })
    .encodeOpacity({ field: "amount", scale: { range: [0.2, 1] } });
  const children = program.graphicSpec.objects.intervals.items;

  assert.deepEqual(
    children.map(child => child.properties.strokeDash),
    [[], [8, 4]]
  );
  assert.deepEqual(
    children.map(child => child.properties.opacity),
    [0.2, 1]
  );
  assert.equal(program.semanticSpec.layers[0].encoding.strokeDash.field, "row");
  assert.equal(program.semanticSpec.layers[0].encoding.opacity.field, "amount");
});

test("maps a quantitative field to concrete rule stroke widths", () => {
  const before = encodedRule();
  const program = before.encodeStrokeWidth({
    field: "amount",
    scale: { range: [1, 5] }
  });

  assert.deepEqual(program.semanticSpec.layers[0].encoding.strokeWidth, {
    field: "amount",
    fieldType: "quantitative",
    scale: "strokeWidth"
  });
  assert.deepEqual(program.resolvedScales.strokeWidth, {
    type: "linear",
    domain: [0, 10],
    range: [1, 5]
  });
  assert.deepEqual(
    program.graphicSpec.objects.intervals.items.map(
      child => child.properties.strokeWidth
    ),
    [1, 5]
  );
  assert.equal(before.semanticSpec.layers[0].encoding.strokeWidth, undefined);
});

test("reassigns rule stroke-width fields and restores the constant variant", () => {
  const field = encodedRule().encodeStrokeWidth({
    field: "amount",
    scale: { range: [1, 5] }
  });
  const constant = field.encodeStrokeWidth({ value: 3 });

  assert.equal(constant.semanticSpec.layers[0].encoding.strokeWidth, undefined);
  assert.deepEqual(
    constant.graphicSpec.objects.intervals.items.map(
      child => child.properties.strokeWidth
    ),
    [3, 3]
  );
  assert.equal(field.graphicSpec.objects.intervals.items[0].properties.strokeWidth, 1);
});

test("removes the standalone width legend when a rule returns to constant mode", () => {
  const field = encodedRule().editCanvas({ width: 500, height: 350, margin: { right: 150 } })
    .encodeStrokeWidth({ field: "amount" })
    .createLegend({ channels: ["strokeWidth"] });
  const constant = field.encodeStrokeWidth({ value: 2 });

  assert.equal(constant.semanticSpec.guides.legend, undefined);
  assert.equal(constant.graphicSpec.objects.strokeWidthLegendSymbols, undefined);
  assert.equal(constant.semanticSpec.layers[0].encoding.strokeWidth, undefined);
  assert.deepEqual(
    constant.graphicSpec.objects.intervals.items.map(
      child => child.properties.strokeWidth
    ),
    [2, 2]
  );
});

test("restores constant appearance after field-driven assignments", () => {
  const fields = encodedRule()
    .encodeStrokeDash({ field: "row" })
    .encodeOpacity({ field: "amount" });
  const constants = fields
    .encodeStrokeDash({ value: [] })
    .encodeOpacity({ value: 1 });

  assert.equal(constants.semanticSpec.layers[0].encoding.opacity, undefined);
  assert.deepEqual(constants.semanticSpec.layers[0].encoding.strokeDash, {
    datum: []
  });
  assert.deepEqual(
    constants.graphicSpec.objects.intervals.items.map(child =>
      child.properties.strokeDash
    ),
    [[], []]
  );
  assert.deepEqual(
    constants.graphicSpec.objects.intervals.items.map(child =>
      child.properties.opacity
    ),
    [1, 1]
  );
});

test("validates rule appearance without mutating earlier output", () => {
  const program = encodedRule();

  assert.throws(() => program.encodeStroke({ value: "" }), /non-empty/);
  assert.throws(() => program.encodeStrokeWidth({ value: -1 }), /non-negative/);
  assert.throws(() => program.encodeStrokeWidth({ value: Infinity }), /finite/);
  assert.throws(
    () => program.encodeStrokeWidth({ value: 1, field: "amount" }),
    /exactly one/
  );
  assert.throws(() => program.encodeStrokeWidth({}), /exactly one/);
  assert.throws(
    () => program.encodeStrokeWidth({
      field: "amount",
      fieldType: "nominal"
    }),
    /quantitative field/
  );
  assert.throws(
    () => program.encodeStrokeWidth({
      field: "amount",
      scale: { range: [-1, 5] }
    }),
    /non-negative finite widths/
  );
  assert.throws(
    () => program.encodeStrokeWidth({
      field: "amount",
      scale: { domain: [-1, 10] }
    }),
    /cannot contain negative/
  );
  assert.throws(() => program.encodeStroke({}), /non-empty/);
  assert.throws(
    () => program.encodeStrokeDash({ value: [1] }),
    /even-length/
  );
  assert.throws(() => program.encodeOpacity({ value: 2 }), /from 0 to 1/);
  assert.equal(
    program.graphicSpec.objects.intervals.items[0].properties.stroke,
    "#4c78a8"
  );
});
