import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

function encodedProgram() {
  return chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "data", values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("creates a complete axis beneath three wrapped child actions", () => {
  const before = encodedProgram();
  const program = before.createXAxis({
    line: { lineWidth: 2 },
    ticksAndLabels: {
      values: [0, 5, 10],
      ticks: { length: 8 },
      labels: { fontSize: 14 }
    },
    title: { text: "Horizontal", at: "start" }
  });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createXAxisLine",
    "createXAxisTicksAndLabels",
    "createXAxisTitle"
  ]);
  assert.equal(program.graphicSpec.objects.xAxisLine.properties.strokeWidth, 2);
  assert.deepEqual(program.guideConfigs.axis.x.ticks.values, [0, 5, 10]);
  assert.equal(program.guideConfigs.axis.x.labels.fontSize, 14);
  assert.equal(program.semanticSpec.guides.axis.x.title, "Horizontal");
  assert.equal(program.graphicSpec.objects.xAxisTitle.properties.x, 20);
  assert.equal(before.semanticSpec.guides.axis, undefined);
});

test("uses channel defaults and inferred titles", () => {
  const program = encodedProgram().createXAxis().createYAxis();

  assert.equal(program.semanticSpec.guides.axis.x.title, "x");
  assert.equal(program.semanticSpec.guides.axis.y.title, "y");
  assert.equal(program.graphicSpec.objects.xAxisTicks.items.length > 0, true);
  assert.equal(program.graphicSpec.objects.yAxisLabels.items.length > 0, true);
});

test("routes shared scale and position to every child", () => {
  const program = encodedProgram().createXAxis({
    scale: "x",
    position: "bottom"
  });
  const node = program.trace.children.at(-1);

  for (const child of node.children) {
    assert.equal(child.args.scale, "x");
    assert.equal(child.args.position, "bottom");
  }
});

test("stores an explicitly selected coordinate on a complete axis", () => {
  const program = encodedProgram().createXAxis({ coordinate: "main" });
  const node = program.trace.children.at(-1);

  assert.equal(program.semanticSpec.guides.axis.x.coordinate, "main");
  assert.equal(node.children[0].op, "editSemantic");
  assert.throws(
    () => encodedProgram().createXAxis({ coordinate: "missing" }),
    /Unknown coordinate/
  );
});

test("validates nested options and rejects partial duplicate axes", () => {
  const program = encodedProgram();

  assert.throws(
    () => program.createXAxis({ line: { scale: "x" } }),
    /Unknown createXAxis.line option/
  );
  assert.throws(
    () => program.createXAxis({ ticksAndLabels: [] }),
    /plain object/
  );
  assert.throws(
    () => program.createXAxis({ title: { lineWidth: 2 } }),
    /Unknown createXAxis.title option/
  );
  const partial = program.createXAxisLine();
  assert.throws(() => partial.createXAxis(), /missing x-axis line/);
});

test("edits complete axes through existing leaf actions", () => {
  const before = chart()
    .createCanvas({ width: 360, height: 280, margin: 80 })
    .createData({ values: [{ x: 0, y: 5 }, { x: 10, y: 15 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes();
  const edited = before
    .editXAxis({
      position: "top",
      ticksAndLabels: { labels: { format: ".1f" } },
      title: { offset: 54 }
    })
    .editYAxis({ labels: { color: "#475569" }, title: { offset: 60 } });
  const xNode = edited.trace.children.at(-2);
  const yNode = edited.trace.children.at(-1);

  assert.deepEqual(xNode.children.map(child => child.op), [
    "editXAxisLine", "editXAxisTicksAndLabels", "editXAxisTitle"
  ]);
  assert.deepEqual(yNode.children.map(child => child.op), [
    "editYAxisLabels", "editYAxisTitle"
  ]);
  assert.equal(edited.guideConfigs.axis.x.line.position, "top");
  assert.equal(edited.guideConfigs.axis.x.labels.format, ".1f");
  assert.equal(edited.guideConfigs.axis.y.labels.color, "#475569");
  assert.equal(before.guideConfigs.axis.x.line.position, "bottom");
});

test("validates complete-axis facade options before leaf edits", () => {
  const program = encodedProgram().createAxes();
  assert.throws(() => program.editXAxis(), /at least one axis change/);
  assert.throws(
    () => program.editXAxis({ ticksAndLabels: {}, labels: {} }),
    /cannot combine/
  );
  assert.throws(
    () => program.editYAxis({ line: { unknown: true } }),
    /Unknown editYAxis.line option/
  );
});
