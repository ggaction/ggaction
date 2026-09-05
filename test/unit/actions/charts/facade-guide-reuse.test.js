import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const values = [
  { x: 1, y: 2, category: "A", group: "a" },
  { x: 2, y: 4, category: "A", group: "a" },
  { x: 3, y: 3, category: "B", group: "b" },
  { x: 4, y: 5, category: "B", group: "b" }
];
function base() {
  return chart().createCanvas({ width: 620, height: 440, margin: { top: 80, bottom: 80, left: 80, right: 180 } })
    .createData({ id: "data", values });
}
function state(program) {
  return { semantic: program.semanticSpec, graphic: program.graphicSpec, scales: program.resolvedScales, guides: program.guideConfigs };
}
function scatter(program, guides) {
  return program.createScatterPlot({ id: "points", x: "x", y: "y", ...(guides === undefined ? {} : { guides }) });
}
function line(program, guides) {
  return program.createLinePlot({ id: "line", x: "x", y: "y", ...(guides === undefined ? {} : { guides }) });
}
function expectAtomic(program, operation, message) {
  const before = structuredClone(state(program));
  const trace = program.trace;
  assert.throws(() => operation(program), message);
  assert.deepEqual(state(program), before);
  assert.equal(program.trace, trace);
}

test("Scatter and Line defaults reuse their compatible axes and grid", () => {
  const before = scatter(base());
  const expected = line(before, false);
  for (const guides of [undefined, {}, { axes: {}, grid: {}, legend: false }]) {
    const actual = line(before, guides);
    assert.deepEqual(state(actual), state(expected));
    assert.equal(actual.trace.children.at(-1).children.some(child => child.op === "createGuides"), false);
  }
});

test("automatic guide reuse preserves edited titles, placement, tick mode and style", () => {
  const before = scatter(base(), {
    axes: { x: { position: "top", line: { color: "purple", lineWidth: 2 }, ticksAndLabels: { count: 3 }, title: { text: "My x" } } },
    grid: { horizontal: { count: 3, color: "pink", lineWidth: 2 } }
  });
  assert.deepEqual(state(line(before)), state(line(before, false)));
  assert.deepEqual(state(line(before, {
    axes: { x: { position: "top", title: { text: "My x" }, ticksAndLabels: { count: 3 } } },
    grid: { horizontal: { color: "pink" } }
  })), state(line(before, false)));
  for (const guides of [
    { axes: { x: { title: { text: "Different" } } } },
    { axes: { x: { line: { lineWidth: 3 } } } },
    { axes: { x: { ticksAndLabels: { count: 4 } } } },
    { grid: { horizontal: { color: "gray" } } }
  ]) expectAtomic(before, p => line(p, guides), /Facade guide conflict/);
  expectAtomic(before, p => line(p, { axes: { x: { ticksAndLabels: { labels: { wrong: 1 } } } } }), /Unknown/);
});

for (const component of ["Line", "Ticks", "Labels", "Title"]) {
  test(`fills a partial x axis with only ${component.toLowerCase()} while keeping its placement`, () => {
    const before = scatter(base(), false)[`createXAxis${component}`]({ position: "top" });
    let expected = line(before, false).editSemantic({ property: "guide.axis.x.coordinate", value: "main" });
    if (component !== "Line") expected = expected.createXAxisLine({ position: "top" });
    if (!["Ticks", "Labels"].includes(component)) {
      expected = expected.createXAxisTicksAndLabels({ position: "top" });
    } else {
      if (component !== "Ticks") expected = expected.createXAxisTicks({ position: "top", count: 5 });
      if (component !== "Labels") expected = expected.createXAxisLabels({ position: "top" });
    }
    if (component !== "Title") expected = expected.createXAxisTitle({ position: "top" });
    expected = expected.createYAxis({ scale: "y", coordinate: "main" });
    const actual = line(before, { grid: false, legend: false });
    assert.deepEqual(state(actual), state(expected));
    assert.equal(actual.guideConfigs.axis.x.line.position, "top");
  });
}

test("a labels-only custom tick mode supplies the missing ticks", () => {
  const before = scatter(base(), false).createXAxisLabels({ values: [1, 3, 4] });
  const actual = line(before, { grid: false, legend: false });
  assert.deepEqual(actual.guideConfigs.axis.x.ticks.values, [1, 3, 4]);
  assert.deepEqual(actual.guideConfigs.axis.x.labels.values, [1, 3, 4]);
  expectAtomic(before, p => line(p, { axes: { x: { ticksAndLabels: { count: 3 } } } }), /conflict/);
});

test("guide conflicts compare resource identities rather than equal numeric domains", () => {
  const before = scatter(base());
  expectAtomic(before, p => p.createLinePlot({
    x: { field: "x", scale: { id: "anotherX" } }, y: "y"
  }), /different coordinate or scale/);
  expectAtomic(before, p => p.createLinePlot({
    coordinate: "other", x: "x", y: "y"
  }), /different coordinate or scale/);
  expectAtomic(before, p => line(p, { axes: { x: { scale: "anotherX" } } }), /does not belong/);
});

test("a legacy axis with two possible coordinates rejects ambiguity", () => {
  const before = scatter(base(), false).createXAxisLine();
  expectAtomic(before, p => p.createLinePlot({ coordinate: "other", x: "x", y: "y" }), /no unique compatible coordinate/);
});

test("false disables this facade's requests without deleting shared guides", () => {
  const before = scatter(base());
  assert.deepEqual(state(line(before, { axes: false, grid: false, legend: false })), state(line(before, false)));
  const withoutGuides = line(scatter(base(), false), { axes: false, grid: false, legend: false });
  assert.equal(withoutGuides.graphicSpec.objects.xAxisLine, undefined);
  for (const create of [p => p.createGuides(), p => p.createAxes(), p => p.createXAxisLine()]) {
    expectAtomic(before, create, /already|missing/);
  }
});

test("a new facade scopes automatic guides to its own layer", () => {
  const before = scatter(base(), false).createBarPlot({
    id: "bars", x: { field: "category", fieldType: "nominal", scale: { id: "categoryX" } },
    y: { field: "y", scale: { id: "measureY" } }, guides: false
  });
  const actual = line(before);
  assert.equal(actual.semanticSpec.guides.axis.x.scale, "x");
  assert.equal(actual.semanticSpec.guides.axis.y.scale, "y");
  assert.equal(actual.semanticSpec.guides.grid.horizontal.scale, "y");
});

test("a Box reuses compatible guides when deferred positions complete", () => {
  const category = { field: "category", fieldType: "nominal" };
  const build = guides => base().createBoxPlot({ id: "box", data: "data", guides })
    .createScatterPlot({ id: "points", x: { ...category, scale: { type: "band" } }, y: "y" })
    .encodeX({ target: "box", ...category }).encodeY({ target: "box", field: "y" });
  const expected = build(false);
  const actual = build({});
  assert.deepEqual(state(actual), state(expected));
});

test("Parallel coordinates reject a second owner's independent dimension scales", () => {
  const options = { dimensions: ["x", "y"] };
  const before = base().createParallelCoordinates({ id: "first", ...options });
  const explicit = before.createParallelCoordinates({ id: "second", ...options, guides: false });
  assert.equal(explicit.semanticSpec.guides.axis.parallel.target, "first");
  expectAtomic(before, p => p.createParallelCoordinates({ id: "different", dimensions: ["x", "y"] }), /different coordinate or dimension scales/);
});

const legendFacades = [
  ["Line categorical", (p, id, guides) => p.createLinePlot({ id, x: "x", y: "y", color: "group", guides })],
  ["Point shape/color", (p, id, guides) => p.createScatterPlot({ id, x: "x", y: "y", color: "group", shape: "group", guides })],
  ["Point size", (p, id, guides) => p.createScatterPlot({ id, x: "x", y: "y", size: "x", guides })],
  ["Point continuous color", (p, id, guides) => p.createScatterPlot({ id, x: "x", y: "y", color: { field: "x", fieldType: "quantitative" }, guides })],
  ["Point interval color", (p, id, guides) => p.createScatterPlot({ id, x: "x", y: "y", color: { field: "x", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } }, guides })],
  ["Bar categorical", (p, id, guides) => p.createBarPlot({ id, x: { field: "category", fieldType: "nominal" }, y: { field: "y", scale: { id: `${id}Y` } }, color: "group", guides: guides ?? { axes: false, grid: false } })],
  ["Histogram categorical", (p, id, guides) => p.createHistogram({ id, field: "x", maxBins: 2, color: "group", guides })],
  ["Heatmap continuous", (p, id, guides) => p.createHeatmap({ id, x: { field: "x", fieldType: "ordinal" }, y: "group", color: { field: "y", fieldType: "quantitative" }, guides })],
  ["Violin categorical", (p, id, guides) => p.createViolinPlot({ id, data: "data", x: "category", y: "y", color: "category", density: { bandwidth: 0.5, steps: 8 }, guides: guides ?? { legend: {} } })]
];
for (const [name, create] of legendFacades) {
  test(`${name} reuses the compatible legend without transferring its owner`, () => {
    const before = create(base(), "first", undefined);
    const expected = create(before, "second", false);
    const actual = create(before, "second", undefined);
    assert.deepEqual(state(actual), state(expected));
    for (const config of Object.values(actual.guideConfigs.legend)) assert.equal(config.target, "first");
  });
}

test("categorical legend reuse preserves custom appearance and rejects explicit conflicts", () => {
  const create = legendFacades[0][1];
  const before = create(base(), "first", {
    legend: { title: "My groups", symbol: { length: 25, lineWidth: 3 }, labels: { color: "purple" } }
  });
  assert.deepEqual(state(create(before, "second", undefined)), state(create(before, "second", false)));
  assert.deepEqual(state(create(before, "second", { legend: { symbol: { lineWidth: 3 } } })), state(create(before, "second", false)));
  for (const legend of [{ title: "Different" }, { symbol: { lineWidth: 2 } }, { labels: { color: "pink" } }]) {
    expectAtomic(before, p => create(p, "second", { legend }), /Facade guide conflict/);
  }
});

test("a Point symbol recipe cannot silently reuse a Line legend", () => {
  const before = legendFacades[0][1](base(), "first", undefined);
  expectAtomic(before, p => legendFacades[1][1](p, "second", undefined), /channels or scales|symbol recipe/);
  const explicit = legendFacades[1][1](before, "second", { legend: false });
  assert.equal(explicit.guideConfigs.legend.series.target, "first");
});

test("a new legend uses this facade's target even when another mark is current", () => {
  const before = base().createScatterPlot({ id: "unrelated", x: "x", y: "y", size: "x", guides: false });
  const actual = before.createLinePlot({ x: "x", y: "y", color: "group" });
  assert.equal(actual.guideConfigs.legend.series.target, "linePlot");
  assert.equal(actual.guideConfigs.legend.size, undefined);
});

test("Gradient plots reuse axes and grid but reject another density legend scale", () => {
  const options = { data: "data", x: { field: "category", fieldType: "nominal" }, y: "y", density: { bandwidth: 0.5, steps: 8 } };
  const before = base().createGradientPlot({ id: "first", ...options })
    .editYAxisTitle({ text: "Custom measure" });
  const expected = before.createGradientPlot({ id: "second", ...options, guides: false });
  const actual = before.createGradientPlot({ id: "second", ...options, guides: { legend: false } });
  assert.deepEqual(state(actual), state(expected));
  expectAtomic(before, p => p.createGradientPlot({ id: "second", ...options }), /density legend uses a different scale/);
});

test("Violin inferred source titles preserve existing custom axis titles", () => {
  const create = legendFacades.at(-1)[1];
  const before = create(base(), "first", undefined).editYAxisTitle({ text: "Custom measure" });
  assert.deepEqual(state(create(before, "second", undefined)), state(create(before, "second", false)));
});

test("shared histogram boundaries must agree for automatic axis reuse", () => {
  const before = base().createHistogram({ id: "first", field: "x", maxBins: 2 })
    .createData({ id: "different", values: [{ x: 10 }, { x: 20 }] });
  expectAtomic(before, p => p.createHistogram({ id: "second", data: "different", field: "x", maxBins: 2 }), /cannot infer shared histogram bins/);
});

test("uncolored Bars reuse all matching axes and grids", () => {
  const options = { x: { field: "category", fieldType: "nominal" }, y: "y" };
  const before = base().createBarPlot({ id: "first", ...options });
  assert.deepEqual(state(before.createBarPlot({ id: "second", ...options })),
    state(before.createBarPlot({ id: "second", ...options, guides: false })));
});
