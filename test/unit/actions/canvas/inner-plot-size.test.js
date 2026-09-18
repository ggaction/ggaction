import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { resolveConcreteGraphicBounds } from "../../../../src/grammar/schemas/graphicBounds.js";

const labels = ["Long sample category alpha", "Long sample category beta"];
const values = labels.flatMap((x, i) => labels.map((y, j) => ({ x, y, z: i + j })));
const heatmap = {
  x: "x", y: "y", color: { field: "z", fieldType: "quantitative" },
  guides: { legend: false, axes: {
    x: { title: false, ticksAndLabels: { labels: { rotation: { value: -90, unit: "degrees" }, fontSize: 10 } } },
    y: { title: false, ticksAndLabels: { labels: { fontSize: 10 } } }
  } }
};
function assertSize(program, width = 30, height = 30) {
  const plot = resolveGraphicBounds(program);
  assert.ok(Math.abs(plot.width - width) < 1e-9);
  assert.ok(Math.abs(plot.height - height) < 1e-9);
  return plot;
}

test("Full and Basic preserve explicit small plots while allocating guide margins", () => {
  for (const create of [chart, basicChart]) {
    const source = create().createCanvas({ plot: { width: 30, height: 30 } }).createData({ values });
    const before = serializeProgram(source);
    const result = source.createHeatmap(heatmap);
    const plot = assertSize(result);
    const x = resolveConcreteGraphicBounds(result.graphicSpec, "xAxisLabels");
    const y = resolveConcreteGraphicBounds(result.graphicSpec, "yAxisLabels");
    assert.ok(x.top >= plot.y + plot.height);
    assert.ok(y.right <= plot.x);
    assert.ok(x.bottom <= result.graphicSpec.objects.canvas.properties.height + 1e-9);
    assert.ok(y.left >= -1e-9);
    assert.equal(serializeProgram(source), before);
    assert.deepEqual(result.actionStack, []);
    assert.equal(result.context.deferGuideLayoutValidation, undefined);
    assert.deepEqual(source.createHeatmap(heatmap).graphicSpec, result.graphicSpec);
  }
});

test("Inner dimensions remain editable and survive persistence and margin edits", () => {
  const source = chart().createCanvas({ plot: { width: 30, height: 30 } })
    .createData({ values }).createHeatmap(heatmap);
  const restored = deserializeProgram(serializeProgram(source));
  assertSize(restored);
  assert.deepEqual(restored.editCanvas({ background: "white" }).graphicSpec, source.graphicSpec);
  const resized = restored.editCanvas({ plot: { width: 60, height: 45 } });
  assertSize(resized, 60, 45);
  const reset = resized.editCanvas({ margin: 0 });
  assertSize(reset, 60, 45);
  assert.ok(reset.materializationConfigs.canvas.margin.left > 0);
  assert.deepEqual(reset.editCanvas({ margin: 0 }).graphicSpec, reset.graphicSpec);
  const outer = resized.graphicSpec.objects.canvas.properties;
  const fixed = resized.editCanvas({ plot: false, width: outer.width + 30 });
  assert.equal(fixed.materializationConfigs.canvas.plot, undefined);
  assertSize(fixed, 90, 45);
});

test("Explicit inner constraints reject conflicting outer sizes and invalid policies atomically", () => {
  for (const create of [chart, basicChart]) {
    for (const plot of [null, {}, { width: 0, height: 30 }, { width: 30, height: Infinity }, { width: 30, height: 30, extra: 1 }]) {
      assert.throws(() => create().createCanvas({ plot }));
    }
    for (const outer of [{ width: 100 }, { height: 100 }]) {
      assert.throws(() => create().createCanvas({ ...outer, plot: { width: 30, height: 30 } }), /cannot be combined/);
    }
  }
  const source = chart().createCanvas({ plot: { width: 30, height: 30 } });
  const before = serializeProgram(source);
  assert.throws(() => source.editCanvas({ width: 100 }), /cannot be combined/);
  assert.equal(serializeProgram(source), before);
});

test("Fixed outer Canvas behavior retains its overflow error", () => {
  const source = chart().createCanvas({ width: 130, height: 130, margin: 50 }).createData({ values });
  assert.throws(() => source.createHeatmap(heatmap), /do not fit/);
});

test("Automatic title margins support all edges and subsequent guide authoring", () => {
  for (const position of ["top", "right", "bottom", "left"]) {
    const base = chart().createCanvas({ plot: { width: 30, height: 30 } }).createData({ values });
    const first = base.createTitle({ text: "Title", position }).createHeatmap(heatmap);
    const last = base.createHeatmap(heatmap).createTitle({ text: "Title", position });
    for (const result of [first, last]) {
      assertSize(result);
      const title = resolveConcreteGraphicBounds(result.graphicSpec, "chartTitle");
      const canvas = result.graphicSpec.objects.canvas.properties;
      assert.ok(title.left >= -1e-9 && title.top >= -1e-9);
      assert.ok(title.right <= canvas.width + 1e-9 && title.bottom <= canvas.height + 1e-9);
      assert.deepEqual(result.editCanvas({ plot: { width: 30, height: 30 } }).graphicSpec, result.graphicSpec);
    }
  }
});

test("Measured text expands outer dimensions and rematerializes existing geometry", () => {
  const source = chart().createCanvas({ plot: { width: 30, height: 30 } })
    .createData({ values }).createHeatmap(heatmap);
  const measured = source.applyTextMetrics({ profile: {
    schemaVersion: 1, id: "wide-labels", measurements: labels.map(text => ({
      text, width: 500, fontFamily: "sans-serif", fontSize: 10, fontWeight: 400
    }))
  } });
  assertSize(measured);
  assert.ok(measured.graphicSpec.objects.canvas.properties.width > source.graphicSpec.objects.canvas.properties.width);
  assert.ok(measured.graphicSpec.objects.canvas.properties.height > source.graphicSpec.objects.canvas.properties.height);
  assert.deepEqual(measured.editCanvas({ plot: { width: 30, height: 30 } }).graphicSpec, measured.graphicSpec);
  assert.throws(() => measured.fitCanvas(), /requires fixed outer dimensions/);
});

test("Diagonal label rectangles use their shared rotated frame for overlap checks", () => {
  const values = ["A long category alpha", "A long category beta"].map(x => ({ x, y: "A", z: 1 }));
  const options = { x: "x", y: "y", color: { field: "z", fieldType: "quantitative" },
    guides: { legend: false, axes: { x: { ticksAndLabels: { labels: {
      rotation: { value: -45, unit: "degrees" }, fontSize: 10
    } } }, y: {} } }
  };
  const build = width => chart().createCanvas({ plot: { width, height: 30 } })
    .createData({ values }).createHeatmap(options);
  const result = build(30);
  assertSize(result);
  assert.deepEqual(result.editCanvas({ plot: { width: 30, height: 30 } }).graphicSpec, result.graphicSpec);
  assert.throws(() => build(10), /labels overlap each other/);
});

test("Combined horizontal legends can exceed a small plot without changing its dimensions", () => {
  for (const position of ["top", "bottom"]) {
    const base = chart().createCanvas({ plot: { width: 30, height: 30 } })
      .createData({ values: [{ x: 1, y: 1, c: "Category A", n: 4 }, { x: 2, y: 2, c: "Category B", n: 16 }] })
      .createScatterPlot({ x: "x", y: "y", color: "c", size: "n", guides: false });
    const result = base.createLegend({ channels: ["color", "size"], position });
    assertSize(result);
    assert.ok(result.graphicSpec.objects.canvas.properties.width > 130);
    assert.deepEqual(result.editCanvas({ plot: { width: 30, height: 30 } }).graphicSpec, result.graphicSpec);
  }
});


test("Enabling an inner size on an automatic Canvas retains explicit composition dimensions", () => {
  const base = chart().createCanvas();
  assert.deepEqual(base.materializationConfigs.canvas.size, { width: "auto", height: "auto" });
  const sized = base.editCanvas({ plot: { width: 30, height: 45 } });
  assertSize(sized, 30, 45);
  assert.deepEqual(sized.materializationConfigs.canvas.size, { width: "explicit", height: "explicit" });
  assert.deepEqual(base.materializationConfigs.canvas.size, { width: "auto", height: "auto" });
  const reset = sized.editCanvas({ plot: false });
  assert.deepEqual(reset.materializationConfigs.canvas.size, { width: "explicit", height: "explicit" });
  assert.deepEqual(reset.graphicSpec, sized.graphicSpec);
});
