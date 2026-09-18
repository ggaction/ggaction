import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const theme = { base: "light", tokens: { axisLabel: "red", axisTitle: "blue",
  axisLabelFontFamily: "serif", axisTitleFontFamily: "monospace",
  axisLabelFontSize: 16, axisTitleFontSize: 18 } };
const rows = [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }];
const base = (factory = chart) => factory().createCanvas({ width: 900, height: 600, margin: 160 }).createData({ values: rows });
const complete = p => {
  const plot = p.createScatterPlot({ x: "x", y: "y", color: "group" });
  return typeof plot.createTitle === "function" ? plot.createTitle({ text: "Chart" }) : plot;
};
const text = (p, id) => p.graphicSpec.objects[id].properties ?? p.graphicSpec.objects[id].items[0].properties;

test("axis-only typography is order independent and leaves other text untouched", () => {
  for (const factory of [chart, basicChart]) {
    const plain = complete(base(factory));
    const before = serializeProgram(plain);
    const after = plain.applyTheme({ theme });
    const first = complete(base(factory).applyTheme({ theme }));
    assert.deepEqual(first.graphicSpec, after.graphicSpec);
    assert.equal(text(after, "xAxisLabels").fontSize, 16);
    assert.equal(text(after, "xAxisLabels").fontFamily, "serif");
    assert.equal(text(after, "xAxisLabels").fill, "red");
    assert.equal(text(after, "yAxisTitle").fontSize, 18);
    assert.equal(text(after, "yAxisTitle").fontFamily, "monospace");
    assert.equal(text(after, "yAxisTitle").fill, "blue");
    assert.deepEqual(after.graphicSpec.objects.chartTitle, plain.graphicSpec.objects.chartTitle);
    assert.deepEqual(after.graphicSpec.objects.colorLegendLabels, plain.graphicSpec.objects.colorLegendLabels);
    assert.deepEqual(after.removeTheme().graphicSpec, plain.applyTheme({ theme: "light" }).graphicSpec);
    assert.deepEqual(after.applyTheme({ theme: "light" }).graphicSpec, plain.applyTheme({ theme: "light" }).graphicSpec);
    assert.deepEqual(deserializeProgram(serializeProgram(after)).graphicSpec, after.graphicSpec);
    assert.equal(serializeProgram(plain), before);
  }
});

test("explicit axis role styles win over scoped defaults including equal baseline sizes", () => {
  const source = base().createScatterPlot({ x: "x", y: "y", guides: { axes: {
    x: { ticksAndLabels: { labels: { fontSize: 12, fontFamily: "sans-serif", color: "green" } } },
    y: { title: { fontSize: 13 } }
  } } });
  const result = source.applyTheme({ theme });
  assert.equal(text(result, "xAxisLabels").fontSize, 12);
  assert.equal(text(result, "xAxisLabels").fontFamily, "sans-serif");
  assert.equal(text(result, "xAxisLabels").fill, "green");
  assert.equal(text(result, "yAxisTitle").fontSize, 13);
  assert.equal(text(result, "yAxisLabels").fontSize, 16);
  const edited = result.editYAxisLabels({ fontSize: 12 }).applyTheme({ theme: "dark" });
  assert.equal(text(edited, "yAxisLabels").fontSize, 12);
});

test("Polar and Parallel roles use scoped typography and restore family defaults", () => {
  const polarPlot = p => p.createPointMark().encodeTheta({ field: "x" }).encodeR({ field: "y" })
    .createThetaAxis().createRadialAxis();
  const parallelPlot = p => p.createParallelCoordinates({ dimensions: ["x", "y"], guides: { legend: false } });
  const polar = polarPlot(base());
  const parallel = parallelPlot(base());
  for (const build of [polarPlot, parallelPlot]) {
    assert.deepEqual(build(base().applyTheme({ theme })).graphicSpec, build(base()).applyTheme({ theme }).graphicSpec);
  }
  for (const [source, labels, title] of [[polar, "thetaAxisLabels", "thetaAxisTitle"],
    [parallel, "parallelAxisLabels", "parallelAxisTitles"]]) {
    const themed = source.applyTheme({ theme });
    const size = text(themed, labels).fontSize;
    assert.ok(Array.isArray(size) ? size.every(value => value === 16) : size === 16);
    const titleSize = text(themed, title).fontSize;
    assert.ok(Array.isArray(titleSize) ? titleSize.every(value => value === 18) : titleSize === 18);
    assert.deepEqual(themed.removeTheme().graphicSpec, source.applyTheme({ theme: "light" }).graphicSpec);
  }
});

test("scoped typography validates font tokens atomically", () => {
  const source = complete(base());
  const before = serializeProgram(source);
  for (const tokens of [{ axisLabelFontSize: 0 }, { axisTitleFontSize: Infinity },
    { axisLabelFontSize: "large" }, { axisLabelFontFamily: "" }, { axisLabel: 12 }]) {
    assert.throws(() => source.applyTheme({ theme: { base: "light", tokens } }));
    assert.equal(serializeProgram(source), before);
  }
});

test("initial scoped fonts participate in fixed-margin layout validation", () => {
  for (const factory of [chart, basicChart]) {
    const source = factory().createCanvas({ width: 300, height: 200, margin: 24 })
      .createData({ values: rows });
    const plot = (p, labels) => p.createScatterPlot({ x: "x", y: "y", guides: {
      axes: { x: { title: false, ticksAndLabels: { labels } }, y: false },
      legend: false, grid: false
    } });
    assert.throws(() => plot(source, {}), /labels do not fit/);
    const themed = plot(source.applyTheme({ theme: { base: "light", tokens: { axisLabelFontSize: 6 } } }), {});
    const explicit = plot(source, { fontSize: 6 }).applyTheme({ theme: "light" });
    assert.deepEqual(themed.graphicSpec, explicit.graphicSpec);
    assert.equal(text(themed, "xAxisLabels").fontSize, 6);
  }
});
