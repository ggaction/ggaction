import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { rows } from "../../../../examples/horizon-plot/data.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";

const base = (values = rows.signed) => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: "source", values });

test("completes the shortest Horizon with x-only guides and opaque signed bands", () => {
  const source = base();
  const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace });
  const p = source.createHorizonPlot({ x: "time", y: "value" });
  const layer = p.semanticSpec.layers[0];
  assert.equal(p.graphicSpec.objects.horizonPlot.items.length, 6);
  assert.deepEqual(p.resolvedScales[layer.encoding.y.scale].domain, [0, 1]);
  assert.deepEqual(Object.keys(p.semanticSpec.guides.axis), ["x"]);
  assert.deepEqual(Object.keys(p.semanticSpec.guides.grid), ["vertical"]);
  assert.equal(p.semanticSpec.guides.legend, undefined);
  assert.equal(p.markConfigs.horizonPlot.opacity, 1);
  assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace }, before);
  assert.equal(typeof basicChart().createHorizonPlot, "undefined");
});

const invalid = [
  {}, { x: "time" }, { y: "value" }, { x: "time", y: "" }, { x: "missing", y: "value" },
  { x: { field: "time", fieldType: "nominal" }, y: "value" },
  { x: { field: "time", fieldType: "quantitative", temporalUnit: "timestamp" }, y: "value" },
  { x: "time", y: { field: "value", temporalUnit: "auto" } },
  { x: { field: "time", target: "foreign" }, y: "value" },
  { x: "time", y: { field: "value", scale: { domain: [0, 2] } } },
  { x: "time", y: { field: "value", scale: { type: "log" } } },
  { x: "time", y: "value", color: false }, { x: "time", y: "value", source: "source" },
  { x: "time", y: "value", groupBy: [] }, { x: "time", y: "value", bands: 0 },
  { x: "time", y: "value", bands: null }, { x: "time", y: "value", baseline: Infinity },
  { x: "time", y: "value", extent: -1 }, { x: "time", y: "value", resolve: "invalid" },
  { x: "time", y: "value", missing: "interpolate" }, { x: "time", y: "value", overflow: "expand" },
  { x: "time", y: "value", palette: { positive: "invalid" } },
  { x: "time", y: "value", palette: { positive: null } },
  { x: "time", y: "value", palette: { negative: null } },
  { x: "time", y: "value", area: { fill: "red" } },
  { x: "time", y: "value", area: { opacity: 2 } }, { x: "time", y: "value", area: { opacity: null } },
  { x: "time", y: "value", area: { stroke: false } }, { x: "time", y: "value", area: { strokeWidth: 2 } },
  { x: "time", y: "value", guides: { axes: { y: {} } } },
  { x: "time", y: "value", guides: { grid: { horizontal: {} } } },
  { x: "time", y: "value", guides: { legend: {} } },
  { x: "time", y: "value", guides: { grid: { theta: {} } } }
];
for (const [index, options] of invalid.entries()) {
  test(`rejects invalid Horizon contract ${index + 1} without partial state or trace`, () => {
    const source = base();
    const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options });
    assert.throws(() => source.createHorizonPlot(options));
    assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options }, before);
  });
}

test("preserves legitimate empty all-baseline geometry and its original x domain", () => {
  const p = base([{ time: 1, value: 2 }, { time: 4, value: 2 }])
    .createHorizonPlot({ x: "time", y: "value", baseline: 2 });
  assert.equal(p.graphicSpec.objects.horizonPlot.items.length, 0);
  assert.deepEqual(p.resolvedScales[p.semanticSpec.layers[0].encoding.x.scale].domain, [1, 4]);
  assert.ok(p.semanticSpec.datasets[1].transform[0].resolved.extents.every(group => group.extent === 0));
});

test("attaches explicit coordinates and applies opacity after Horizon encoding", () => {
  const p = base().createCoordinate({ id: "timeline", type: "cartesian" })
    .createHorizonPlot({ x: "time", y: "value", coordinate: "timeline", area: { opacity: 0.4, curve: "step" } });
  assert.equal(p.semanticSpec.layers[0].coordinate, "timeline");
  assert.equal(p.markConfigs.horizonPlot.opacity, 0.4);
  assert.equal(p.editHorizon({ target: "horizonPlot", bands: 2 }).markConfigs.horizonPlot.opacity, 0.4);
  assert.deepEqual(p.trace.children.at(-1).children.map(child => child.op),
    ["createAreaMark", "createCoordinate", "encodeHorizon", "editAreaMark", "createGuides"]);
  assert.throws(() => base().createCoordinate({ id: "polar", type: "polar" })
    .createHorizonPlot({ x: "time", y: "value", coordinate: "polar" }));
  assert.throws(() => p.createHorizonPlot({ x: "time", y: "value" }));
});

test("retains lower folded-guide escape and reuses compatible facade x guides", () => {
  const p = base().createHorizonPlot({ x: "time", y: "value" });
  const next = p.createHorizonPlot({ id: "second", data: "source", x: "time", y: { field: "value", scale: { id: "foldedSecond" } } });
  assert.deepEqual(next.guideConfigs, p.guideConfigs);
  const escaped = p.createYAxis({ scale: p.semanticSpec.layers[0].encoding.y.scale })
    .createLegend({ target: "horizonPlot" });
  assert.ok(escaped.semanticSpec.guides.axis.y);
  assert.ok(escaped.semanticSpec.guides.legend);
  assert.throws(() => p.createHorizonPlot({ id: "conflict", data: "source", x: "time", y: "value",
    guides: { axes: { x: { title: { text: "Conflicting title" } } } } }));
});

test("lets an explicit Horizon tick count replace inferred tick values", () => {
  const program = base().createHorizonPlot({
    x: "time",
    y: "value",
    guides: {
      axes: { x: { ticksAndLabels: { count: 3 } } },
      grid: false,
      legend: false
    }
  });
  assert.equal(program.guideConfigs.axis.x.ticks.mode, "count");
  assert.equal(program.guideConfigs.axis.x.ticks.count, 3);
  assert.equal(program.guideConfigs.axis.x.labels.mode, "count");
});

test("omits explicitly disabled Horizon guide branches", () => {
  const program = base().createHorizonPlot({
    x: "time",
    y: "value",
    guides: {
      axes: { x: false },
      grid: { vertical: false },
      legend: false
    }
  });
  assert.equal(program.semanticSpec.guides.axis, undefined);
  assert.equal(program.semanticSpec.guides.grid, undefined);
});

test("preserves optional undefined and supports explicit missing and overflow policies", () => {
  const source = base();
  const expected = source.createHorizonPlot({ x: "time", y: "value", guides: false });
  const actual = source.createHorizonPlot({ x: { field: "time", fieldType: undefined, scale: { domain: undefined } },
    y: { field: "value", scale: { domain: undefined, range: undefined } }, bands: undefined,
    groupBy: false, area: { opacity: undefined, stroke: undefined }, guides: false });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.throws(() => base([{ time: 1, value: 1 }, { time: 1, value: 2 }]).createHorizonPlot({ x: "time", y: "value" }));
  assert.throws(() => base([{ time: 1, value: 1 }, { time: 2, value: null }])
    .createHorizonPlot({ x: "time", y: "value", missing: "error" }));
  assert.throws(() => source.createHorizonPlot({ x: "time", y: "value", extent: 1, overflow: "error" }));
});

test("selects materialized band properties without promising raw amplitude selectors", () => {
  const p = base().createHorizonPlot({ x: "time", y: "value" });
  const fill = p.graphicSpec.objects.horizonPlot.items[0].properties.fill;
  const selected = p.selectMarks({ target: "horizonPlot", property: "fill", op: "eq", value: fill });
  assert.equal(resolveStoredSelection(selected).keys.length, 1);
  assert.throws(() => p.selectMarks({ target: "horizonPlot", field: "value", op: "gt", value: 0 }));
});
