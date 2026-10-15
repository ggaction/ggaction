import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const rows = Object.freeze([
  Object.freeze({ x: 0, y: 0, group: "A" }),
  Object.freeze({ x: 1, y: 2, group: "B" }),
  Object.freeze({ x: 2, y: 1, group: "A" })
]);
const layout = Object.freeze({ width: 420, height: 320, margin: 40 });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

// Independent stroke geometry: an inset rect centerline keeps all four painted
// outer edges on the declared plot rectangle, without changing its dimensions.
function assertBorder(program, { left = 40, top = 40, width = 340, height = 240,
  color = "#ddd", lineWidth = 1 } = {}) {
  const object = program.graphicSpec.objects.plotBorder;
  assert.equal(object?.type, "rect");
  const p = object.properties;
  near(p.x, left + lineWidth / 2);
  near(p.y, top + lineWidth / 2);
  near(p.width, width - lineWidth);
  near(p.height, height - lineWidth);
  assert.ok(p.fill === "none" || p.fill === "transparent");
  assert.equal(p.stroke, color);
  assert.equal(p.strokeWidth, lineWidth);
  near(p.x - p.strokeWidth / 2, left);
  near(p.y - p.strokeWidth / 2, top);
  near(p.x + p.width + p.strokeWidth / 2, left + width);
  near(p.y + p.height + p.strokeWidth / 2, top + height);
  const parent = program.graphicSpec.objects["plot-main"];
  assert.ok(parent.children.includes("plotBorder"));
  assert.equal(parent.children.filter(id => id === "plotBorder").length, 1);
  assert.deepEqual(program.actionStack, []);
}
function scaffold(program) {
  return program.createData({ id: "rows", values: rows })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
}
function axes(program) {
  return program.createGuides({
    axes: { x: { title: false }, y: { title: false } }, grid: false, legend: false
  });
}
function assertOrder(program, markIds = ["points"]) {
  const order = program.graphicSpec.objects["plot-main"].children;
  const border = order.indexOf("plotBorder");
  for (const id of markIds) assert.ok(order.indexOf(id) >= 0 && order.indexOf(id) < border, `${id} before border`);
  for (const id of ["xAxisLine", "xAxisTicks", "xAxisLabels", "yAxisLine", "yAxisTicks", "yAxisLabels"]) {
    if (order.includes(id)) assert.ok(order.indexOf(id) > border, `${id} after border`);
  }
}

test("Full and Basic Canvas omit borders by default and accept immutable explicit styles", () => {
  for (const create of [chart, basicChart]) {
    for (const args of [layout, { ...layout, plotBorder: false }]) {
      const program = create().createCanvas(args);
      assert.equal(program.graphicSpec.objects.plotBorder, undefined);
      assert.ok(!program.graphicSpec.objects["plot-main"].children?.includes("plotBorder"));
    }
    assertBorder(create().createCanvas({ ...layout, plotBorder: {} }));
    const style = Object.freeze({ color: "navy", lineWidth: 2 });
    const args = Object.freeze({ ...layout, plotBorder: style });
    const before = JSON.stringify(args);
    const program = create().createCanvas(args);
    assertBorder(program, { color: "navy", lineWidth: 2 });
    assert.equal(JSON.stringify(args), before);
    assert.equal(Object.isFrozen(style), true);
  }
});

test("Canvas border edits preserve omission, replace complete styles, and remove cleanly", () => {
  const initial = chart().createCanvas({ ...layout, plotBorder: { color: "navy", lineWidth: 4 } });
  const before = serializeProgram(initial);
  assertBorder(initial.editCanvas({ background: "ivory" }), { color: "navy", lineWidth: 4 });
  assertBorder(initial.editCanvas({ plotBorder: { color: "red" } }), { color: "red", lineWidth: 1 });
  assertBorder(initial.editCanvas({ plotBorder: { lineWidth: 2 } }), { color: "#ddd", lineWidth: 2 });
  assertBorder(initial.editCanvas({ plotBorder: {} }));
  const removed = initial.editCanvas({ plotBorder: false });
  assert.equal(removed.graphicSpec.objects.plotBorder, undefined);
  assert.ok(!removed.graphicSpec.objects["plot-main"].children.includes("plotBorder"));
  assertBorder(removed.editCanvas({ plotBorder: {} }));
  assert.equal(serializeProgram(initial), before);
});

test("fractional and nearly plot-sized strokes retain exact outer plot bounds", () => {
  const fractional = chart().createCanvas({ width: 100.5, height: 80.25,
    margin: { left: 10.25, right: 9.75, top: 5.125, bottom: 15.125 },
    plotBorder: { color: "#123456", lineWidth: 0.5 } });
  assertBorder(fractional, { left: 10.25, top: 5.125, width: 80.5, height: 60,
    color: "#123456", lineWidth: 0.5 });
  assertBorder(chart().createCanvas({ width: 100, height: 100, margin: 10,
    plotBorder: { lineWidth: 79.5 } }), { left: 10, top: 10, width: 80, height: 80, lineWidth: 79.5 });
});

test("initial and later border opt-in converge without changing chart or scale geometry", () => {
  const plain = axes(scaffold(chart().createCanvas(layout)));
  const initial = axes(scaffold(chart().createCanvas({ ...layout, plotBorder: {} })));
  const late = plain.editCanvas({ plotBorder: {} });
  assert.deepEqual(initial.graphicSpec, late.graphicSpec);
  assert.deepEqual(initial.semanticSpec, plain.semanticSpec);
  assert.deepEqual(initial.resolvedScales, plain.resolvedScales);
  for (const id of ["points", "xAxisLine", "xAxisTicks", "xAxisLabels", "yAxisLine", "yAxisTicks", "yAxisLabels"]) {
    assert.deepEqual(initial.graphicSpec.objects[id], plain.graphicSpec.objects[id]);
  }
  assertBorder(initial);
  assertOrder(initial);
});

test("new ordinary marks remain below the border and existing axes remain above it", () => {
  const before = axes(scaffold(chart().createCanvas({ ...layout, plotBorder: {} })));
  const stored = serializeProgram(before);
  const after = before.createScatterPlot({ id: "later", x: "x", y: "y", guides: false });
  assertBorder(after);
  assertOrder(after, ["points", "later"]);
  assert.equal(serializeProgram(before), stored);
  const axisLast = axes(scaffold(chart().createCanvas(layout)).editCanvas({ plotBorder: {} }));
  assertOrder(axisLast);
});

test("Canvas size and margin edits rematerialize the inset border while preserving prior state", () => {
  const before = scaffold(chart().createCanvas({ ...layout, plotBorder: { lineWidth: 2 } }));
  const stored = serializeProgram(before);
  const resized = before.editCanvas({ width: 500, height: 360, margin: { left: 55, top: 35 } });
  assertBorder(resized, { left: 55, top: 35, width: 405, height: 285, lineWidth: 2 });
  assertBorder(resized.editCanvas({ margin: 20 }), { left: 20, top: 20, width: 460, height: 320, lineWidth: 2 });
  assert.equal(serializeProgram(before), stored);
  assertBorder(before, { lineWidth: 2 });
});

test("explicit inner plots keep their border during automatic guide-margin expansion", () => {
  const labels = ["Long sample category alpha", "Long sample category beta"];
  const values = labels.flatMap((x, i) => labels.map((y, j) => ({ x, y, z: i + j })));
  for (const create of [chart, basicChart]) {
    const before = create().createCanvas({ plot: { width: 30, height: 30 }, margin: 0, plotBorder: {} });
    const after = before.createData({ values }).createHeatmap({ x: "x", y: "y", color: { field: "z", fieldType: "quantitative" },
      guides: { legend: false, axes: {
        x: { title: false, ticksAndLabels: { labels: { rotation: { value: -90, unit: "degrees" }, fontSize: 10 } } },
        y: { title: false, ticksAndLabels: { labels: { fontSize: 10 } } }
      } } });
    const margin = after.materializationConfigs.canvas.margin;
    const outer = after.graphicSpec.objects.canvas.properties;
    assert.ok(margin.left > 0 && margin.bottom > 0);
    near(outer.width - margin.left - margin.right, 30);
    near(outer.height - margin.top - margin.bottom, 30);
    assertBorder(after, { left: margin.left, top: margin.top, width: 30, height: 30 });
    assertBorder(before, { left: 0, top: 0, width: 30, height: 30 });
  }
});

test("scale edits, source revisions, and persistence retain the Canvas border", () => {
  const initial = scaffold(chart().createCanvas({ ...layout, plotBorder: { color: "teal", lineWidth: 2 } }));
  const reversed = initial.editScale({ id: "x", reverse: true });
  const revised = reversed.reviseData({ source: "rows", id: "updated", values: [...rows, { x: 5, y: 3, group: "B" }] });
  for (const program of [initial, reversed, revised]) assertBorder(program, { color: "teal", lineWidth: 2 });
  const restored = deserializeProgram(serializeProgram(revised));
  assert.deepEqual(restored.graphicSpec, revised.graphicSpec);
  assertBorder(restored.editCanvas({ width: 500 }), { width: 420, color: "teal", lineWidth: 2 });
  assert.deepEqual(restored.semanticSpec.datasets, revised.semanticSpec.datasets);
});

test("facet child replay preserves one correctly inset border per cell", () => {
  const initial = scaffold(chart().createCanvas({ ...layout, plotBorder: {} }));
  const stored = serializeProgram(initial);
  const faceted = initial.facet({ field: "group", guides: { axes: "each", legend: false } });
  assert.equal(Object.keys(faceted.children).length, 2);
  for (const child of Object.values(faceted.children)) {
    assertBorder(child);
    assertOrder(child);
  }
  const restored = deserializeProgram(serializeProgram(faceted));
  assert.deepEqual(restored.graphicSpec, faceted.graphicSpec);
  for (const child of Object.values(restored.children)) assertBorder(child);
  assert.equal(serializeProgram(initial), stored);
});

test("invalid border declarations fail atomically without mutating caller input", () => {
  const invalid = [true, null, [], "red", { extra: true }, { color: "" }, { color: 1 },
    ...[0, -1, NaN, Infinity, "1", 240, 241].map(lineWidth => ({ lineWidth }))];
  for (const create of [chart, basicChart]) {
    for (const value of invalid) assert.throws(() => create().createCanvas({ ...layout, plotBorder: value }));
  }
  const initial = scaffold(chart().createCanvas({ ...layout, plotBorder: { color: "blue", lineWidth: 2 } }));
  const stored = serializeProgram(initial);
  for (const value of invalid) {
    const args = Object.freeze({ plotBorder: value });
    const input = JSON.stringify(args);
    assert.throws(() => initial.editCanvas(args));
    assert.equal(JSON.stringify(args), input);
    assert.equal(serializeProgram(initial), stored);
  }
  // The previous 2px stroke cannot fit a newly declared 2px inner height.
  assert.throws(() => initial.editCanvas({ height: 82 }));
  assert.equal(serializeProgram(initial), stored);
});

for (const [name, draw] of [
  ["box plots", p => p.createBoxPlot({ id: "distribution", x: { field: "group", fieldType: "nominal" }, y: { field: "y" },
    guides: { legend: false, axes: { x: { title: false }, y: { title: false } } } })],
  ["Polar scatter plots", p => p.createPolarScatterPlot({ id: "points",
    theta: { field: "x", scale: { domain: [0, 2] } }, radius: { field: "y", scale: { domain: [0, 2] } },
    guides: { legend: false } })],
  ["parallel coordinates", p => p.createParallelCoordinates({ id: "lines", dimensions: ["x", "y"], guides: { legend: false } })]
]) {
  test(`${name} preserve mark geometry and converge on border-before-axes drawing order`, () => {
    const create = plotBorder => draw(chart().createCanvas({ width: 600, height: 400, margin: 80,
      ...(plotBorder === undefined ? {} : { plotBorder }) }).createData({ id: "rows", values: rows }));
    const plain = create(undefined), off = create(false), initial = create({}), late = plain.editCanvas({ plotBorder: {} });
    assert.deepEqual(off.graphicSpec, plain.graphicSpec);
    assert.deepEqual(initial.graphicSpec, late.graphicSpec);
    assert.deepEqual(initial.semanticSpec, plain.semanticSpec);
    assert.deepEqual(initial.resolvedScales, plain.resolvedScales);
    assertBorder(initial, { left: 80, top: 80, width: 440, height: 240 });
    const order = initial.graphicSpec.objects["plot-main"].children;
    const frameIndex = order.indexOf("plotBorder");
    const markIds = plain.semanticSpec.layers.map(layer => layer.id).filter(id => order.includes(id));
    assert.ok(markIds.length > 0);
    for (const id of markIds) {
      assert.ok(order.indexOf(id) < frameIndex, `${id} below border`);
      assert.deepEqual(initial.graphicSpec.objects[id], plain.graphicSpec.objects[id], `${id} unchanged`);
    }
    const axisIds = order.filter(id => /^(x|y|theta|radial|parallel)Axis/.test(id));
    assert.ok(axisIds.length > 0);
    for (const id of axisIds) {
      assert.ok(order.indexOf(id) > frameIndex, `${id} above border`);
      assert.deepEqual(initial.graphicSpec.objects[id], plain.graphicSpec.objects[id], `${id} unchanged`);
    }
    const replay = initial.editCanvas({ width: 620 });
    assertBorder(replay, { left: 80, top: 80, width: 460, height: 240 });
    const replayOrder = replay.graphicSpec.objects["plot-main"].children;
    for (const id of markIds) assert.ok(replayOrder.indexOf(id) < replayOrder.indexOf("plotBorder"));
    for (const id of axisIds) assert.ok(replayOrder.indexOf(id) > replayOrder.indexOf("plotBorder"));
  });
}
