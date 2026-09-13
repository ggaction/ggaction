import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function categoricalAxis() {
  return chart()
    .createCanvas({
      width: 420,
      height: 240,
      margin: { top: 50, right: 40, bottom: 80, left: 60 }
    })
    .createData({ values: [
      { category: 1, value: 1 },
      { category: "1", value: 2 },
      { category: "KR", value: 3 },
      { category: "XX", value: 4 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" });
}

const map = Object.freeze([
  Object.freeze({ value: 1, label: "하나" }),
  Object.freeze({ value: "KR", label: "한국" }),
  Object.freeze({ value: "future", label: "미래" })
]);

test("maps categorical Cartesian labels by typed raw value and resets to fallback", () => {
  const base = categoricalAxis();
  const created = base.createXAxisLabels({
    values: [1, "1", "KR", "XX"],
    labelMap: map
  });

  assert.deepEqual(
    created.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["하나", "1", "한국", "XX"]
  );
  assert.deepEqual(created.resolvedScales.x.domain, [1, "1", "KR", "XX"]);
  assert.deepEqual(created.guideConfigs.axis.x.labels.values, [1, "1", "KR", "XX"]);
  assert.notEqual(created.guideConfigs.axis.x.labels.labelMap, map);
  assert.ok(Object.isFrozen(created.guideConfigs.axis.x.labels.labelMap));
  assert.equal(base.graphicSpec.objects.xAxisLabels, undefined);
  assert.deepEqual(
    created.editCanvas({ width: 460 }).editScale({ id: "x", reverse: true })
      .graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["하나", "1", "한국", "XX"]
  );

  const empty = created.editXAxisLabels({
    labelMap: [{ value: "1", label: "" }]
  });
  assert.deepEqual(
    empty.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["1", "", "KR", "XX"]
  );
  const reset = empty.editXAxisLabels({ labelMap: "auto" });
  assert.equal(Object.hasOwn(reset.guideConfigs.axis.x.labels, "labelMap"), false);
  assert.deepEqual(
    reset.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["1", "1", "KR", "XX"]
  );
  const explicitEmpty = created.editXAxisLabels({ labelMap: [] });
  assert.deepEqual(explicitEmpty.guideConfigs.axis.x.labels.labelMap, []);
  assert.deepEqual(
    explicitEmpty.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["1", "1", "KR", "XX"]
  );
});

test("passes display maps through Cartesian aggregate labels and rejects continuous scales", () => {
  const aggregate = categoricalAxis().createXAxisTicksAndLabels({
    values: [1, "1", "KR", "XX"],
    labels: { labelMap: map }
  });
  assert.deepEqual(
    aggregate.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["하나", "1", "한국", "XX"]
  );

  const continuous = chart()
    .createCanvas({ width: 300, height: 200, margin: 60 })
    .createData({ values: [{ x: 0 }, { x: 1 }] })
    .createPointMark()
    .encodeX({ field: "x" });
  const snapshot = JSON.stringify(continuous);
  assert.throws(
    () => continuous.createXAxisLabels({ values: [0, 1], labelMap: [] }),
    /labelMap requires a categorical scale/
  );
  assert.throws(
    () => continuous.createXAxisLabels({ values: [0, 1], labelMap: "auto" }),
    /labelMap requires a categorical scale/
  );
  assert.equal(JSON.stringify(continuous), snapshot);
});

test("rejects duplicate typed display values before changing axis state", () => {
  const base = categoricalAxis();
  assert.throws(
    () => base.createXAxisLabels({
      values: [1, "1", "KR", "XX"],
      labelMap: [
        { value: 0, label: "zero" },
        { value: -0, label: "negative zero" }
      ]
    }),
    /duplicate typed value/
  );
  assert.throws(
    () => base.createXAxisLabels({
      values: [1, "1", "KR", "XX"],
      labelMap: [{ value: 1, label: "mapped label ".repeat(80) }]
    }),
    /fit|overlap/
  );
  assert.equal(base.graphicSpec.objects.xAxisLabels, undefined);
});

test("supports categorical y labels and complete Cartesian axis facades", () => {
  const y = chart()
    .createCanvas({ width: 420, height: 280, margin: 90 })
    .createData({ values: [
      { category: "A", value: 1 },
      { category: "B", value: 2 }
    ] })
    .createPointMark()
    .encodeX({ field: "value" })
    .encodeY({ field: "category", fieldType: "nominal" })
    .createYAxisLabels({
      labelMap: [{ value: "A", label: "Alpha" }]
    });
  assert.deepEqual(
    y.graphicSpec.objects.yAxisLabels.items.map(item => item.properties.text),
    ["Alpha", "B"]
  );

  const complete = categoricalAxis().createXAxis({
    line: false,
    title: false,
    ticksAndLabels: {
      labels: { labelMap: [{ value: "KR", label: "한국" }] }
    }
  });
  assert.deepEqual(
    complete.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["1", "1", "한국", "XX"]
  );
});
