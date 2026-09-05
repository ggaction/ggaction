import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { normalizeTemporalValue, readTemporalField } from "../../../../src/grammar/scales/fields.js";
import { deriveLineSeries, derivePolarLineSeries } from "../../../../src/grammar/lineSeries.js";
import { deriveBarAggregates } from "../../../../src/grammar/bars/aggregate.js";
import { deriveRuleValues } from "../../../../src/grammar/rules.js";
import { resolvePointItems } from "../../../../src/materialization/selection/items/point.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";
import { assertChartProgramsEquivalent } from "../../../support/chart-equivalence.js";

const rows = [{ time: 1000, other: 2000, y: 1 }, { time: 2000, other: 3000, y: 2 }];
const yearDomain = [-30610224000000, 946684800000];
const temporal = (field = "time", unit = "timestamp") => ({
  field, fieldType: "temporal", temporalUnit: unit, scale: { nice: false }
});
function source(values = rows, factory = chart) {
  return factory().createCanvas({ width: 700, height: 420, margin: 80 })
    .createData({ id: "rows", values });
}
function scatter(unit = "timestamp", factory = chart) {
  return source(rows, factory).createScatterPlot({ x: temporal("time", unit), y: "y", guides: false });
}

test("temporal parser distinguishes UTC years and milliseconds without guessing explicit inputs", () => {
  assert.deepEqual(readTemporalField(rows, "time", "timestamp"), [1000, 2000]);
  for (const unit of [undefined, "auto", "year"]) {
    assert.deepEqual(readTemporalField(rows, "time", unit), yearDomain);
  }
  for (const value of [0, 99, 1000, 9999, "0000", "0099", "1000", "9999"]) {
    const parsed = normalizeTemporalValue(value, "time", 0, "year");
    assert.equal(new Date(parsed).getUTCFullYear(), Number(value));
    assert.equal(new Date(parsed).getUTCMonth(), 0);
    assert.equal(new Date(parsed).getUTCDate(), 1);
  }
  for (const value of [-8640000000000000, -1, 0, 1000, 8640000000000000]) {
    assert.equal(normalizeTemporalValue(value, "time", 0, "timestamp"), value);
  }
  for (const [unit, invalid] of [
    ["timestamp", ["1000", "1970-01-01", new Date(0), Infinity, NaN, 8640000000000001, null, true]],
    ["year", [-1, 1.5, 10000, "99", "00000", "1000.0", "2000-01-01", null, false]]
  ]) for (const value of invalid) assert.throws(() => normalizeTemporalValue(value, "time", 0, unit), /temporalUnit/);
  for (const unit of [false, null, "seconds", 0]) {
    assert.throws(() => readTemporalField([], "time", unit), /temporalUnit/);
  }
  assert.equal(normalizeTemporalValue("2000-01-01T09:00:00+09:00"), Date.UTC(2000, 0, 1));
});

test("root and Basic facade forward explicit units and retain unmodified source rows", () => {
  for (const factory of [chart, basicChart]) for (const unit of ["timestamp", "year", "auto"]) {
    const program = scatter(unit, factory);
    const lower = source(rows, factory).createPointMark({ id: "scatterPlot" })
      .encodeX(temporal("time", unit)).encodeY({ field: "y" });
    assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: lower });
    assert.deepEqual(program.resolvedScales.x.domain, unit === "timestamp" ? [1000, 2000] : yearDomain);
    assert.equal(program.semanticSpec.layers[0].encoding.x.temporalUnit, unit);
    assert.deepEqual(program.semanticSpec.datasets[0].values, rows);
  }
  const omitted = source().createPointMark().encodeX({ field: "time", fieldType: "temporal" });
  assert.equal(Object.hasOwn(omitted.semanticSpec.layers[0].encoding.x, "temporalUnit"), false);
});

test("position reassignment preserves a same-field unit and clears stale units on new bindings", () => {
  const initial = scatter();
  assert.equal(initial.encodeX({ field: "time" }).semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
  const other = initial.encodeX({ field: "other" });
  assert.equal(Object.hasOwn(other.semanticSpec.layers[0].encoding.x, "temporalUnit"), false);
  assert.deepEqual(other.resolvedScales.x.domain, [Date.UTC(2000, 0, 1), Date.UTC(3000, 0, 1)]);
  const quantitative = initial.encodeX({ field: "time", fieldType: "quantitative", scale: { id: "numericX", type: "linear" } });
  assert.equal(quantitative.semanticSpec.layers[0].encoding.x.temporalUnit, undefined);
  assert.throws(() => initial.encodeX({ field: "time", fieldType: "quantitative", temporalUnit: "timestamp" }), /temporal fieldType/);
  assert.deepEqual(initial.resolvedScales.x.domain, [1000, 2000]);
  const resized = initial.editCanvas({ width: 800 }).editScale({ id: "x", domain: [0, 3000] });
  assert.deepEqual(resized.resolvedScales.x.domain, [0, 3000]);
  assert.equal(resized.semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
});

test("temporal color reassigns independently and shares normalized scale values", () => {
  const base = source().createPointMark().encodeX({ field: "y" }).encodeY({ field: "other" });
  const colored = base.encodeColor({ field: "time", fieldType: "temporal", temporalUnit: "timestamp" });
  assert.deepEqual(colored.resolvedScales.color.domain, [1000, 2000]);
  assert.equal(colored.encodeColor({ field: "time", fieldType: "temporal" })
    .semanticSpec.layers[0].encoding.color.temporalUnit, "timestamp");
  const other = colored.encodeColor({ field: "other", fieldType: "temporal" });
  assert.equal(other.semanticSpec.layers[0].encoding.color.temporalUnit, undefined);
  const nominal = colored.encodeColor({ field: "time", scale: { id: "categories", type: "ordinal" } });
  assert.equal(nominal.semanticSpec.layers[0].encoding.color.temporalUnit, undefined);
  assert.throws(() => base.encodeColor({ field: "time", temporalUnit: "timestamp" }), /temporal fieldType/);
  const shared = source([{ time: 2000, y: 1 }]).createPointMark({ id: "years" })
    .encodeX(temporal("time", "year")).encodeY({ field: "y" })
    .createData({ id: "milliseconds", values: [{ time: Date.UTC(2000, 0, 1), y: 2 }] })
    .createPointMark({ id: "timestamps", data: "milliseconds" })
    .encodeX(temporal()).encodeY({ field: "y" });
  assert.equal(shared.graphicSpec.objects.years.items[0].properties.x,
    shared.graphicSpec.objects.timestamps.items[0].properties.x);
});

test("temporal Rule field/datum and independent secondary units survive editing", () => {
  const rule = source().createRuleMark().encodeX(temporal())
    .encodeX2({ field: "other", fieldType: "temporal", temporalUnit: "year" })
    .encodeY({ datum: 1, fieldType: "quantitative" });
  const values = deriveRuleValues(rows, rule.semanticSpec.layers[0]).values;
  assert.deepEqual(values.x, [1000, 2000]);
  assert.deepEqual(values.x2, [Date.UTC(2000, 0, 1), Date.UTC(3000, 0, 1)]);
  const datum = source().createRuleMark().encodeX({ datum: 1000, fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } });
  assert.equal(datum.encodeX({ datum: 1000, fieldType: "temporal" })
    .semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
  assert.equal(datum.encodeX({ datum: 2000, fieldType: "temporal" })
    .semanticSpec.layers[0].encoding.x.temporalUnit, undefined);
  assert.equal(rule.encodeX({ datum: 1000, fieldType: "temporal" })
    .semanticSpec.layers[0].encoding.x.temporalUnit, undefined);
});

test("temporal ranges forward units to both Rect endpoints without opening Area temporal bounds", () => {
  const rect = source().createRectMark().encodeXRange({ lower: "time", upper: "other", fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } })
    .encodeYRange({ lower: "y", upper: "other" });
  assert.deepEqual(rect.resolvedScales.x.domain, [1000, 3000]);
  assert.equal(rect.semanticSpec.layers[0].encoding.x2.temporalUnit, "timestamp");
  assert.equal(rect.graphicSpec.objects.rect.items.length, 2);
  const swapped = source().createRectMark().encodeYRange({ lower: "time", upper: "other", fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } })
    .encodeXRange({ lower: "y", upper: "other" });
  assert.deepEqual(swapped.resolvedScales.y.domain, [1000, 3000]);
  assert.throws(() => source().createAreaMark().encodeYRange({ lower: "time", upper: "other", fieldType: "temporal", temporalUnit: "timestamp" }), /quantitative/);
});

test("Line and Bar temporal grouping uses normalized values while analytical defaults stay explicit", () => {
  const duplicateRows = [{ time: 1000, y: 1 }, { time: 1000, y: 3 }, { time: 2000, y: 2 }];
  const line = source(duplicateRows).createLineMark().encodeX(temporal()).encodeY({ field: "y", aggregate: "mean" });
  const series = deriveLineSeries(duplicateRows, line.semanticSpec.layers[0]);
  assert.deepEqual(series.xValues, [1000, 2000]);
  assert.deepEqual(series.yValues, [2, 2]);
  const bars = source(duplicateRows).createBarPlot({ x: temporal(), y: "y", guides: false });
  assert.equal(bars.semanticSpec.layers[0].encoding.y.aggregate, "mean");
  assert.deepEqual(deriveBarAggregates(duplicateRows, bars.semanticSpec.layers[0]).values.map(({ x, y }) => [x, y]), [[1000, 2], [2000, 2]]);
  assert.deepEqual(source(duplicateRows).createBarPlot({ x: temporal(), y: { field: "y", aggregate: "sum" }, guides: false })
    .semanticSpec.layers[0].encoding.y.aggregate, "sum");
  const colored = source().createScatterPlot({ x: "time", y: "y", color: "other", guides: false });
  assert.equal(colored.semanticSpec.layers[0].encoding.color.fieldType, "nominal");
});

test("temporal Theta uses the same parser for Point and Line", () => {
  const point = source().createPointMark().encodeTheta(temporal()).encodeR({ field: "y" });
  assert.deepEqual(point.resolvedScales.theta.domain, [1000, 2000]);
  const line = source().createLineMark().encodeTheta(temporal()).encodeR({ field: "y" });
  assert.deepEqual(derivePolarLineSeries(rows, line.semanticSpec.layers[0]).thetaValues, [1000, 2000]);
  assert.throws(() => source().createArcMark().encodeTheta(temporal()), /temporal|quantitative|nominal|ordinal/);
});

test("horizontal grouped temporal bars transpose vertical geometry across units and reversal", () => {
  const values = [
    { time: 1000, group: "A", value: 2 }, { time: 1000, group: "B", value: 3 },
    { time: 2000, group: "A", value: 4 }, { time: 2000, group: "B", value: 5 }
  ];
  for (const temporalUnit of ["auto", "year", "timestamp"]) {
    for (const reverse of [false, true]) {
      const base = chart().createCanvas({ width: 500, height: 500, margin: 50 })
        .createData({ values });
      const time = { field: "time", fieldType: "temporal", temporalUnit, scale: { nice: false, reverse } };
      const measure = { field: "value", aggregate: "sum", scale: { nice: false } };
      const options = { color: { field: "group", layout: "group" }, guides: false };
      const vertical = base.createBarPlot({ ...options, x: time, y: measure });
      const horizontal = base.createBarPlot({ ...options, x: measure, y: time });
      const v = vertical.graphicSpec.objects.barPlot.items;
      const h = horizontal.graphicSpec.objects.barPlot.items;
      assert.equal(h.length, 4);
      for (let index = 0; index < v.length; index += 1) {
        const left = v[index].properties, right = h[index].properties;
        assert.equal(left.fill, right.fill);
        for (const [actual, expected] of [
          [left.x, 500 - right.y - right.height], [left.y, 500 - right.x - right.width],
          [left.width, right.height], [left.height, right.width]
        ]) assert.ok(Math.abs(actual - expected) < 1e-9, `${temporalUnit}/${reverse}: ${actual} != ${expected}`);
      }
      assert.deepEqual(base.semanticSpec.datasets[0].values, values);
    }
  }
});

test("layered marks inherit the input unit together with temporal positions", () => {
  const bars = source().createBarPlot({ x: temporal(), y: "y", guides: false });
  const layered = bars.createLineMark({ id: "trend" });
  assert.equal(layered.semanticSpec.layers.at(-1).encoding.x.temporalUnit, "timestamp");
  assert.deepEqual(layered.resolvedScales.x.domain, [1000, 2000]);
  const series = deriveLineSeries(rows, layered.semanticSpec.layers.at(-1));
  assert.deepEqual(series.xValues, [1000, 2000]);
  const points = scatter().createPointMark({ id: "overlay" });
  assert.equal(points.semanticSpec.layers.at(-1).encoding.x.temporalUnit, "timestamp");
  assert.deepEqual(points.graphicSpec.objects.overlay.items.map(item => item.properties),
    points.graphicSpec.objects.scatterPlot.items.map(item => item.properties));
});

test("channel selection/filter sees normalized time while raw field selectors retain raw years", () => {
  const base = scatter("year");
  const selected = base.selectMarks({ id: "selected", channel: "x", op: "eq", value: yearDomain[0] });
  assert.equal(resolveStoredSelection(selected, "selected").keys.length, 1);
  const raw = base.selectMarks({ id: "raw", field: "time", op: "eq", value: 1000 });
  assert.equal(resolveStoredSelection(raw, "raw").keys.length, 1);
  const filtered = base.filterMarks({ channel: "x", op: "eq", value: yearDomain[0] });
  assert.equal(filtered.graphicSpec.objects.scatterPlot.items.length, 1);
  const items = resolvePointItems(base, base.semanticSpec.layers[0], base.semanticSpec.datasets[0]);
  assert.deepEqual(items.map(item => item.channels.x), yearDomain);
  assert.deepEqual(items.map(item => item.fields.time), [1000, 2000]);
  assert.deepEqual(base.semanticSpec.datasets[0].values, rows);
});

test("Horizon and time-unit data retain input descriptors and bind generated timestamps explicitly", () => {
  const base = source().createAreaMark().encodeHorizon({ x: temporal(), y: "y" });
  assert.deepEqual(base.resolvedScales.x.domain, [1000, 2000]);
  assert.equal(base.semanticSpec.datasets.at(-1).transform[0].x.temporalUnit, "timestamp");
  assert.equal(base.semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
  const edited = base.editHorizon({ x: { field: "time", fieldType: "temporal" }, bands: 2 });
  assert.equal(edited.semanticSpec.datasets.at(-1).transform[0].x.temporalUnit, "timestamp");
  assert.deepEqual(edited.resolvedScales.x.domain, [1000, 2000]);
  const years = edited.editHorizon({ x: temporal("time", "year") });
  assert.deepEqual(years.resolvedScales.x.domain, yearDomain);
  assert.equal(years.semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
  const numeric = years.editHorizon({ x: { field: "time", fieldType: "quantitative" } });
  assert.equal(numeric.semanticSpec.layers[0].encoding.x.temporalUnit, undefined);
  const bucketed = source().createTimeUnitData({ id: "seconds", field: "time", unit: "second", as: "bucket", temporalUnit: "timestamp" });
  assert.equal(bucketed.semanticSpec.datasets.at(-1).transform[0].temporalUnit, "timestamp");
  assert.deepEqual(bucketed.semanticSpec.datasets.at(-1).values.map(row => row.bucket), [1000, 2000]);
  assert.deepEqual(bucketed.createPointMark().encodeX(temporal("bucket")).resolvedScales.x.domain, [1000, 2000]);
  assert.deepEqual(bucketed.semanticSpec.datasets[0].values, rows);
});

test("ErrorBand independent time and all boundaries retain the chosen units through statistics", () => {
  const band = source([{ time: 1000, y: 1 }, { time: 1000, y: 3 }, { time: 2000, y: 2 }, { time: 2000, y: 4 }])
    .createErrorBand({ x: temporal(), y: { field: "y", extent: "stdev" }, boundaries: {} });
  assert.deepEqual(band.resolvedScales.x.domain, [1000, 2000]);
  assert.ok(band.semanticSpec.layers.every(layer => layer.encoding.x.temporalUnit === "timestamp"));
  const edited = band.editErrorBand({ statistics: { extent: "ci", level: .9 }, boundaries: false })
    .editErrorBandBoundary({ boundary: "both", strokeWidth: 2 });
  assert.deepEqual(edited.resolvedScales.x.domain, [1000, 2000]);
  assert.ok(edited.semanticSpec.layers.every(layer => layer.encoding.x.temporalUnit === "timestamp"));
  const errorBar = source([{ time: 1000, y: 1 }, { time: 1000, y: 3 }, { time: 2000, y: 2 }, { time: 2000, y: 4 }])
    .createErrorBar({ x: temporal(), y: { field: "y", extent: "stdev" } });
  assert.ok(errorBar.semanticSpec.layers.every(layer => layer.encoding.x.temporalUnit === "timestamp"));
  const recapped = errorBar.editErrorBar({ caps: false }).editErrorBar({ caps: true });
  assert.ok(recapped.semanticSpec.layers.every(layer => layer.encoding.x.temporalUnit === "timestamp"));
});
