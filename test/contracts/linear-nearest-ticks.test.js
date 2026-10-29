import { assertEquivalentMeaning } from "../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { encodeValue, decodeValue } from "../../src/persistence/codec.js";
import { createLinearNearestTicksPrimitives } from "../charts/linear-nearest-ticks/primitive.program.js";

function base(factory = chart, values = [{ x: 0, y: 0 }, { x: 1, y: 133 }]) {
  return factory().createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createData({ values }).createLinePlot({ x: { field: "x", scale: { domain: [0, 1] } },
      y: { field: "y", scale: { domain: [0, 140] } }, guides: false });
}
function axis(factory = chart) {
  return base(factory).createYAxis({ title: false, ticksAndLabels: { count: 5, rounding: "nearest" } });
}
const labels = p => p.graphicSpec.objects.yAxisLabels.items.map(item => item.properties.text);
const nearest = ["0", "20", "40", "60", "80", "100", "120", "140"];

test("complete nearest axis matches literal primitives and Basic graphics", () => {
  assertEquivalentMeaning(axis().graphicSpec, createLinearNearestTicksPrimitives().graphicSpec);
  assertEquivalentMeaning(axis().graphicSpec, axis(basic).graphicSpec);
  assert.deepEqual(labels(axis()), nearest);
  const options = { rounding: "nearest" };
  const owned = base().createYAxis({ title: false, ticksAndLabels: options });
  options.rounding = "ceiling";
  assert.equal(owned.guideConfigs.axis.y.ticks.rounding, "nearest");
});

test("focused tick edits update the opted-in labels and inferred grid together", () => {
  const before = axis().createHorizontalGrid(), saved = serializeProgram(before);
  const after = before.editYAxisTicks({ rounding: "ceiling" });
  assert.deepEqual(labels(after), ["0", "30", "60", "90", "120"]);
  assert.equal(after.graphicSpec.objects.horizontalGridLines.items.length, 5);
  assert.equal(after.guideConfigs.grid.horizontal.rounding, undefined);
  assert.equal(serializeProgram(before), saved);
  assert.deepEqual(labels(after.editYAxisTicks({ rounding: "nearest" })), nearest);
  const explicit = before.editYAxisTicks({ values: [0, 140] });
  assert.deepEqual(labels(explicit), ["0", "140"]);
  assert.equal(explicit.guideConfigs.axis.y.ticks.rounding, undefined);
  assert.equal(explicit.guideConfigs.axis.y.labels.rounding, undefined);
  assert.equal(explicit.guideConfigs.grid.horizontal.rounding, undefined);
  assert.equal(explicit.graphicSpec.objects.horizontalGridLines.items.length, 2);
});

test("grouped and complete editors retain a shared tick-label selection policy", () => {
  const before = axis();
  const grouped = before.editYAxisTicksAndLabels({ count: 3, rounding: "nearest" });
  const complete = before.editYAxis({ ticksAndLabels: { count: 3, rounding: "nearest" } });
  assert.deepEqual(grouped.graphicSpec, complete.graphicSpec);
  assert.deepEqual(labels(grouped), ["0", "50", "100"]);
  assert.deepEqual(grouped.editYAxisTicksAndLabels({ count: 5 }).graphicSpec, before.graphicSpec);
});

test("label-only axes support nearest selection and supply it to later ticks", () => {
  const only = base().createYAxisLabels({ rounding: "nearest" });
  assert.deepEqual(labels(only), nearest);
  const withTicks = only.createYAxisTicks();
  assert.deepEqual(deserializeProgram(serializeProgram(only)).graphicSpec, only.graphicSpec);
  assert.equal(withTicks.guideConfigs.axis.y.ticks.rounding, "nearest");
  assert.deepEqual(labels(withTicks), nearest);
  assert.throws(() => axis().editYAxisLabels({ rounding: "ceiling" }), /conflicts/);
});

test("explicit grid policies remove inherited rounding and auto restores it", () => {
  const inferred = axis().createHorizontalGrid();
  assert.equal(inferred.guideConfigs.grid.horizontal.rounding, "nearest");
  const explicit = inferred.editHorizontalGrid({ count: 5 });
  assert.equal(explicit.guideConfigs.grid.horizontal.rounding, undefined);
  assert.equal(explicit.graphicSpec.objects.horizontalGridLines.items.length, 5);
  const restored = explicit.editHorizontalGrid({ values: "auto" });
  assert.deepEqual(restored.graphicSpec, inferred.graphicSpec);
});

test("Canvas, scale and saved-program replay preserve the chosen policy", () => {
  const before = axis().createHorizontalGrid();
  const restored = deserializeProgram(serializeProgram(before));
  assert.deepEqual(restored.graphicSpec, before.graphicSpec);
  assert.deepEqual(labels(before.editCanvas({ plot: { width: 200, height: 200 } })), nearest);
  const changed = before.editYScale({ domain: [0, 180] });
  assert.deepEqual(labels(changed), ["0", "50", "100", "150"]);
  assert.equal(changed.graphicSpec.objects.horizontalGridLines.items.length, 4);
  assert.throws(() => before.editYScale({ type: "sqrt" }), /rounding/);
  assert.deepEqual(labels(before), nearest);
});

test("independent facets choose ticks from every actual child domain", () => {
  const maxima = [133, 108, 171, 107, 139, 116];
  const rows = maxima.flatMap((y, index) => [{ group: String(index), x: 0, y: 0 }, { group: String(index), x: 1, y }]);
  const unit = base(chart, rows).editYScale({ domain: "auto", zero: true, nice: { count: 10 } })
    .createYAxis({ title: false, ticksAndLabels: { count: 5, rounding: "nearest" } }).createHorizontalGrid();
  const facets = unit.facet({ field: "group", scales: { y: "independent" } });
  const expected = [nearest, ["0", "20", "40", "60", "80", "100"], ["0", "50", "100", "150"],
    ["0", "20", "40", "60", "80", "100"], nearest, ["0", "20", "40", "60", "80", "100", "120"]];
  for (const [index, id] of facets.compositionSpec.children.entries()) {
    assert.deepEqual(labels(facets.children[id]), expected[index]);
    assert.equal(facets.children[id].graphicSpec.objects.horizontalGridLines.items.length, expected[index].length);
  }
  assert.deepEqual(facets.semanticSpec.datasets[0].values, rows);
});

test("malformed rounding, explicit values and unsupported axis families reject atomically", () => {
  const p = base(), saved = serializeProgram(p);
  for (const rounding of [undefined, null, false, "auto", 1, {}]) {
    assert.throws(() => p.createYAxis({ ticksAndLabels: { rounding } }));
    assert.equal(serializeProgram(p), saved);
  }
  assert.throws(() => p.createYAxis({ ticksAndLabels: { values: [0, 140], rounding: "nearest" } }), /rounding/);
  assert.throws(() => p.editYScale({ type: "sqrt" }).createYAxis({ ticksAndLabels: { rounding: "nearest" } }), /rounding/);
  assert.throws(() => p.createThetaAxisTicks({ rounding: "nearest" }));
  assert.throws(() => p.createParallelAxes({ rounding: "nearest" }));
  const temporal = chart().createCanvas().createData({ values: [
    { x: 0, date: "2020-01-01" }, { x: 1, date: "2021-01-01" }
  ] }).createScatterPlot({ x: "x", y: { field: "date", fieldType: "temporal" }, guides: false });
  assert.throws(() => temporal.createYAxisTicks({ rounding: "nearest" }), /rounding/);
  const discrete = chart().createCanvas().createData({ values: [
    { category: "A", value: 1 }, { category: "B", value: 2 }
  ] }).createBarPlot({ x: "category", y: "value", guides: false });
  assert.throws(() => discrete.createXAxisTicks({ rounding: "nearest" }), /rounding/);
  for (const count of [0, 1.5, 10001]) assert.throws(() => p.createYAxisTicks({ count, rounding: "nearest" }));
});

test("named axes keep separate policies and inferred grids reject conflicting owners", () => {
  const program = base().editCanvas({ margin: { left: 40, top: 20, right: 50, bottom: 30 } })
    .editXScale({ domain: [0, 140] }).createAxes({ y: false, x: [
      { id: "near", title: false, ticksAndLabels: { rounding: "nearest" } },
      { id: "ceil", position: "top", title: false }
    ] });
  assert.throws(() => program.createVerticalGrid(), /polic/);
  const explicit = program.createVerticalGrid({ count: 5 });
  assert.equal(explicit.graphicSpec.objects.verticalGridLines.items.length, 5);
  const same = program.editXAxisTicks({ target: "near", rounding: "ceiling" });
  assert.equal(same.createVerticalGrid().graphicSpec.objects.verticalGridLines.items.length, 5);
  assert.equal(program.guideConfigs.axis.near.ticks.rounding, "nearest");
  assert.equal(program.guideConfigs.axis.ceil.ticks.rounding, undefined);
});

test("source revisions refresh automatic domains, ticks, labels and grid without changing old rows", () => {
  const original = axis().editYScale({ domain: "auto", zero: true, nice: { count: 10 } }).createHorizontalGrid();
  const snapshot = serializeProgram(original);
  const revised = original.reviseData({ source: "data", id: "revised", values: [{ x: 0, y: 0 }, { x: 1, y: 171 }] });
  assert.deepEqual(revised.resolvedScales.y.domain, [0, 180]);
  assert.deepEqual(labels(revised), ["0", "50", "100", "150"]);
  assert.equal(revised.graphicSpec.objects.horizontalGridLines.items.length, 4);
  assert.equal(serializeProgram(original), snapshot);
});

test("X-axis policies use the same selection and honor reversed domains", () => {
  const program = base().editXScale({ domain: [0, 140] })
    .createXAxis({ title: false, ticksAndLabels: { rounding: "nearest" } });
  assert.deepEqual(program.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text), nearest);
  const reverse = program.editXScale({ domain: [140, 0] });
  assert.equal(reverse.graphicSpec.objects.xAxisTicks.items[0].properties.x1, 240);
  assert.equal(reverse.graphicSpec.objects.xAxisTicks.items.at(-1).properties.x1, 40);
  assert.throws(() => program.editXAxisTicks({ count: 10001 }), /10000/);
  assert.deepEqual(program.editXAxisTicks({ rounding: "ceiling" }).graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    ["0", "30", "60", "90", "120"]);
});

test("saved programs reject corrupt or stale rounding instead of retaining inconsistent guides", () => {
  const stored = serializeProgram(axis().createHorizontalGrid());
  const corruptions = [
    s => { s.materializationConfigs.guides.axis.y.ticks.rounding = "bad"; },
    s => { s.materializationConfigs.guides.axis.y.ticks.rounding = undefined; },
    s => { s.materializationConfigs.guides.axis.y.ticks.mode = "values"; },
    s => { s.materializationConfigs.guides.axis.y.labels.rounding = "ceiling"; },
    s => { s.materializationConfigs.guides.axis.y.ticks.count = 3; },
    s => { s.materializationConfigs.guides.axis.y.ticks.count = 0; s.materializationConfigs.guides.axis.y.labels.count = 0; },
    s => { s.materializationConfigs.guides.axis.y.ticks.count = 10001; s.materializationConfigs.guides.axis.y.labels.count = 10001; },
    s => { s.materializationConfigs.guides.grid.horizontal.rounding = "ceiling"; },
    s => { s.materializationConfigs.guides.grid.horizontal.inferredValues = false; },
    s => { s.materializationConfigs.guides.grid.horizontal.count = 3; },
    s => { s.materializationConfigs.guides.axis.theta = { ticks: { ...s.materializationConfigs.guides.axis.y.ticks } }; },
    s => { delete s.materializationConfigs.guides.axis.y.ticks; },
    s => { s.semanticSpec.scales.find(scale => scale.id === "y").type = "sqrt"; s.resolvedScales.y.type = "sqrt"; }
  ];
  for (const change of corruptions) {
    const envelope = JSON.parse(stored), state = decodeValue(envelope.payload);
    assert.equal(state.materializationConfigs.guides.axis.y.ticks.rounding, "nearest");
    change(state); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /rounding/);
  }
  const facets = base(chart, [{ group: "A", x: 0, y: 0 }, { group: "A", x: 1, y: 133 }])
    .createYAxis({ title: false, ticksAndLabels: { rounding: "nearest" } }).createHorizontalGrid().facet({ field: "group" });
  assert.deepEqual(deserializeProgram(serializeProgram(facets)).graphicSpec, facets.graphicSpec);
});
