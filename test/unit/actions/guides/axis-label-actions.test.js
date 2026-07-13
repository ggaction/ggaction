import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/core/ChartProgram.js";

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
    result.graphicSpec.objects.xAxisLabels.children.map(child => child.properties.text),
    ["0", "5", "10"]
  );
  assert.deepEqual(
    result.graphicSpec.objects.yAxisLabels.children.map(child => child.properties.y),
    [110, 60, 10]
  );
  assert.equal(result.guideConfigs.axis.x.labels.mode, "values");
  assert.equal(result.graphicSpec.objects.xAxisLabels.children[0].properties.y, 128);
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
    result.graphicSpec.objects.xAxisLabels.children.map(child => child.properties.text),
    ["0.0", "0.5", "1.0"]
  );
  assert.deepEqual(node.children.map(child => child.op), ["editSemantic", "createGraphics", "editXAxisLabels"]);
});

test("rejects conflicts and rematerializes after Canvas edits", () => {
  assert.throws(() => program().createXAxisLabels({ count: 5 }), /conflicts with axis ticks/);
  const created = program().createXAxisLabels();
  const resized = created.editCanvas({ width: 300, margin: 20 });
  assert.equal(resized.graphicSpec.objects.xAxisLabels.children[0].properties.y, 118);
  assert.equal(created.graphicSpec.objects.xAxisLabels.children[0].properties.y, 128);
});
