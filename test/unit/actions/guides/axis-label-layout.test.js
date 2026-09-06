import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const categories = Object.freeze([
  "Alpha category label",
  "Beta category label",
  "Gamma category label",
  "Delta category label"
]);

function source() {
  return chart()
    .createCanvas({
      width: 520,
      height: 420,
      margin: { top: 40, right: 40, bottom: 170, left: 60 }
    })
    .createData({ values: categories.map((category, index) => ({
      category,
      value: index + 1
    })) })
    .createPointMark()
    .encodeX({ field: "category", fieldType: "nominal" })
    .encodeY({ field: "value" });
}

test("uses explicit rotation to resolve long Cartesian label collisions", () => {
  const base = source();
  assert.throws(
    () => base.createXAxisLabels({ values: categories }),
    /labels overlap each other/u
  );
  const rotated = base.createXAxisLabels({
    values: categories,
    rotation: { value: -60, unit: "degrees" }
  });

  assert.equal(
    rotated.guideConfigs.axis.x.labels.rotation,
    -Math.PI / 3
  );
  assert.ok(rotated.graphicSpec.objects.xAxisLabels.items.every(
    item => item.properties.rotation === -Math.PI / 3
  ));
  assert.equal(base.graphicSpec.objects.xAxisLabels, undefined);
});

test("wraps each axis value deterministically and replays after Canvas edits", () => {
  const wrapped = source().createXAxisLabels({
    values: categories,
    maxWidth: 60,
    wrap: "word",
    lineHeight: 14
  });
  assert.deepEqual(
    wrapped.graphicSpec.objects.xAxisLabels.items.slice(0, 3).map(
      item => item.properties.text
    ),
    ["Alpha", "category", "label"]
  );
  assert.equal(wrapped.graphicSpec.objects.xAxisLabels.items.length, 12);

  const resized = wrapped.editCanvas({ width: 600 });
  assert.equal(resized.graphicSpec.objects.xAxisLabels.items.length, 12);
  assert.notEqual(
    resized.graphicSpec.objects.xAxisLabels.items[0].properties.x,
    wrapped.graphicSpec.objects.xAxisLabels.items[0].properties.x
  );

  const unwrapped = resized.editXAxisLabels({
    maxWidth: false,
    rotation: { value: -60, unit: "degrees" }
  });
  assert.equal(unwrapped.graphicSpec.objects.xAxisLabels.items.length, 4);
  assert.equal(unwrapped.guideConfigs.axis.x.labels.maxWidth, undefined);
  assert.equal(unwrapped.guideConfigs.axis.x.labels.wrap, undefined);
  assert.equal(unwrapped.guideConfigs.axis.x.labels.lineHeight, undefined);
});

test("forwards layout policy through complete axis facades and permits explicit overlap", () => {
  const complete = source().createXAxis({
    line: false,
    title: false,
    ticksAndLabels: {
      values: categories,
      ticks: {},
      labels: {
        maxWidth: 60,
        wrap: "word",
        lineHeight: 14
      }
    }
  });
  assert.equal(complete.graphicSpec.objects.xAxisLabels.items.length, 12);

  const allowed = source().createXAxisLabels({
    values: categories,
    overlap: "allow"
  });
  assert.equal(allowed.guideConfigs.axis.x.labels.overlap, "allow");
  assert.equal(allowed.graphicSpec.objects.xAxisLabels.items.length, 4);
});

test("rejects invalid axis label layout policies atomically", () => {
  const base = source();
  const snapshot = JSON.stringify(base);
  for (const options of [
    { values: categories, rotation: { value: 30, unit: "turns" } },
    { values: categories, maxWidth: 0 },
    { values: categories, wrap: "word" },
    { values: categories, maxWidth: 60, wrap: "line" },
    { values: categories, maxWidth: 60, lineHeight: 11 },
    { values: categories, overlap: "hide" },
    { values: categories, maxWidth: false, wrap: "word" }
  ]) assert.throws(() => base.createXAxisLabels(options));
  assert.equal(JSON.stringify(base), snapshot);
});
