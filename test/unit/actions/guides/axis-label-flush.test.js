import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const values = [0, 25, 50, 75, 100];
const text = ["Long zero", "Long quarter", "Long middle", "Long three quarters", "Long hundred"];
const labelMap = values.map((value, index) => ({ value, label: text[index] }));
function base() {
  return chart().createCanvas({ width: 250, height: 250, margin: { left: 40, right: 10, top: 10, bottom: 40 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 100] } }, y: { field: "y", scale: { domain: [0, 100] } }, guides: false });
}
const axis = (flush, extra = {}) => ({ title: false, ticksAndLabels: { values, labels: { fontSize: 10, offset: 7, labelMap, overlap: "allow", ...extra, ...(flush === undefined ? {} : { flush }) } } });
const labelBounds = (p, channel = "x") => resolveConcreteGraphicBounds(p.graphicSpec, `${channel}AxisLabels`, p.materializationConfigs.textMetrics);

test("opt-in flush contains complete endpoint text without dropping ticks or shrinking fonts", () => {
  assert.throws(() => base().createXAxis(axis()), /Canvas margin/);
  const p = base().createXAxis(axis(true));
  const labels = p.graphicSpec.objects.xAxisLabels.items;
  assert.deepEqual(labels.map(i => i.properties.text), text);
  assert.equal(labels.length, values.length);
  assert.ok(labels.every(i => i.properties.fontSize === 10));
  assert.equal(p.graphicSpec.objects.xAxisTicks.items.length, values.length);
  const bounds = labelBounds(p);
  assert.ok(Math.abs(bounds.left - 40) < 1e-9);
  assert.ok(Math.abs(bounds.right - 240) < 1e-9);
  assert.deepEqual(p.resolvedScales.x.domain, [0, 100]);
  assert.throws(() => base().createXAxis(axis(true, { overlap: "error" })), /overlap each other/);
});

test("flush uses the along-offset span and preserves outward spacing on both axes", () => {
  const p = base().editCanvas({ width: 400, height: 400, margin: 80 });
  const x = p.createXAxis(axis(true, { alongOffset: 10 }));
  const xb = labelBounds(x);
  assert.ok(Math.abs(xb.left - 90) < 1e-9);
  assert.ok(Math.abs(xb.right - 330) < 1e-9);
  const y = p.createYAxis({ title: false, ticksAndLabels: { values, labels: { fontSize: 10, offset: 7, flush: true, alongOffset: -10 } } });
  const yb = labelBounds(y, "y");
  assert.ok(Math.abs(yb.top - 70) < 1e-9);
  assert.ok(Math.abs(yb.bottom - 310) < 1e-9);
});

test("complete, whole-axis, grouped and focused flush edits converge immutably", () => {
  const p = base().editCanvas({ width: 400, height: 400, margin: 80 }).createXAxis(axis(false));
  const snapshot = JSON.stringify(p);
  const direct = base().editCanvas({ width: 400, height: 400, margin: 80 }).createXAxis(axis(true));
  for (const edited of [p.editXAxisLabels({ flush: true }), p.editXAxisTicksAndLabels({ labels: { flush: true } }), p.editXAxis({ labels: { flush: true } }), p.editXAxis({ ticksAndLabels: { labels: { flush: true } } })]) {
    assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
    assert.deepEqual(edited.editXAxisLabels({ flush: false }).graphicSpec, p.graphicSpec);
  }
  assert.equal(JSON.stringify(p), snapshot);
});

test("flush survives Canvas and reversed-scale rematerialization", () => {
  const p = base().createXAxis(axis(true));
  const edited = p.editCanvas({ width: 300 }).editXScale({ domain: [100, 0] });
  const direct = base().editCanvas({ width: 300 }).editXScale({ domain: [100, 0] }).createXAxis(axis(true));
  assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
  assert.ok(Math.abs(labelBounds(edited).left - 40) < 1e-9);
  assert.ok(Math.abs(labelBounds(edited).right - 290) < 1e-9);
});

test("flush validates boolean/rotation and cannot hide a label wider than the scale span", () => {
  for (const flush of [null, undefined, 1, "true", Infinity]) {
    assert.throws(() => base().createXAxisLabels({ flush }), /flush.*boolean/);
  }
  assert.throws(() => base().createXAxis(axis(true, { rotation: Math.PI / 2 })), /flush.*unrotated/);
  assert.throws(() => base().createXAxis(axis(true, { labelMap: [{ value: 0, label: "wide ".repeat(100) }] })), /cannot flush/);
});

test("five full UTC timestamps fit a fixed 200-pixel span using explicit overlap allowance", () => {
  const start = Date.UTC(2012, 0, 1, 23), end = Date.UTC(2012, 0, 2, 3);
  const ticks = Array.from({ length: 5 }, (_, i) => start + i * 3600000);
  const p = chart().createCanvas({ width: 251, height: 247, margin: { left: 44, top: 10, right: 7, bottom: 37 } })
    .createData({ values: [{ t: start, v: 1 }, { t: end, v: 2 }] })
    .createLinePlot({ x: { field: "t", fieldType: "temporal", temporalUnit: "timestamp", scale: { domain: [start, end] } }, y: "v", guides: false })
    .createXAxis({ title: false, ticksAndLabels: { values: ticks, labels: { format: "%b %d, %Y %H:%M", fontSize: 10, offset: 7, flush: true, overlap: "allow" } } });
  const items = p.graphicSpec.objects.xAxisLabels.items;
  assert.equal(items.length, 5);
  assert.equal(items[0].properties.text, "Jan 01, 2012 23:00");
  assert.equal(items.at(-1).properties.text, "Jan 02, 2012 03:00");
  assert.ok(Math.abs(labelBounds(p).left - 44) < 1e-9);
  assert.ok(Math.abs(labelBounds(p).right - 244) < 1e-9);
});

test("flush translates wrapped label groups together", () => {
  const p = base().createXAxis(axis(true, { maxWidth: 45, wrap: "word", lineHeight: 10 }));
  const bounds = labelBounds(p);
  assert.ok(bounds.left >= 40 - 1e-9 && bounds.right <= 240 + 1e-9);
  assert.ok(p.graphicSpec.objects.xAxisLabels.items.length > values.length);
});
