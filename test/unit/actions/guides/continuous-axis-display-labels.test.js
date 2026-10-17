import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
const texts = (p, channel = "x") => p.graphicSpec.objects[`${channel}AxisLabels`].items.map(i => i.properties.text);
const map = Object.freeze([Object.freeze({ value: 0, label: "0" }), Object.freeze({ value: 20, label: "0.2" }), Object.freeze({ value: 100, label: "1" })]);
function base() {
  return chart().createCanvas({ width: 400, height: 400, margin: 80 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 100] } }, y: { field: "y", scale: { domain: [0, 100] } }, guides: false });
}
function axis(labelMap = map) { return { title: false, ticksAndLabels: { values: [0, 20, 40, 100], labels: { labelMap, fontSize: 10 } } }; }

test("continuous labels map raw tick values while retaining formatter fallback and geometry", () => {
  const before = base().createXAxis(axis([]));
  const p = base().createXAxis(axis());
  assert.deepEqual(texts(p), ["0", "0.2", "40", "1"]);
  assert.deepEqual(p.resolvedScales, before.resolvedScales);
  assert.deepEqual(p.semanticSpec, before.semanticSpec);
  assert.deepEqual(p.graphicSpec.objects.xAxisTicks, before.graphicSpec.objects.xAxisTicks);
  assert.deepEqual(p.guideConfigs.axis.x.labels.values, [0, 20, 40, 100]);
  assert.notEqual(p.guideConfigs.axis.x.labels.labelMap, map);
  assert.deepEqual(texts(p.editXAxisLabels({ format: ".1f" })), ["0", "0.2", "40.0", "1"]);
  assert.deepEqual(texts(p.editXAxisLabels({ labelMap: "auto" })), ["0", "20", "40", "100"]);
  assert.deepEqual(texts(p.editXAxisLabels({ labelMap: [] })), ["0", "20", "40", "100"]);
});

test("focused, grouped and whole-axis edits share continuous map behavior atomically", () => {
  const before = base().createAxes({ x: axis([]), y: axis([]) });
  const snapshot = JSON.stringify(before);
  const edited = before.editXAxis({ labels: { labelMap: map } })
    .editYAxis({ ticksAndLabels: { labels: { labelMap: map } } });
  assert.deepEqual(texts(edited), ["0", "0.2", "40", "1"]);
  assert.deepEqual(texts(edited, "y"), ["0", "0.2", "40", "1"]);
  const direct = base().createAxes({ x: axis(), y: axis() });
  assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
  assert.equal(JSON.stringify(before), snapshot);
  const changed = edited.editXAxisTicksAndLabels({ values: [0, 20, 60, 100] });
  assert.deepEqual(texts(changed), ["0", "0.2", "60", "1"]);
});

test("continuous maps survive scale and Canvas replay with new ticks falling back", () => {
  const p = base().createXAxis({ title: false, ticksAndLabels: { count: 6, labels: { labelMap: map, fontSize: 10 } } });
  const resized = p.editCanvas({ width: 440 });
  assert.deepEqual(texts(resized), texts(p));
  const changed = resized.editXScale({ domain: [0, 200] });
  assert.deepEqual(changed.guideConfigs.axis.x.labels.labelMap, map);
  assert.ok(texts(changed).includes("1"));
  assert.ok(texts(changed).includes("200"));
});

test("time-axis maps use epoch keys and retain UTC formatting for unmapped instants", () => {
  const jan = Date.UTC(2020, 0, 1), feb = Date.UTC(2020, 1, 1), mar = Date.UTC(2020, 2, 1);
  const p = chart().createCanvas({ width: 400, height: 300, margin: 80 })
    .createData({ values: [{ t: jan, v: 1 }, { t: mar, v: 2 }] })
    .createLinePlot({ x: { field: "t", fieldType: "temporal", temporalUnit: "timestamp", scale: { domain: [jan, mar] } }, y: "v", guides: false })
    .createXAxis({ title: false, ticksAndLabels: { values: [jan, feb, mar], labels: { format: "%b", fontSize: 10, labelMap: [{ value: feb, label: "Special" }] } } });
  assert.deepEqual(texts(p), ["Jan", "Special", "Mar"]);
  assert.deepEqual(texts(p.editCanvas({ width: 420 })), ["Jan", "Special", "Mar"]);
});

test("invalid continuous keys reject without mutating caller data or prior programs", () => {
  const p = base().createXAxis(axis());
  const snapshot = JSON.stringify(p);
  for (const value of ["20", true, null, NaN, Infinity, -Infinity]) {
    const labelMap = [{ value, label: "invalid" }];
    assert.throws(() => p.editXAxisLabels({ labelMap }), /finite number|timestamp/);
    assert.throws(() => p.editXAxis({ labels: { labelMap } }), /finite number|timestamp/);
    assert.throws(() => base().createXAxis(axis(labelMap)), /finite number|timestamp/);
  }
  assert.throws(() => p.editXAxisLabels({ labelMap: [{ value: 0, label: "a" }, { value: -0, label: "b" }] }), /duplicate/);
  assert.equal(JSON.stringify(p), snapshot);
});
