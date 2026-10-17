import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const COMPONENTS = Object.freeze(["line", "ticks", "labels", "title"]);
const CREATE_COMPONENT = Object.freeze({
  line: "Line",
  ticks: "Ticks",
  labels: "Labels",
  title: "Title"
});

function completeAxes() {
  return chart()
    .createCanvas({ width: 420, height: 300, margin: 80 })
    .createData({
      id: "rows",
      values: [{ x: 0, y: 2 }, { x: 10, y: 8 }]
    })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .createAxes({ coordinate: { id: "main" } });
}

function graphicId(channel, component) {
  const suffix = component[0].toUpperCase() + component.slice(1);
  return `${channel}Axis${suffix}`;
}

test("removes every Cartesian axis leaf while retaining unrelated state", () => {
  for (const channel of ["x", "y"]) {
    for (const component of COMPONENTS) {
      const before = completeAxes();
      const method = channel === "x" ? "editXAxis" : "editYAxis";
      const options = Object.freeze({ [component]: false });
      const after = before[method](options);

      assert.equal(after.graphicSpec.objects[graphicId(channel, component)], undefined);
      assert.equal(after.guideConfigs.axis[channel][component], undefined);
      if (component === "title") {
        assert.equal(after.semanticSpec.guides.axis[channel].title, undefined);
      }
      for (const retained of COMPONENTS.filter(value => value !== component)) {
        assert.ok(after.graphicSpec.objects[graphicId(channel, retained)]);
        assert.ok(after.guideConfigs.axis[channel][retained]);
      }
      assert.equal(after.semanticSpec.guides.axis[channel].scale, channel);
      assert.equal(after.semanticSpec.guides.axis[channel].coordinate, "main");
      assert.deepEqual(after.semanticSpec.layers, before.semanticSpec.layers);
      assert.deepEqual(after.semanticSpec.datasets, before.semanticSpec.datasets);
      assert.ok(after.resolvedScales[channel]);
      assert.ok(before.graphicSpec.objects[graphicId(channel, component)]);
      assert.deepEqual(options, { [component]: false });

      const prefix = channel === "x" ? "X" : "Y";
      const recreated = after[`create${prefix}Axis${CREATE_COMPONENT[component]}`]();
      assert.ok(recreated.graphicSpec.objects[graphicId(channel, component)]);
      assert.ok(recreated.guideConfigs.axis[channel][component]);
    }
  }
});

test("removes the tick-label group atomically and recreates it through the ordinary path", () => {
  const before = completeAxes();
  const removed = before.editXAxis({ ticksAndLabels: false });
  const node = removed.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "editGraphics", "editGraphics"
  ]);
  assert.equal(removed.graphicSpec.objects.xAxisTicks, undefined);
  assert.equal(removed.graphicSpec.objects.xAxisLabels, undefined);
  assert.equal(removed.guideConfigs.axis.x.ticks, undefined);
  assert.equal(removed.guideConfigs.axis.x.labels, undefined);
  assert.ok(removed.graphicSpec.objects.xAxisLine);
  assert.ok(removed.graphicSpec.objects.xAxisTitle);

  const recreated = removed.createXAxisTicksAndLabels({ values: [0, 5, 10] });
  assert.deepEqual(recreated.guideConfigs.axis.x.ticks.values, [0, 5, 10]);
  assert.deepEqual(recreated.guideConfigs.axis.x.labels.values, [0, 5, 10]);
  assert.ok(recreated.graphicSpec.objects.xAxisTicks);
  assert.ok(recreated.graphicSpec.objects.xAxisLabels);
});

test("cleans the complete axis after the last component and supports complete recreation", () => {
  const before = completeAxes();
  const removed = before.editYAxis({
    line: false,
    ticksAndLabels: false,
    title: false
  });
  const node = removed.trace.children.at(-1);

  assert.equal(removed.semanticSpec.guides.axis.y, undefined);
  assert.equal(removed.guideConfigs.axis?.y, undefined);
  for (const component of COMPONENTS) {
    assert.equal(removed.graphicSpec.objects[graphicId("y", component)], undefined);
  }
  assert.equal(node.children.at(-1).op, "removeYAxis");
  assert.deepEqual(removed.semanticSpec.layers, before.semanticSpec.layers);
  assert.ok(removed.resolvedScales.y);

  const recreated = removed.createYAxis({ coordinate: "main" });
  assert.equal(recreated.semanticSpec.guides.axis.y.coordinate, "main");
  for (const component of COMPONENTS) {
    assert.ok(recreated.graphicSpec.objects[graphicId("y", component)]);
  }
});

test("moves every retained component when removal and a shared position are combined", () => {
  const before = completeAxes();
  const after = before.editXAxis({ position: "top", line: false });
  const node = after.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "editGraphics", "editXAxisTicks", "editXAxisLabels", "editXAxisTitle"
  ]);
  assert.equal(after.graphicSpec.objects.xAxisLine, undefined);
  for (const component of ["ticks", "labels", "title"]) {
    assert.equal(after.guideConfigs.axis.x[component].position, "top");
  }
});

test("preflights every selected operation before returning any state or trace", () => {
  const before = completeAxes();
  const trace = before.trace;
  const graphicSpec = before.graphicSpec;
  const configs = before.materializationConfigs;
  const options = Object.freeze({
    line: false,
    title: Object.freeze({ offset: Infinity })
  });

  assert.throws(() => before.editXAxis(options), /offset/);
  assert.equal(before.trace, trace);
  assert.equal(before.graphicSpec, graphicSpec);
  assert.equal(before.materializationConfigs, configs);
  assert.ok(before.graphicSpec.objects.xAxisLine);
  assert.deepEqual(options, { line: false, title: { offset: Infinity } });
});

test("rejects missing removals and group-leaf conflicts before cleanup", () => {
  const withoutLine = completeAxes().editXAxis({ line: false });
  assert.throws(
    () => withoutLine.editXAxis({ line: false }),
    /requires an existing x-axis line/
  );

  const withoutTicks = completeAxes().editXAxis({ ticks: false });
  assert.throws(
    () => withoutTicks.editXAxis({ ticksAndLabels: false }),
    /requires an existing x-axis ticks/
  );
  assert.ok(withoutTicks.graphicSpec.objects.xAxisLabels);

  const program = completeAxes();
  assert.throws(
    () => program.editYAxis({ ticksAndLabels: false, labels: false }),
    /cannot combine ticksAndLabels with ticks or labels/
  );
  assert.throws(
    () => program.editXAxis({ title: true }),
    /must be false or a plain object/
  );
});

test("does not resurrect removed components after Canvas and scale edits", () => {
  const removed = completeAxes()
    .editXAxis({ ticks: false, title: false })
    .editYAxis({ line: false, labels: false });
  const rematerialized = removed
    .editCanvas({ width: 460, height: 320 })
    .editScale({ id: "x", reverse: true })
    .editScale({ id: "y", reverse: true });

  for (const id of ["xAxisTicks", "xAxisTitle", "yAxisLine", "yAxisLabels"]) {
    assert.equal(rematerialized.graphicSpec.objects[id], undefined, id);
  }
  assert.equal(rematerialized.guideConfigs.axis.x.ticks, undefined);
  assert.equal(rematerialized.guideConfigs.axis.x.title, undefined);
  assert.equal(rematerialized.guideConfigs.axis.y.line, undefined);
  assert.equal(rematerialized.guideConfigs.axis.y.labels, undefined);
  assert.ok(rematerialized.graphicSpec.objects.xAxisLine);
  assert.ok(rematerialized.graphicSpec.objects.xAxisLabels);
  assert.ok(rematerialized.graphicSpec.objects.yAxisTicks);
  assert.ok(rematerialized.graphicSpec.objects.yAxisTitle);
});
