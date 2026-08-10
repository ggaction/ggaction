import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/ChartProgram.js";

function program() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
}

test("creates nice x ticks and explicit y ticks", () => {
  const result = program().createXAxisTicks({ count: 5 }).createYAxisTicks({ values: [5, 10, 15] });
  assert.equal(result.graphicSpec.objects.xAxisTicks.items.length > 0, true);
  assert.deepEqual(result.graphicSpec.objects.yAxisTicks.items.map(x => x.properties.y1), [110, 60, 10]);
  assert.equal(result.guideConfigs.axis.x.ticks.mode, "count");
  assert.equal(result.guideConfigs.axis.y.ticks.mode, "values");
});

test("validates mutually exclusive options and rematerializes after Canvas edits", () => {
  assert.throws(() => program().createXAxisTicks({ count: 5, values: [0] }), /cannot use/);
  const created = program().createXAxisTicks();
  const resized = created.editCanvas({ width: 300, margin: 20 });
  assert.equal(resized.graphicSpec.objects.xAxisTicks.items[0].properties.y1, 100);
  assert.equal(
    resized.trace.children.at(-1).children.some(
      child => child.op === "rematerializeScale"
    ),
    true
  );
});

test("creates and edits outward top and right ticks", () => {
  const created = chart()
    .createCanvas({
      width: 240,
      height: 180,
      margin: { top: 30, right: 30, bottom: 20, left: 20 }
    })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createXAxisTicks({ position: "top", values: [0, 10] })
    .createYAxisTicks({ position: "right", values: [5, 15] });

  assert.equal(created.graphicSpec.objects.xAxisTicks.items[0].properties.y1, 30);
  assert.equal(created.graphicSpec.objects.xAxisTicks.items[0].properties.y2, 24);
  assert.equal(created.graphicSpec.objects.yAxisTicks.items[0].properties.x1, 210);
  assert.equal(created.graphicSpec.objects.yAxisTicks.items[0].properties.x2, 216);

  const edited = created
    .editXAxisTicks({ position: "bottom" })
    .editYAxisTicks({ position: "left" });
  assert.equal(edited.graphicSpec.objects.xAxisTicks.items[0].properties.y1, 160);
  assert.equal(edited.graphicSpec.objects.yAxisTicks.items[0].properties.x1, 14);
  assert.equal(created.guideConfigs.axis.x.ticks.position, "top");
});

test("preserves y ticks across repeated count and value mode changes", () => {
  const created = program().createYAxisTicks({ count: 12 });
  const values = created.editYAxisTicks({ values: [5, 10, 15] });
  const counted = values.editYAxisTicks({ count: 7 });
  const final = counted.editYAxisTicks({ values: [15, 5] });

  assert.equal(created.guideConfigs.axis.y.ticks.mode, "count");
  assert.equal(values.guideConfigs.axis.y.ticks.mode, "values");
  assert.equal(counted.guideConfigs.axis.y.ticks.count, 7);
  assert.deepEqual(final.guideConfigs.axis.y.ticks.values, [15, 5]);
  assert.equal(final.graphicSpec.objects.yAxisTicks.items.length, 2);
});

test("rejects mirrored ticks when the requested margin is too small", () => {
  assert.throws(
    () => program().createXAxisTicks({ position: "top", length: 11 }),
    /do not fit the Canvas margin/
  );
  assert.throws(
    () => program().createYAxisTicks({ position: "right", length: 11 }),
    /do not fit the Canvas margin/
  );
});
