import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/core/ChartProgram.js";

function program() {
  return chart().createCanvas({ width: 200, height: 120, margin: 10 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" });
}

test("creates nice x ticks and explicit y ticks", () => {
  const result = program().createXAxisTicks({ count: 5 }).createYAxisTicks({ values: [5, 10, 15] });
  assert.equal(result.graphicSpec.objects.xAxisTicks.children.length > 0, true);
  assert.deepEqual(result.graphicSpec.objects.yAxisTicks.children.map(x => x.properties.y1), [110, 60, 10]);
  assert.equal(result.guideConfigs.axis.x.ticks.mode, "count");
  assert.equal(result.guideConfigs.axis.y.ticks.mode, "values");
});

test("validates mutually exclusive options and rematerializes after Canvas edits", () => {
  assert.throws(() => program().createXAxisTicks({ count: 5, values: [0] }), /cannot use/);
  const created = program().createXAxisTicks();
  const resized = created.editCanvas({ width: 300, margin: 20 });
  assert.equal(resized.graphicSpec.objects.xAxisTicks.children[0].properties.y1, 100);
  assert.equal(resized.trace.children.at(-1).children.at(-1).op, "rematerializeScale");
});
