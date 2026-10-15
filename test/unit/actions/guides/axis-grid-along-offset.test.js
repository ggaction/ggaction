import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const values = [0, 20, 40, 60, 80, 100];
function base() {
  return chart().createCanvas({ width: 360, height: 360, margin: 80 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 100, y: 100 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 100] } }, y: { field: "y", scale: { domain: [0, 100] } }, guides: false });
}
const properties = (p, id, key) => p.graphicSpec.objects[id].items.map(i => i.properties[key]);
function axes(tick = 0, label = 0, side = {}) {
  return Object.fromEntries(["x", "y"].map(channel => [channel, {
    ...(side[channel] ? { position: side[channel] } : {}),
    line: {}, title: false,
    ticksAndLabels: { values, ticks: { alongOffset: tick }, labels: { alongOffset: label, fontSize: 10, offset: 7 } }
  }]));
}
const grids = offset => ({ horizontal: { alongOffset: offset }, vertical: { alongOffset: offset } });

test("Cartesian tick, label and grid offsets are independent logical-pixel translations", () => {
  const plain = base().createAxes(axes()).createGrid(grids(0));
  const moved = base().createAxes(axes(10, 20)).createGrid(grids(10));
  for (const [id, key, delta] of [
    ["xAxisTicks", "x1", 10], ["yAxisTicks", "y1", 10],
    ["xAxisLabels", "x", 20], ["yAxisLabels", "y", 20],
    ["verticalGridLines", "x1", 10], ["horizontalGridLines", "y1", 10]
  ]) assert.deepEqual(properties(moved, id, key), properties(plain, id, key).map(v => v + delta));
  assert.deepEqual(properties(moved, "xAxisLabels", "y"), properties(plain, "xAxisLabels", "y"));
  assert.deepEqual(properties(moved, "yAxisLabels", "x"), properties(plain, "yAxisLabels", "x"));
  assert.deepEqual(moved.semanticSpec.layers, plain.semanticSpec.layers);
  assert.deepEqual(moved.resolvedScales, plain.resolvedScales);
  assert.equal(moved.materializationConfigs.guides.axis.x.labels.alongOffset, 20);
});

test("complete, whole-axis, grouped and focused edits converge without mutating parents", () => {
  const before = base().createAxes(axes()).createGrid(grids(0));
  const snapshot = JSON.stringify(before);
  const whole = before.editXAxis({ ticksAndLabels: { ticks: { alongOffset: 10 }, labels: { alongOffset: 20 } } })
    .editYAxis({ ticks: { alongOffset: 10 }, labels: { alongOffset: 20 } })
    .editGrid(grids(10));
  const focused = before.editXAxisTicks({ alongOffset: 10 }).editXAxisLabels({ alongOffset: 20 })
    .editYAxisTicksAndLabels({ ticks: { alongOffset: 10 }, labels: { alongOffset: 20 } })
    .editHorizontalGrid({ alongOffset: 10 }).editVerticalGrid({ alongOffset: 10 });
  const direct = base().createAxes(axes(10, 20)).createGrid(grids(10));
  assert.deepEqual(whole.graphicSpec, direct.graphicSpec);
  assert.deepEqual(focused.graphicSpec, direct.graphicSpec);
  assert.equal(JSON.stringify(before), snapshot);
  const reset = focused.editXAxisTicksAndLabels({ ticks: { alongOffset: 0 }, labels: { alongOffset: 0 } })
    .editYAxis({ ticksAndLabels: { ticks: { alongOffset: 0 }, labels: { alongOffset: 0 } } }).editGrid(grids(0));
  assert.deepEqual(reset.graphicSpec, before.graphicSpec);
});

test("signed offsets retain screen direction on top/right axes and reversed domains", () => {
  const original = base().editXScale({ domain: [100, 0] }).editYScale({ domain: [100, 0] });
  const sides = { x: "top", y: "right" };
  const plain = original.createAxes(axes(0, 0, sides));
  const moved = original.createAxes(axes(-10, -20, sides));
  assert.deepEqual(properties(moved, "xAxisTicks", "x1"), properties(plain, "xAxisTicks", "x1").map(x => x - 10));
  assert.deepEqual(properties(moved, "yAxisLabels", "y"), properties(plain, "yAxisLabels", "y").map(y => y - 20));
});

test("Canvas and scale rematerialization preserves absolute offsets", () => {
  const original = base().createAxes(axes(10, 20)).createGrid(grids(10));
  const replay = original.editCanvas({ width: 400, height: 400 }).editXScale({ domain: [0, 200] }).editYScale({ domain: [0, 200] });
  const expected = base().editCanvas({ width: 400, height: 400 }).editXScale({ domain: [0, 200] }).editYScale({ domain: [0, 200] })
    .createAxes(axes(10, 20)).createGrid(grids(10));
  assert.deepEqual(replay.graphicSpec, expected.graphicSpec);
  const unchanged = original.editCanvas({ width: 360, height: 360 });
  assert.deepEqual(unchanged.graphicSpec, original.graphicSpec);
});

test("band-boundary grids translate after boundary construction", () => {
  const p = chart().createCanvas({ width: 400, height: 300, margin: 80 })
    .createData({ values: [{ c: "A", v: 1 }, { c: "B", v: 2 }] })
    .createBarPlot({ x: "c", y: "v", guides: false });
  const before = p.createGrid({ horizontal: false, vertical: { bandPosition: "boundary" } });
  const moved = p.createGrid({ horizontal: false, vertical: { bandPosition: "boundary", alongOffset: -5 } });
  assert.deepEqual(properties(moved, "verticalGridLines", "x1"), properties(before, "verticalGridLines", "x1").map(x => x - 5));
});

test("non-finite and nonnumeric offsets reject atomically across complete and focused APIs", () => {
  const p = base().createAxes(axes()).createGrid(grids(0));
  const snapshot = JSON.stringify(p);
  for (const alongOffset of [NaN, Infinity, -Infinity, "10", null, undefined]) {
    assert.throws(() => base().createXAxis({ title: false, ticksAndLabels: { ticks: { alongOffset } } }), /alongOffset|finite/);
    assert.throws(() => p.editXAxisTicks({ alongOffset }), /alongOffset.*finite/);
    assert.throws(() => p.editYAxisLabels({ alongOffset }), /alongOffset.*finite/);
    assert.throws(() => p.editYAxis({ ticksAndLabels: { ticks: { alongOffset } } }), /alongOffset.*finite/);
    assert.throws(() => p.editGrid({ vertical: { alongOffset } }), /alongOffset.*finite/);
    assert.throws(() => base().createGrid({ vertical: { alongOffset } }), /alongOffset.*finite/);
  }
  assert.equal(JSON.stringify(p), snapshot);
});
