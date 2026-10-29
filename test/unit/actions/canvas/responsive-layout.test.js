import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { inspectProgram } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";
import { resolveGraphicBounds } from "../../../../src/layout/canvas.js";
import { prepareProgramHitFrame } from "../../../../src/interaction/hitProgram.js";

const categories = ["A long alpha category", "A long beta category", "A long gamma category", "A long delta category"];
const rows = categories.map((x, index) => ({ x, y: index + 1 }));
const guides = { axes: { x: { ticksAndLabels: { labels: { responsive: { maxLines: 2 } } } }, y: {} }, legend: false };
const build = (width = 400, make = chart, source = make().createData({ values: rows })) =>
  source.createCanvas({ width, height: 320, margin: 20, responsive: {} })
    .createBarPlot({ x: "x", y: "y", guides });
const dense = width => chart().createCanvas({ width, height: 600, margin: 10,
  responsive: { minPlotSize: { width: 40, height: 40 } } })
  .createData({ values: Array.from({ length: 8 }, (_, index) => ({ x: `Long category ${index}`, y: index + 1 })) })
  .createBarPlot({ x: "x", y: "y", guides: { axes: {
    x: { title: false, ticksAndLabels: { labels: { responsive: { maxLines: 1 }, maxWidth: 300 } } },
    y: { title: false }
  }, legend: false } });

test("Full and Basic reserve bounded guide lanes without changing authored Canvas dimensions or margins", () => {
  for (const make of [chart, basicChart]) {
    const empty = make().createCanvas({ responsive: {} });
    assert.deepEqual(empty.materializationConfigs.canvas.responsive.minPlotSize, { width: 160, height: 120 });
    assert.equal(empty.materializationConfigs.canvas.responsiveResult.iterations, 2);
    assert.deepEqual(empty.context, {});
    const program = build(400, make), config = program.materializationConfigs.canvas;
    assert.deepEqual(program.graphicSpec.objects.canvas.properties, { width: 400, height: 320, background: "white" });
    assert.deepEqual(config.margin, { top: 20, right: 20, bottom: 20, left: 20 });
    assert.equal(config.responsiveResult.status, "satisfied");
    assert.ok(config.responsiveResult.iterations <= 4);
    const plot = resolveGraphicBounds(program);
    assert.ok(plot.x > 20 && plot.height < 280);
    assert.ok(plot.width >= 160 && plot.height >= 120);
    assert.equal(program.context.responsiveMeasuring, undefined);
    assert.equal(program.context.responsivePlot, undefined);
    assert.equal(program.context.deferGuideLayoutValidation, undefined);
  }
});

test("wrapping retains every source value and exposes the chosen width and reason", () => {
  const program = build(), labels = program.guideConfigs.axis.x.labels;
  assert.equal(labels.responsiveResult.stage, "wrap");
  assert.equal(labels.responsiveResult.reason, "label-overlap");
  assert.deepEqual(labels.responsiveResult.indices, [0, 1, 2, 3]);
  assert.equal(labels.maxWidth, undefined);
  assert.equal(labels.rotation, 0);
  assert.equal(program.graphicSpec.objects.xAxisLabels.items.length, 8);
  assert.equal(program.graphicSpec.objects.xAxisTicks.items.length, 4);
  assert.deepEqual(program.resolvedScales.x.domain, categories);
  const view = inspectProgram(program).layouts[0];
  assert.equal(view.labels.find(label => label.id === "x").result.stage, "wrap");
  assert.ok(Object.isFrozen(view.result.snapshot));
  assert.doesNotThrow(() => prepareProgramHitFrame(program));
});

test("skipping changes labels only and hit metadata retains exactly their rendered raw values", () => {
  const program = dense(400), labels = program.guideConfigs.axis.x.labels;
  assert.equal(labels.responsiveResult.stage, "skip");
  assert.deepEqual(labels.responsiveResult.indices, [0, 2, 4, 6]);
  assert.equal(labels.maxWidth, 300);
  assert.equal(program.graphicSpec.objects.xAxisTicks.items.length, 8);
  assert.equal(program.graphicSpec.objects.xAxisLabels.items.length, 4);
  const frame = prepareProgramHitFrame(program);
  const entries = frame.entries.filter(entry => entry.metadata.ownerId === "x" && entry.metadata.role === "axis-tick");
  assert.equal(entries.length, 12);
  assert.equal(new Set(entries.map(entry => entry.metadata.itemKey)).size, 8);
  assert.equal(program.semanticSpec.datasets[0].values.length, 8);
});

test("rotation is the last fallback and the stored concrete angle matches the declared candidate", () => {
  const program = dense(220), result = program.guideConfigs.axis.x.labels.responsiveResult;
  assert.equal(result.stage, "rotate");
  assert.equal(result.rotation, -Math.PI / 4);
  assert.deepEqual(result.indices, [0, 2, 4, 6]);
  assert.ok(program.graphicSpec.objects.xAxisLabels.items.every(item => item.properties.rotation === -Math.PI / 4));
  assert.doesNotThrow(() => prepareProgramHitFrame(program));
});

test("resize is deterministic from retained intent and preserves the original program and trace", () => {
  const source = chart().createData({ values: rows });
  const wide = build(800, chart, source), before = serializeProgram(wide);
  assert.equal(wide.guideConfigs.axis.x.labels.responsiveResult.stage, "native");
  const resized = wide.editCanvas({ width: 400 });
  assert.deepEqual(resized.graphicSpec, build(400, chart, source).graphicSpec);
  assert.deepEqual(resized.editCanvas({ width: 800 }).graphicSpec, wide.graphicSpec);
  assert.equal(serializeProgram(wide), before);
  const background = resized.editCanvas({ background: "#eee" });
  assert.deepEqual(resolveGraphicBounds(background), resolveGraphicBounds(resized));
  assert.deepEqual(background.materializationConfigs.canvas.responsiveResult, resized.materializationConfigs.canvas.responsiveResult);
});

test("insufficient space and iteration limits reject atomically with required bounds", () => {
  const source = build(), before = serializeProgram(source);
  assert.throws(() => source.editCanvas({ width: 100 }), error => {
    const details = getErrorDetails(error);
    assert.equal(details.reason, "layout-unsatisfied");
    assert.ok(details.layout.requiredBounds);
    return true;
  });
  assert.equal(serializeProgram(source), before);
  assert.throws(() => dense(260), error => {
    const layout = getErrorDetails(error).layout;
    assert.equal(layout.reason, "iteration-limit");
    assert.equal(layout.iterations, 4);
    return true;
  });
});

test("responsive policies reject incompatible modes, unknown options and accessors before execution", () => {
  let reads = 0;
  const hostile = Object.defineProperty({}, "minPlotSize", { enumerable: true, get() { reads++; return { width: 1, height: 1 }; } });
  for (const make of [chart, basicChart]) {
    for (const responsive of [null, undefined, true, { other: 1 }, { minPlotSize: {} }, { minPlotSize: { width: 0, height: 120 } }, hostile]) {
      assert.throws(() => make().createCanvas({ responsive }));
    }
    assert.throws(() => make().createCanvas({ plot: { width: 200, height: 200 }, responsive: {} }), /cannot be combined/);
  }
  assert.equal(reads, 0);
  const source = chart().createCanvas().createData({ values: rows }).createBarPlot({ x: "x", y: "y", guides: false });
  assert.throws(() => source.createXAxisLabels({ responsive: {} }), /require Canvas responsive/);
});

test("disabled Canvas and label policies return to native geometry", () => {
  const source = chart().createCanvas({ responsive: {} }).createData({ values: [{ x: "A", y: 1 }, { x: "B", y: 2 }] })
    .createBarPlot({ x: "x", y: "y", guides: { axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} } } });
  const labelsOff = source.editXAxisLabels({ responsive: false });
  assert.equal(labelsOff.guideConfigs.axis.x.labels.responsive, undefined);
  assert.equal(labelsOff.guideConfigs.axis.x.labels.responsiveResult, undefined);
  const off = labelsOff.editCanvas({ responsive: false });
  assert.equal(off.materializationConfigs.canvas.responsive, undefined);
  assert.equal(off.materializationConfigs.canvas.responsiveResult, undefined);
  assert.equal(inspectProgram(off).layouts, undefined);
});

test("restoration preserves concrete output and rejects malformed stored responsive decisions", () => {
  const source = build(), restored = deserializeProgram(serializeProgram(source));
  assert.deepEqual(restored.graphicSpec, source.graphicSpec);
  assert.deepEqual(inspectProgram(restored).layouts, inspectProgram(source).layouts);
  assert.deepEqual(restored.editCanvas({ width: 800 }).graphicSpec, source.editCanvas({ width: 800 }).graphicSpec);
  const config = source.materializationConfigs.canvas;
  for (const change of [{ status: "continue" }, { iterations: 5 }, { change: 1 }, { extra: true }]) {
    const corrupt = source._withCanvasConfig({ ...config, responsiveResult: { ...config.responsiveResult, ...change } });
    assert.throws(() => serializeProgram(corrupt));
  }
  const labels = source.guideConfigs.axis.x.labels;
  for (const change of [{ indices: [0, 0] }, { indices: [-1] }, { rotation: NaN }, { stage: "guess" }]) {
    const corrupt = source._withGuideConfig("x", "labels", { ...labels, responsiveResult: { ...labels.responsiveResult, ...change } });
    assert.throws(() => serializeProgram(corrupt));
  }
});
