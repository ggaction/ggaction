import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function base(values = [{ x1: 20, y1: 30, x2: 80, y2: 70 }]) {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "values", values });
}

test("materializes full-span datum rules against plot bounds", () => {
  const vertical = base()
    .createRuleMark({ id: "vertical" })
    .encodeX({
      datum: 25,
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    });
  const horizontal = vertical
    .createRuleMark({ id: "horizontal" })
    .encodeY({
      datum: 75,
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    });

  assert.deepEqual(
    vertical.graphicSpec.objects.vertical.children[0].properties,
    {
      x1: 70,
      y1: 20,
      x2: 70,
      y2: 140,
      stroke: "#4c78a8",
      strokeWidth: 2,
      strokeDash: [],
      opacity: 1
    }
  );
  assert.deepEqual(
    horizontal.graphicSpec.objects.horizontal.children[0].properties,
    {
      x1: 20,
      y1: 50,
      x2: 220,
      y2: 50,
      stroke: "#4c78a8",
      strokeWidth: 2,
      strokeDash: [],
      opacity: 1
    }
  );
});

test("materializes one diagonal field rule per dataset row", () => {
  const values = [
    { x1: 0, y1: 100, x2: 50, y2: 50 },
    { x1: 50, y1: 50, x2: 100, y2: 0 }
  ];
  const program = base(values)
    .createRuleMark({ id: "diagonal" })
    .encodeX({
      field: "x1",
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    })
    .encodeY({
      field: "y1",
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    })
    .encodeX2({ field: "x2", fieldType: "quantitative" })
    .encodeY2({ field: "y2", fieldType: "quantitative" });

  assert.deepEqual(
    program.graphicSpec.objects.diagonal.children.map(child => [
      child.properties.x1,
      child.properties.y1,
      child.properties.x2,
      child.properties.y2
    ]),
    [
      [20, 20, 120, 80],
      [120, 80, 220, 140]
    ]
  );
  assert.equal(program.semanticSpec.layers[0].encoding.x2.scale, "x");
  assert.equal(program.semanticSpec.layers[0].encoding.y2.scale, "y");
});

test("supports nominal independent positions with quantitative intervals", () => {
  const program = base([
    { group: "A", lower: 10, upper: 30 },
    { group: "B", lower: 20, upper: 40 }
  ])
    .createRuleMark({ id: "intervals" })
    .encodeX({ field: "group", fieldType: "nominal" })
    .encodeY({
      field: "lower",
      fieldType: "quantitative",
      scale: { domain: [0, 50] }
    })
    .encodeY2({ field: "upper", fieldType: "quantitative" });

  assert.equal(program.semanticSpec.scales[0].type, "point");
  assert.deepEqual(program.resolvedScales.x.domain, ["A", "B"]);
  assert.deepEqual(
    program.graphicSpec.objects.intervals.children.map(child =>
      child.properties.x1
    ),
    [70, 170]
  );
});

test("reassigns endpoints and rematerializes after scale and Canvas edits", () => {
  const original = base()
    .createRuleMark({ id: "interval" })
    .encodeY({
      datum: 50,
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    })
    .encodeX({
      datum: 20,
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    })
    .encodeX2({ datum: 80, fieldType: "quantitative" });
  const reassigned = original.encodeX2({
    datum: 60,
    fieldType: "quantitative"
  });
  const resized = reassigned.editCanvas({ width: 440, margin: 40 });
  const rescaled = resized.editScale({ id: "x", domain: [0, 200] });

  assert.equal(
    original.graphicSpec.objects.interval.children[0].properties.x2,
    180
  );
  assert.equal(
    reassigned.graphicSpec.objects.interval.children[0].properties.x2,
    140
  );
  assert.equal(
    resized.graphicSpec.objects.interval.children[0].properties.x2,
    256
  );
  assert.equal(
    rescaled.graphicSpec.objects.interval.children[0].properties.x2,
    148
  );
  assert.equal(rescaled.semanticSpec.layers[0].encoding.x2.datum, 60);
});

test("replaces a field endpoint with one datum without retaining stale state", () => {
  const field = base([
    { x1: 10 },
    { x1: 90 }
  ])
    .createRuleMark({ id: "threshold" })
    .encodeX({
      field: "x1",
      fieldType: "quantitative",
      scale: { domain: [0, 100] }
    });
  const datum = field.encodeX({
    datum: 40,
    fieldType: "quantitative"
  });

  assert.deepEqual(datum.semanticSpec.layers[0].encoding.x, {
    datum: 40,
    fieldType: "quantitative",
    scale: "x"
  });
  assert.equal(datum.graphicSpec.objects.threshold.children.length, 1);
  assert.equal(field.graphicSpec.objects.threshold.children.length, 2);
});

test("validates rule endpoint contracts atomically", () => {
  const rule = base().createRuleMark({ id: "rule" });

  assert.throws(() => rule.encodeX({}), /exactly one of field or datum/);
  assert.throws(
    () => rule.encodeX({ field: "x1", datum: 1, fieldType: "quantitative" }),
    /exactly one/
  );
  assert.throws(
    () => rule.encodeX({ field: "x1" }),
    /requires fieldType/
  );
  assert.throws(
    () => rule.encodeX({ datum: Infinity, fieldType: "quantitative" }),
    /finite number/
  );
  assert.throws(
    () => rule.encodeX2({ datum: 1, fieldType: "quantitative" }),
    /existing x encoding/
  );
  const primary = rule.encodeX({
    datum: 10,
    fieldType: "quantitative",
    scale: { id: "position", domain: [0, 100] }
  });
  assert.throws(
    () => primary.encodeX2({
      datum: 20,
      fieldType: "quantitative",
      scale: { id: "other" }
    }),
    /share one scale/
  );
  assert.throws(
    () => primary.encodeX2({ datum: 20, fieldType: "temporal" }),
    /fieldType must match/
  );
  assert.equal(primary.semanticSpec.layers[0].encoding.x2, undefined);
});
