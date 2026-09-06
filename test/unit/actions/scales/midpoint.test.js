import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { createMidpoint } from "../../../../examples/color-midpoint/program.js";
const semantic = p => p.semanticSpec.scales.find(x => x.id === "colors");
const fills = (p, id = "m") => p.graphicSpec.objects[id].items.map(x => x.properties.fill);
const color = { target: "m", field: "value", fieldType: "quantitative" };
test("creates unattached midpoint scales and resets their semantic policy", () => {
  const p = chart().createScale({ id: "colors", type: "sequential", midpoint: 0 });
  assert.equal(semantic(p).midpoint, 0);
  assert.equal(semantic(p.editScale({ id: "colors", range: ["blue", "red"] })).midpoint, 0);
  assert.equal(Object.hasOwn(semantic(p.editScale({ midpoint: "auto" })), "midpoint"), false);
  assert.equal(Object.hasOwn(semantic(p.editScale({ type: "quantize", domain: [-2, 8], range: ["blue", "red"] })), "midpoint"), false);
});
test("reassignment preserves or explicitly resets midpoint and updates guides", () => {
  const p = createMidpoint();
  const before = JSON.stringify(p);
  assert.equal(semantic(p.encodeColor({ ...color, scale: { clamp: true } })).midpoint, 0);
  assert.throws(() => p.encodeColor({ ...color, scale: { midpoint: null } }), /midpoint/);
  const q = p.encodeColor({ ...color, scale: { midpoint: "auto" } });
  assert.equal(Object.hasOwn(semantic(q), "midpoint"), false);
  assert.deepEqual(fills(q), ["#0000ff", "#6666ff", "#ffcccc", "#ff0000"]);
  assert.equal(q.graphicSpec.objects.colorGradientLabels.items.length, 3);
  assert.equal(JSON.stringify(p), before);
});
test("reverses colors while retaining value-linear midpoint ticks", () => {
  const p = createMidpoint().editScale({ id: "colors", reverse: true, clamp: true });
  assert.deepEqual(fills(p), ["#ff0000", "#ffffff", "#8080ff", "#0000ff"]);
  assert.equal(p.graphicSpec.objects.colorGradientLabels.items.find(x => x.properties.text === "0").properties.y, 292);
  // Vertical strip 47 samples fraction 5/24, i.e. value 1/12, just above the midpoint.
  assert.equal(p.graphicSpec.objects.colorGradientStrips.items[47].properties.fill, "#fcfcff");
});
test("rejects invalid edits without changing state, graphics, context or trace", () => {
  const p = createMidpoint(); const before = JSON.stringify(p);
  for (const patch of [{ midpoint: 8 }, { midpoint: NaN }, { domain: [0, 8] }, { domain: [2, 8] }]) {
    assert.throws(() => p.editScale({ id: "colors", ...patch }), /midpoint/);
    assert.equal(JSON.stringify(p), before);
  }
});
test("validates an inferred domain when the midpoint scale first gains consumers", () => {
  const p = chart().createCanvas().createData({ id: "data", values: [{ x: 1, v: 2 }, { x: 2, v: 8 }] })
    .createScale({ id: "colors", type: "sequential", midpoint: 0 }).createPointMark({ id: "m" });
  assert.throws(() => p.encodeColor({ target: "m", field: "v", fieldType: "quantitative", scale: { id: "colors" } }), /strictly/);
  assert.equal(p.semanticSpec.layers[0].encoding?.color, undefined);
});
test("rejects temporal, position and discrete color midpoint usage", () => {
  const p = chart().createCanvas().createData({ id: "data", values: [{ x: 1, date: "2024-01-01" }, { x: 2, date: "2025-01-01" }] }).createPointMark({ id: "m" });
  assert.throws(() => p.encodeX({ target: "m", field: "x", scale: { midpoint: 0 } }), /midpoint/);
  assert.throws(() => p.encodeColor({ target: "m", field: "date", fieldType: "temporal", scale: { midpoint: Date.parse("2024-06-01") } }), /quantitative/);
  assert.throws(() => p.encodeColor({ target: "m", field: "x", fieldType: "quantitative", scale: { type: "quantize", midpoint: 0 } }), /midpoint/);
});
test("updates every shared mark using one midpoint scale with a live legend", () => {
  const p = createMidpoint().createPointMark({ id: "other" }).encodeColor({ target: "other", field: "value", fieldType: "quantitative", scale: { id: "colors" } });
  const q = p.editScale({ id: "colors", midpoint: 4 });
  assert.deepEqual(fills(q), fills(q, "other"));
  assert.equal(fills(q)[2], "#ffffff");
  assert.equal(semantic(p).midpoint, 0);
});
test("deduplicates a midpoint already present among the base legend ticks", () => {
  const p = createMidpoint().editScale({ id: "colors", midpoint: 3 });
  assert.equal(p.graphicSpec.objects.colorGradientLabels.items.filter(x => x.properties.text === "3").length, 1);
  assert.equal(p.graphicSpec.objects.colorGradientLabels.items.length, 3);
});
test("applies midpoint at aggregate Bar and observed Rect grain", () => {
  const base = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "data", values: [{ category: "A", row: "r", value: -2 }, { category: "B", row: "r", value: 0 }, { category: "C", row: "r", value: 4 }, { category: "D", row: "r", value: 8 }] });
  const bar = base.createBarPlot({ id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color: { field: "value", fieldType: "quantitative", scale: { id: "colors", midpoint: 0, range: ["blue", "white", "red"] } }, guides: false });
  assert.deepEqual(fills(bar), ["#0000ff", "#ff8080", "#ff0000"]);
  const rect = base.createRectMark({ id: "m" }).encodeX({ target: "m", field: "category", fieldType: "nominal" }).encodeY({ target: "m", field: "row", fieldType: "nominal" })
    .encodeColor({ ...color, scale: { id: "colors", midpoint: 0, range: ["blue", "white", "red"] } });
  assert.deepEqual(fills(rect), ["#0000ff", "#ffffff", "#ff8080", "#ff0000"]);
  assert.equal(fills(rect.editScale({ id: "colors", midpoint: 4 }))[2], "#ffffff");
});
test("rejects numeric midpoint for a shared temporal color consumer", () => {
  const base = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "data", values: [{ x: 0, value: 0 }, { x: 1, value: 10 }] })
    .createScatterPlot({ id: "m", x: "x", y: "value", color: { field: "value", fieldType: "quantitative", scale: { id: "colors" } }, guides: false })
    .createPointMark({ id: "temporal" })
    .encodeColor({ target: "temporal", field: "value", fieldType: "temporal", temporalUnit: "timestamp", scale: { id: "colors" } });
  const before = JSON.stringify(base);
  assert.throws(() => base.editScale({ id: "colors", midpoint: 5 }), /quantitative/);
  assert.throws(() => base.encodeColor({ ...color, scale: { midpoint: 5 } }), /quantitative/);
  assert.equal(JSON.stringify(base), before);
});
