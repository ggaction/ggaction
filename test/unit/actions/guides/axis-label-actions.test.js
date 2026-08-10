import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/ChartProgram.js";

function program() {
  return chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createXAxisTicks({ values: [0, 5, 10] })
    .createYAxisTicks({ values: [5, 10, 15] });
}

test("creates x/y labels from shared tick configurations", () => {
  const result = program().createXAxisLabels().createYAxisLabels();

  assert.deepEqual(
    result.graphicSpec.objects.xAxisLabels.items.map(child => child.properties.text),
    ["0", "5", "10"]
  );
  assert.deepEqual(
    result.graphicSpec.objects.yAxisLabels.items.map(child => child.properties.y),
    [110, 60, 10]
  );
  assert.equal(result.guideConfigs.axis.x.labels.mode, "values");
  assert.equal(result.graphicSpec.objects.xAxisLabels.items[0].properties.y, 128);
});

test("formats decimals and records nested graphical edits", () => {
  const base = chart()
    .createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0 }, { x: 1 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" });
  const result = base.createXAxisLabels({ values: [0, 0.5, 1], format: { decimals: 1 } });
  const node = result.trace.children.at(-1);

  assert.deepEqual(
    result.graphicSpec.objects.xAxisLabels.items.map(child => child.properties.text),
    ["0.0", "0.5", "1.0"]
  );
  assert.deepEqual(node.children.map(child => child.op), ["editSemantic", "createGraphics", "editXAxisLabels"]);
});

test("rejects conflicts and rematerializes after Canvas edits", () => {
  assert.throws(() => program().createXAxisLabels({ count: 5 }), /conflicts with axis ticks/);
  const created = program().createXAxisLabels();
  const resized = created.editCanvas({ width: 300, margin: 20 });
  assert.equal(resized.graphicSpec.objects.xAxisLabels.items[0].properties.y, 118);
  assert.equal(created.graphicSpec.objects.xAxisLabels.items[0].properties.y, 128);
});

test("creates mirrored labels and edits their position and format immutably", () => {
  const base = chart()
    .createCanvas({
      width: 260,
      height: 180,
      margin: { top: 40, right: 60, bottom: 30, left: 30 }
    })
    .createData({ id: "data", values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const created = base
    .createXAxisLabels({
      position: "top",
      values: [0, 0.5, 1],
      format: ".1f"
    })
    .createYAxisLabels({
      position: "right",
      values: [0, 0.5, 1],
      format: ".0%"
    });

  assert.equal(created.graphicSpec.objects.xAxisLabels.items[0].properties.y, 22);
  assert.equal(created.graphicSpec.objects.xAxisLabels.items[0].properties.textBaseline, "bottom");
  assert.deepEqual(
    created.graphicSpec.objects.yAxisLabels.items.map(child => child.properties.text),
    ["0%", "50%", "100%"]
  );
  assert.equal(created.graphicSpec.objects.yAxisLabels.items[0].properties.textAlign, "left");

  const edited = created
    .editXAxisLabels({ position: "bottom", format: ".2f" })
    .editYAxisLabels({ position: "left" });
  assert.equal(edited.graphicSpec.objects.xAxisLabels.items[0].properties.y, 168);
  assert.deepEqual(
    edited.graphicSpec.objects.xAxisLabels.items.map(child => child.properties.text),
    ["0.00", "0.50", "1.00"]
  );
  assert.equal(edited.graphicSpec.objects.yAxisLabels.items[0].properties.textAlign, "right");
  assert.equal(created.guideConfigs.axis.x.labels.position, "top");
});

test("switches y-label formats repeatedly and preserves font-weight boundaries", () => {
  const automatic = program().createYAxisLabels({ fontWeight: 100 });
  const percent = automatic.editYAxisLabels({ format: ".0%", fontWeight: 900 });
  const decimal = percent.editYAxisLabels({ format: ".1f" });
  const restored = decimal.editYAxisLabels({ format: "auto" });

  assert.equal(automatic.guideConfigs.axis.y.labels.fontWeight, 100);
  assert.equal(percent.guideConfigs.axis.y.labels.fontWeight, 900);
  assert.equal(percent.guideConfigs.axis.y.labels.format, ".0%");
  assert.equal(decimal.guideConfigs.axis.y.labels.format, ".1f");
  assert.equal(restored.guideConfigs.axis.y.labels.format, "auto");
  assert.equal(restored.graphicSpec.objects.yAxisLabels.items[0].properties.textAlign, "right");
});

test("rejects incompatible formats and insufficient mirrored label margins", () => {
  const temporal = chart()
    .createCanvas({ width: 240, height: 140, margin: 30 })
    .createData({
      id: "data",
      values: [{ date: "2020-01-01" }, { date: "2021-01-01" }]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "date", fieldType: "temporal" });

  assert.deepEqual(
    temporal.createXAxisLabels({
      values: [Date.UTC(2020, 0, 1), Date.UTC(2021, 0, 1)],
      format: "%Y-%m-%d"
    }).graphicSpec.objects.xAxisLabels.items.map(child => child.properties.text),
    ["2020-01-01", "2021-01-01"]
  );
  assert.throws(
    () => temporal.createXAxisLabels({ format: ".1f" }),
    /supported time format/
  );
  assert.throws(
    () => program().createXAxisLabels({ position: "top" }),
    /do not fit the Canvas margin/
  );
  assert.throws(
    () => program().createYAxisLabels({ position: "right" }),
    /do not fit the Canvas margin/
  );
});
