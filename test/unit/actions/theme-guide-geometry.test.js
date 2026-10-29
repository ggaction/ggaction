import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const base = (factory = chart) => factory().createCanvas({ width: 600, height: 450, margin: 100 })
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] });
const point = p => p.createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
const tokens = { axisStrokeWidth: 3, tickStrokeWidth: 2, tickSize: 13, gridStrokeWidth: .5 };
const theme = { base: "dark", tokens };
const variants = [
  ["Cartesian", p => point(p).createAxes().createGrid({ horizontal: true, vertical: true }), "xAxisLine", "xAxisTicks", "horizontalGridLines"],
  ["named Cartesian", p => point(p).createYAxis({ id: "measure", position: "right" }), "axis_measure__Line", "axis_measure__Ticks"],
  ["Polar", p => p.createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" }).createThetaAxis().createRadialAxis()
    .createGrid({ theta: true, radial: true }), "thetaAxisLine", "radialAxisTicks", "radialGridCircles"],
  ["Parallel", p => p.createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } }), "parallelAxisLines", "parallelAxisTicks"]
];
const values = (p, id, key) => {
  const object = p.graphicSpec.objects[id];
  return object.items ? object.items.map(item => item.properties[key]) : [object.properties[key]];
};

for (const [name, build, line, ticks, grid] of variants) {
  test(`${name} guide geometry tokens rematerialize and restore native defaults`, () => {
    const seed = base(), p = build(seed), saved = serializeProgram(p);
    const q = p.applyTheme({ theme });
    assert.ok(values(q, line, "strokeWidth").every(value => value === 3));
    assert.ok(values(q, ticks, "strokeWidth").every(value => value === 2));
    assert.ok(q.graphicSpec.objects[ticks].items.every(item => Math.abs(Math.hypot(
      item.properties.x2 - item.properties.x1, item.properties.y2 - item.properties.y1) - 13) < 1e-10));
    if (grid) assert.ok(values(q, grid, "strokeWidth").every(value => value === .5));
    if (p.graphicSpec.objects.point) assert.deepEqual(q.graphicSpec.objects.point.items.map(item => [item.identity, item.properties.x, item.properties.y]),
      p.graphicSpec.objects.point.items.map(item => [item.identity, item.properties.x, item.properties.y]));
    assert.equal(q.semanticSpec, p.semanticSpec);
    assert.equal(q.resolvedScales, p.resolvedScales);
    for (const result of [q, build(seed.applyTheme({ theme })), deserializeProgram(serializeProgram(q))]) {
      assert.deepEqual(result.removeTheme().graphicSpec, p.graphicSpec);
      assert.deepEqual(result.removeTheme().guideConfigs, p.guideConfigs);
    }
    assert.equal(serializeProgram(p), saved);
  });
}

test("guide geometry honors explicit native values and zero through facades and direct edits", () => {
  const p = point(base()).createGuides({ axes: { x: { line: { lineWidth: 1 }, ticksAndLabels: { ticks: { length: 6, lineWidth: 0 } } }, y: false },
    grid: { horizontal: { lineWidth: 0 }, vertical: false }, legend: false });
  const q = p.applyTheme({ theme });
  assert.deepEqual(values(q, "xAxisLine", "strokeWidth"), [1]);
  assert.ok(values(q, "xAxisTicks", "strokeWidth").every(value => value === 0));
  assert.equal(q.guideConfigs.axis.x.ticks.length, 6);
  assert.ok(values(q, "horizontalGridLines", "strokeWidth").every(value => value === 0));
  const r = q.editXAxisTicks({ length: 0 }).applyTheme({ theme: { base: "light", tokens: { tickSize: 20 } } });
  assert.equal(r.guideConfigs.axis.x.ticks.length, 0);
});

test("Basic and nested descendants share numeric theme defaults without resizing canvases", () => {
  const basic = point(base(basicChart)).createAxes();
  const zero = basic.applyTheme({ theme: { base: "light", tokens: Object.fromEntries(Object.keys(tokens).map(key => [key, 0])) } });
  assert.equal(zero.guideConfigs.axis.x.ticks.length, 0);
  assert.deepEqual(values(zero, "xAxisLine", "strokeWidth"), [0]);
  const child = variants[0][1](base()), p = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: variants[2][1](base()) }] });
  const q = p.applyTheme({ theme, scope: "descendants" });
  assert.deepEqual(values(q.children.a, "xAxisLine", "strokeWidth"), [3]);
  assert.equal(q.graphicSpec.objects.canvas.properties.width, p.graphicSpec.objects.canvas.properties.width);
  assert.deepEqual(q.removeTheme().graphicSpec, p.graphicSpec);
});

test("parallel and polar explicit widths and lengths survive same-default and later edits", () => {
  const parallel = variants[3][1](base()).editParallelAxis({ field: "x", line: { lineWidth: 1.25 }, ticks: { length: 8, lineWidth: 0 } });
  const q = parallel.applyTheme({ theme });
  assert.deepEqual(q.guideConfigs.axis.parallel.axes.dimensions.map(item => item.line.lineWidth), [1.25, 3]);
  assert.deepEqual(q.guideConfigs.axis.parallel.axes.dimensions.map(item => item.ticks.length), [8, 13]);
  assert.deepEqual(q.removeTheme().graphicSpec, parallel.graphicSpec);
  const polar = variants[2][1](base()).editRadialAxisLine({ lineWidth: 0 }).editThetaAxisTicks({ length: 0 });
  const next = polar.applyTheme({ theme });
  assert.deepEqual(values(next, "radialAxisLine", "strokeWidth"), [0]);
  assert.equal(next.guideConfigs.axis.theta.ticks.length, 0);
  assert.deepEqual(next.removeTheme().graphicSpec, polar.graphicSpec);
});

test("numeric guide updates retain explicit extension paint while scale and Canvas edits keep themed geometry", () => {
  const p = variants[0][1](base()).editGraphics({ target: "xAxisLine", property: "stroke", value: "purple" });
  const q = p.applyTheme({ theme });
  assert.deepEqual(values(q, "xAxisLine", "stroke"), ["purple"]);
  const resized = q.editCanvas({ width: 700 }).editXScale({ domain: [0, 4] });
  assert.equal(resized.guideConfigs.axis.x.ticks.length, 13);
  assert.ok(values(resized, "xAxisTicks", "strokeWidth").every(value => value === 2));
});

test("invalid numeric tokens and overflowing ticks fail without mutating the receiver", () => {
  const p = variants[0][1](base()), saved = serializeProgram(p), trace = p.trace;
  for (const key of Object.keys(tokens)) for (const value of [-1, Infinity, NaN, "2", null]) {
    assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { [key]: value } } }));
    assert.equal(serializeProgram(p), saved);
    assert.equal(p.trace, trace);
  }
  assert.throws(() => p.applyTheme({ theme: { base: "light", tokens: { tickSize: 1000 } } }), /bounds|Canvas|overflow|space/i);
  assert.equal(serializeProgram(p), saved);
});
