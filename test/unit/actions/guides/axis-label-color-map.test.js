import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
const fills = (p, channel = "x") => p.graphicSpec.objects[`${channel}AxisLabels`].items.map(i => i.properties.fill);
const text = p => p.graphicSpec.objects.xAxisLabels.items.map(i => i.properties.text);
const colors = [{ value: "2", color: "green" }];
function categorical() {
  return chart().createCanvas({ width: 500, height: 350, margin: 80 })
    .createData({ values: [{ c: 2, v: 1 }, { c: "2", v: 2 }, { c: "3", v: 3 }] })
    .createBarPlot({ x: { field: "c", fieldType: "nominal" }, y: "v", guides: false });
}
const axis = (colorMap = colors) => ({ title: false, ticksAndLabels: { labels: { color: "red", colorMap, fontSize: 10 } } });

test("Cartesian label colors use typed raw values and a global fallback independently of display text", () => {
  const p = categorical().createXAxis(axis());
  assert.deepEqual(fills(p), ["red", "green", "red"]);
  const mapped = p.editXAxisLabels({ labelMap: [{ value: "2", label: "Second" }] });
  assert.deepEqual(text(mapped), ["2", "Second", "3"]);
  assert.deepEqual(fills(mapped), ["red", "green", "red"]);
  assert.deepEqual(fills(p.editXAxisLabels({ color: "blue" })), ["blue", "green", "blue"]);
  const before = categorical().createXAxis(axis([]));
  assertEquivalentMeaning(p.editXAxisLabels({ colorMap: "auto" }).graphicSpec, before.graphicSpec);
  assert.deepEqual(fills(p.editXAxisLabels({ colorMap: [] })), ["red", "red", "red"]);
  assert.notEqual(p.guideConfigs.axis.x.labels.colorMap, colors);
  assert.ok(Object.isFrozen(p.guideConfigs.axis.x.labels.colorMap));
});

test("complete, focused, grouped and whole-axis color edits converge without mutating parents", () => {
  const p = categorical().createXAxis(axis([]));
  const snapshot = JSON.stringify(p);
  const direct = categorical().createXAxis(axis());
  for (const edited of [p.editXAxisLabels({ colorMap: colors }), p.editXAxisTicksAndLabels({ labels: { colorMap: colors } }), p.editXAxis({ labels: { colorMap: colors } }), p.editXAxis({ ticksAndLabels: { labels: { colorMap: colors } } })]) {
    assertEquivalentMeaning(edited.graphicSpec, direct.graphicSpec);
  }
  assert.equal(JSON.stringify(p), snapshot);
  const replay = direct.editCanvas({ width: 540 }).editScale({ id: "x", reverse: true });
  assert.deepEqual(fills(replay), ["red", "green", "red"]);
});

test("numeric/time color maps accept finite keys and fall back for changed ticks", () => {
  const p = chart().createCanvas({ width: 400, height: 400, margin: 80 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 100] } }, y: { field: "y", scale: { domain: [0, 100] } }, guides: false })
    .createYAxis({ title: false, ticksAndLabels: { values: [0, 50, 100], labels: { color: "red", colorMap: [{ value: 50, color: "blue" }] } } });
  assert.deepEqual(fills(p, "y"), ["red", "blue", "red"]);
  assert.deepEqual(fills(p.editYAxisTicksAndLabels({ values: [0, 25, 100] }), "y"), ["red", "red", "red"]);
  const jan = Date.UTC(2020, 0, 1), feb = Date.UTC(2020, 1, 1);
  const time = chart().createCanvas({ width: 400, height: 300, margin: 80 })
    .createData({ values: [{ t: jan, v: 1 }, { t: feb, v: 2 }] })
    .createLinePlot({ x: { field: "t", fieldType: "temporal", temporalUnit: "timestamp", scale: { domain: [jan, feb] } }, y: "v", guides: false })
    .createXAxis({ title: false, ticksAndLabels: { values: [jan, feb], labels: { color: "red", colorMap: [{ value: feb, color: "blue" }] } } });
  assert.deepEqual(fills(time), ["red", "blue"]);
  assert.deepEqual(fills(time.editCanvas({ width: 440 })), ["red", "blue"]);
  for (const value of ["50", true, null, NaN, Infinity]) {
    assert.throws(() => p.editYAxisLabels({ colorMap: [{ value, color: "blue" }] }), /finite number|timestamp/);
  }
});

test("wrapped lines keep their raw tick color and maps are immutable", () => {
  const input = [{ value: "2", color: "green" }];
  const p = categorical().createXAxis(axis(input)).editXAxisLabels({ labelMap: [{ value: "2", label: "Two words" }], maxWidth: 30, lineHeight: 12 });
  input[0].color = "purple";
  assert.deepEqual(p.graphicSpec.objects.xAxisLabels.items.filter(i => ["Two", "words"].includes(i.properties.text)).map(i => i.properties.fill), ["green", "green"]);
});

test("color maps reject unknown fields, malformed colors and duplicate typed keys atomically", () => {
  const p = categorical().createXAxis(axis());
  const snapshot = JSON.stringify(p);
  for (const colorMap of [null, {}, undefined, [{ value: "2", color: "" }], [{ value: "2", color: 1 }], [{ value: "2", color: "red", label: "extra" }], [{ value: "2" }], [{ value: 0, color: "red" }, { value: -0, color: "blue" }]]) {
    assert.throws(() => p.editXAxisLabels({ colorMap }), /colorMap|color|duplicate/);
    assert.throws(() => p.editXAxis({ ticksAndLabels: { labels: { colorMap } } }), /colorMap|color|duplicate/);
  }
  assert.equal(JSON.stringify(p), snapshot);
});
