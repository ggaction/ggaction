import { getWrappedActionMetadata } from "../../src/core/action.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";

const rows = [{ x: 1, y: 2, z: 4, group: "a" }, { x: 2, y: 3, z: 5, group: "b" }];
function capture(create) {
  const Base = create().constructor, calls = [];
  let armed = false;
  class CapturingProgram extends Base {}
  const actions = new Map();
  for (let prototype = Base.prototype; prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype)) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(prototype))) {
      if (getWrappedActionMetadata(descriptor.value) && !actions.has(name)) actions.set(name, descriptor.value);
    }
  }
  for (const [name, implementation] of actions) {
    if (typeof Base.prototype[name] !== "function") continue;
    CapturingProgram.prototype[name] = function (args) {
      if (armed && this.actionStack.length > 0) calls.push(name);
      return implementation.call(this, args);
    };
  }
  const p = new CapturingProgram().createCanvas().createData({ id: "rows", values: rows })
    .createScatterPlot({ id: "point", x: "x", y: "y", guides: false });
  return { p, arm() { armed = true; }, disarm() { armed = false; calls.length = 0; }, calls };
}
function rejected(state, program, invoke, pattern) {
  const before = JSON.stringify(program);
  state.arm();
  assert.throws(() => invoke(program), pattern);
  assert.deepEqual(state.calls, []);
  assert.equal(JSON.stringify(program), before);
  state.disarm();
}

test("Cartesian facade proposals reject an independent Y before creating a mark", () => {
  for (const create of [chart, basicChart]) {
    const state = capture(create), { p } = state;
    for (const [operation, extra] of [["createScatterPlot", {}], ["createLinePlot", {}],
      ["createTextPlot", { text: { field: "group" } }]]) {
      if (typeof p[operation] !== "function") continue;
      rejected(state, p, q => q[operation]({ id: "other", data: "rows", x: "x",
        y: { field: "z", scale: { id: "independentY" } }, guides: false, ...extra }), /requires one Y scale/);
      assert.doesNotThrow(() => p[operation]({ id: "other", data: "rows", x: "x",
        y: { field: "z", scale: { id: "y" } }, guides: false, ...extra }));
    }
  }
});

test("complete axes and guide collections admit their final proposal before any child", () => {
  const state = capture(chart), p = state.p.createYAxis();
  rejected(state, p, q => q.createYAxis({ id: "right", position: "right" }), /one visible Y guide/);
  for (const operation of ["createAxes", "createGuides"]) {
    const axes = { x: {}, y: [{ id: "left", position: "left" }, { id: "right", position: "right" }] };
    rejected(state, state.p, q => q[operation](operation === "createGuides" ? { axes, legend: false, grid: false } : axes), /one visible Y guide/);
  }
});

test("focused axis creation and visibility changes reject before semantic or graphic writes", () => {
  const state = capture(chart), visible = state.p.createYAxis({ id: "right", position: "right" })
    .editSemantic({ property: "guide.axis.y.scale", value: "y" });
  for (const method of ["createYAxisLine", "createYAxisTicks", "createYAxisLabels", "createYAxisTitle", "createYAxisTicksAndLabels"]) {
    rejected(state, visible, q => q[method](), /one visible Y guide/);
  }
  const hidden = state.p.createYAxis({ id: "right", position: "right" }).editYAxis({ target: "right", visible: false }).createYAxis();
  rejected(state, hidden, q => q.editYAxis({ target: "right", visible: true }), /one visible Y guide/);
  rejected(state, hidden, q => q.editAxes({ y: [{ target: "right", visible: true }] }), /one visible Y guide/);
  const switched = hidden.editAxes({ y: [{ target: "right", visible: true }, { target: "y", visible: false }] });
  assert.equal(switched.guideConfigs.axis.right.visibility.all, true);
  assert.equal(switched.guideConfigs.axis.y.visibility.all, false);
});


test("native facade plans reject before optional datasets, filters, scales, or child owners", () => {
  const state = capture(chart), p = state.p;
  const quantitative = { field: "z", scale: { id: "independentY" } };
  const nominal = { field: "group", fieldType: "nominal", scale: { id: "independentY" } };
  const cases = [
    ["createBarPlot", { x: { field: "group", fieldType: "nominal", scale: { id: "categoryX" } }, y: quantitative }],
    ["createBarPlot", { x: "x", y: { lower: "y", upper: "z", scale: { id: "independentY" } } }],
    ["createAreaPlot", { x: "x", y: { lower: "y", upper: "z", scale: { id: "independentY" } } }],
    ["createHistogram", { field: "x", yScale: { id: "independentY" } }],
    ["createHeatmap", { x: { field: "group", scale: { id: "categoryX" } }, y: nominal }],
    ["createHeatmap", { x: "x", y: quantitative, bin: { bins: { x: 2, y: 2 } } }],
    ["createDensityPlot", { field: "x", bandwidth: 1, densityScale: { id: "independentY" } }],
    ["createECDFPlot", { field: "x" }],
    ["createDotPlot", { category: "group", value: "y", summary: "mean", missing: "skip" }],
    ["createLollipopPlot", { category: "group", value: "y", summary: "mean" }],
    ["createDumbbellPlot", { category: "group", start: "y", end: "z", summary: "mean" }],
    ["createRugPlot", { y: quantitative, edge: "right" }],
    ["createStripPlot", { x: "x", y: nominal }],
    ["createBeeswarmPlot", { x: "x", y: "group" }],
    ["createIntervalPlot", { x: "group", y: { ...quantitative, center: "mean", extent: "stdev" } }],
    ["createRegressionPlot", { x: "x", y: quantitative }],
    ["createBoxPlot", { x: { field: "group", fieldType: "nominal", scale: { id: "categoryX" } }, y: quantitative }],
    ["createGradientPlot", { x: { field: "group", fieldType: "nominal", scale: { id: "categoryX" } }, y: quantitative, density: { bandwidth: 1 } }],
    ["createViolinPlot", { x: { field: "group", scale: { id: "categoryX" } }, y: quantitative, density: { bandwidth: 1 } }],
    ["createRaincloudPlot", { category: "group", value: quantitative, missing: "skip" }],
    ["createHorizonPlot", { x: "x", y: "y" }],
    ["createErrorBar", { x: { field: "group", fieldType: "nominal", scale: { id: "categoryX" } }, y: { ...quantitative, center: "mean", extent: "stdev" } }],
    ["createErrorBand", { x: { field: "x", fieldType: "quantitative" }, y: { ...quantitative, center: "mean", extent: "stdev" } }]
  ];
  for (const [operation, options] of cases) {
    rejected(state, p, q => q[operation]({ id: "other", data: "rows", ...options,
      ...(["createErrorBar", "createErrorBand"].includes(operation) ? {} : { guides: false }) }), /requires one Y scale/);
  }
});

test("direct ranged and histogram aggregates validate the final pair before writing an endpoint", () => {
  const state = capture(chart);
  const range = state.p.createAreaMark({ id: "area", data: "rows" }).encodeX({ field: "x" });
  rejected(state, range, q => q.encodeYRange({ target: "area", lower: "y", upper: "z", scale: { id: "otherY" } }), /requires one Y scale/);
  const histogram = state.p.createBarMark({ id: "bar", data: "rows" });
  rejected(state, histogram, q => q.encodeHistogram({ target: "bar", field: "x", yScale: { id: "otherY" } }), /requires one Y scale/);
});

test("endpoint replacement and distribution role handoffs validate before removal or data revision", () => {
  const state = capture(chart);
  const endpoint = state.p.createDotPlot({ id: "dot", data: "rows", category: "group", orientation: "vertical",
    value: { field: "z", scale: { id: "y" } }, summary: "mean", guides: false });
  rejected(state, endpoint, q => q.editEndpointPlot({ target: "dot", value: { field: "z", scale: { id: "otherY" } } }), /requires one Y scale/);
  const box = state.p.createBoxPlot({ id: "box", data: "rows", x: { field: "group", fieldType: "nominal", scale: { id: "categoryX" } },
    y: { field: "z", scale: { id: "y" } }, guides: false });
  rejected(state, box, q => q.editBoxPlot({ target: "box", y: { field: "z", scale: { id: "otherY" } } }), /requires one Y scale/);
  const interval = state.p.createIntervalPlot({ id: "interval", data: "rows", x: "group",
    y: { center: "y", lower: "x", upper: "z", scale: { id: "y" } }, guides: false });
  rejected(state, interval, q => q.editErrorBar({ target: "intervalInterval", y: { field: "z", center: "mean", extent: "stdev", scale: { id: "otherY" } } }), /requires one Y scale/);
});


test("direct regression components validate their final Y before a mark or interval child", () => {
  const state = capture(chart), p = state.p.createData({ id: "fitRows", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 5 }] })
    .createRegressionData({ id: "regression", source: "fitRows", x: "x", y: "y", method: "linear" });
  rejected(state, p, q => q.createRegressionLine({ id: "fit", data: "regression", x: "x", y: "y", xScale: "x", yScale: "otherY" }), /requires one Y scale/);
  rejected(state, p, q => q.createRegressionBand({ id: "band", data: "regression", x: "x", lower: "__regression_ci_lower", upper: "__regression_ci_upper", xScale: "x", yScale: "otherY" }), /requires one Y scale/);
});


test("bulk Cartesian assignments reject ordinary and inactive conditional Y before draft children", () => {
  const state = capture(chart), p = state.p.createPointMark({ id: "second", data: "rows" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const when = { version: 2, registry: "standard@1", root: { type: "literal", value: false } };
  for (const y of [
    { field: "z", scale: { id: "independentY" } },
    { conditions: [{ when, value: { field: "z", scale: { id: "independentY" } } }], otherwise: { field: "y", scale: { id: "y" } } }
  ]) rejected(state, p, q => q.encodeChannels({ target: "second", channels: { x: { field: "x" }, y } }), /requires one Y scale/);
  const next = chart().createCanvas().createData({ values: rows }).createScatterPlot({ id: "point", x: "x", y: "y", guides: false })
    .createYAxis().encodeChannels({ target: "point", channels: { x: { field: "x" }, y: { field: "z", scale: { id: "replacementY" } } } });
  assert.equal(next.semanticSpec.layers[0].encoding.y.scale, "replacementY");
  assert.equal(next.semanticSpec.guides.axis.y.scale, "replacementY");
});


test("coordinate attachment admits unfinished extension layers before binding writes", () => {
  const state = capture(chart);
  const p = state.p.createScale({ id: "otherY", type: "linear", domain: [0, 5] })
    .editSemantic({ property: "layer[pending].mark.type", value: "point" })
    .editSemantic({ property: "layer[pending].data", value: "rows" })
    .editSemantic({ property: "layer[pending].encoding.y.field", value: "y" })
    .editSemantic({ property: "layer[pending].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[pending].encoding.y.scale", value: "otherY" });
  rejected(state, p, q => q.createCoordinate({ id: "main", layers: ["pending"] }), /requires one Y scale/);
  rejected(state, p, q => q.createCoordinate({ id: "overlaid", layers: ["pending"] }), /overlaps an independent/);
  const shared = p.editSemantic({ property: "layer[pending].encoding.y.scale", value: "y" })
    .createCoordinate({ id: "main", layers: ["pending"] });
  assert.equal(shared.semanticSpec.layers.at(-1).coordinate, "main");
});

test("coordinate aspect edits reject independent frame overlap before semantic writes", () => {
  const state = capture(chart), Program = state.p.constructor;
  let p = new Program().createCanvas({ width: 500, height: 300, margin: 20 }).createData({ id: "rows", values: rows });
  for (const [id, alignX] of [["left", "start"], ["right", "end"]]) {
    p = p.createCoordinate({ id }).editCoordinate({ target: id, aspect: { mode: "frame", ratio: 0.4, alignX } })
      .createScatterPlot({ id, data: "rows", coordinate: id, x: { field: "x", scale: { id: `${id}X` } },
        y: { field: "y", scale: { id: `${id}Y` } }, guides: false });
  }
  rejected(state, p, q => q.editCoordinate({ target: "left", aspect: "auto" }), /overlaps an independent/);
  assert.doesNotThrow(() => p.editCoordinate({ target: "left", aspect: { mode: "frame", ratio: 0.2, alignX: "start" } }));
});
