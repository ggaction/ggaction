import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basic } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveGuideCollisionBlocks } from "../../../../src/materialization/guides/resources.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";

const data = [{ x: 0, y: 1, g: "A", v: 0 }, { x: 1, y: 2, g: "B", v: 25 }, { x: 2, y: 1, g: "C", v: 100 }];
function source(factory = chart, continuous = false) {
  return factory().createCanvas({ plot: { width: 314, height: 314 }, margin: 60 }).createData({ values: data })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false,
      color: { field: continuous ? "v" : "g", fieldType: continuous ? "quantitative" : "nominal" } });
}
const blocks = p => resolveGuideCollisionBlocks(p.graphicSpec, p.guideConfigs, p.titleConfig, p.materializationConfigs.textMetrics);
function gap(p, position) {
  const b = blocks(p), plot = resolveGraphicBounds(p);
  const axes = b.filter(b => b.kind === "axis" && b.position === position);
  const legends = b.filter(b => b.kind === "legend" && b.position === position);
  return position === "left"
    ? Math.min(plot.x, ...axes.map(a => a.bounds.left)) - Math.max(...legends.map(l => l.bounds.right))
    : Math.min(...legends.map(l => l.bounds.left)) - Math.max(plot.x + plot.width, ...axes.map(a => a.bounds.right));
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const axis = (p, position) => p.createYAxis({ position, line: {}, ticksAndLabels: {
  values: [1, 2], ticks: { length: 5 }, labels: { fontSize: 10, offset: 7 } },
  title: { text: "Y axis", fontSize: 11, offset: 35 } });

test("omitted side offsets clear actual axis paint in Full and Basic for categorical and continuous blocks", () => {
  for (const factory of [chart, basic]) for (const continuous of [false, true]) for (const position of ["left", "right"]) {
    const p = axis(source(factory, continuous), position).createLegend({ position, labels: { fontSize: 18 } });
    near(gap(p, position), continuous ? 30 : 8);
    assert.deepEqual(resolveGraphicBounds(p).width, 314);
    assert.deepEqual(resolveGraphicBounds(p).height, 314);
    const config = Object.values(p.guideConfigs.legend)[0];
    assert.equal(config.inferredOffset, true);
    assert.equal(config.offset, continuous ? 30 : 8);
  }
});

test("side legend placement converges across creation order, axis edits, replay and persistence", () => {
  for (const position of ["left", "right"]) {
    const p = axis(source(), position).createLegend({ position });
    const q = axis(source().createLegend({ position }), position);
    assert.deepEqual(q.graphicSpec, p.graphicSpec);
    const edited = p.editYAxisLabels({ fontSize: 24, offset: 25 }).editYAxisTitle({ fontSize: 22, offset: 80 });
    near(gap(edited, position), 8);
    near(gap(deserializeProgram(serializeProgram(edited)).editCanvas({ plot: { width: 360, height: 360 } }), position), 8);
    near(gap(edited.removeYAxis(), position), 8);
  }
});

test("explicit side offsets remain plot anchored and reject collisions atomically", () => {
  const p = axis(source(), "left"), before = serializeProgram(p);
  assert.throws(() => p.createLegend({ position: "left", offset: 0 }), /overlap/);
  assert.equal(serializeProgram(p), before);
  const fixed = p.createLegend({ position: "left", offset: 120 });
  assert.equal(Object.values(fixed.guideConfigs.legend)[0].inferredOffset, false);
  assert.ok(gap(fixed, "left") > 8);
});

test("grouped and combined side blocks clear axes and grow only opted-in outer margins", () => {
  for (const position of ["left", "right"]) {
    const p = axis(source().encodeSize({ field: "v", scale: { range: [10, 40] } }), position)
      .createLegend({ channels: ["color", "size"], position, blockLayout: "column", labels: { fontSize: 18 } });
    near(gap(p, position), 8);
    assert.equal(p.guideConfigs.legendGroups.points.inferredOffset, true);
    const edited = p.editYAxisTitle({ offset: 80 });
    near(gap(edited, position), 8);
    assert.equal(resolveGraphicBounds(edited).width, 314);
    assert.equal(resolveGraphicBounds(edited).height, 314);
    assert.ok(edited.materializationConfigs.canvas.margin[position] > 60);
  }
});
