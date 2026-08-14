import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

function encodedProgram() {
  return chart()
    .createCanvas({ width: 300, height: 220, margin: 60 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("creates ticks and labels beneath one aggregate trace node", () => {
  const before = encodedProgram();
  const program = before.createXAxisTicksAndLabels({
    values: [0, 5, 10],
    ticks: { length: 8 },
    labels: { offset: 20, fontSize: 13 }
  });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createXAxisTicks",
    "createXAxisLabels"
  ]);
  assert.deepEqual(program.guideConfigs.axis.x.ticks.values, [0, 5, 10]);
  assert.deepEqual(program.guideConfigs.axis.x.labels.values, [0, 5, 10]);
  assert.equal(program.guideConfigs.axis.x.ticks.length, 8);
  assert.equal(program.guideConfigs.axis.x.labels.fontSize, 13);
  assert.equal(before.guideConfigs.axis, undefined);
});

test("forwards every nested tick and label appearance option on both axes", () => {
  const options = {
    values: [5, 10, 15],
    ticks: { length: 4, color: "#334155", lineWidth: 2 },
    labels: {
      offset: 16,
      format: ".1f",
      color: "#0f172a",
      fontSize: 11,
      fontFamily: "serif",
      fontWeight: 700
    }
  };
  const y = encodedProgram().createYAxisTicksAndLabels(options);

  assert.equal(y.guideConfigs.axis.y.ticks.length, 4);
  assert.equal(y.guideConfigs.axis.y.ticks.lineWidth, 2);
  assert.equal(y.guideConfigs.axis.y.labels.offset, 16);
  assert.equal(y.guideConfigs.axis.y.labels.fontWeight, 700);
  assert.equal(y.graphicSpec.objects.yAxisLabels.items[0].properties.fontFamily, "serif");
});

test("edits shared values atomically through tick then label leaf actions", () => {
  const created = encodedProgram().createXAxisTicksAndLabels({ count: 5 });
  const edited = created.editXAxisTicksAndLabels({
    values: [0, 10],
    ticks: { lineWidth: 2 },
    labels: { color: "black" }
  });
  const node = edited.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "editXAxisTicks",
    "editXAxisLabels"
  ]);
  assert.deepEqual(edited.guideConfigs.axis.x.ticks.values, [0, 10]);
  assert.deepEqual(edited.guideConfigs.axis.x.labels.values, [0, 10]);
  assert.equal(edited.graphicSpec.objects.xAxisTicks.items.length, 2);
  assert.equal(edited.graphicSpec.objects.xAxisLabels.items.length, 2);
});

test("edits only the requested appearance component", () => {
  const created = encodedProgram().createYAxisTicksAndLabels();
  const edited = created.editYAxisTicksAndLabels({
    labels: { fontSize: 14 }
  });

  assert.deepEqual(
    edited.trace.children.at(-1).children.map(child => child.op),
    ["editYAxisLabels"]
  );
  assert.equal(edited.guideConfigs.axis.y.labels.fontSize, 14);
  assert.equal(edited.guideConfigs.axis.y.ticks, created.guideConfigs.axis.y.ticks);
});

test("validates aggregate and nested options", () => {
  const program = encodedProgram();

  assert.throws(
    () => program.createXAxisTicksAndLabels({ count: 5, values: [0] }),
    /cannot use count and values/
  );
  assert.throws(
    () => program.createXAxisTicksAndLabels({ ticks: { fontSize: 12 } }),
    /Unknown createXAxisTicksAndLabels.ticks option/
  );
  assert.throws(
    () => program.createXAxisTicksAndLabels({ labels: [] }),
    /plain object/
  );
  assert.throws(
    () => program.editXAxisTicksAndLabels({}),
    /at least one option/
  );
});
