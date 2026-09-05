import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";
import { rows } from "../../../../examples/density-plot/data.js";

const base = (values = rows) => chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: "source", values });

test("completes the shortest density with one ungrouped baseline profile and no inferred color", () => {
  const source = base();
  const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace });
  const p = source.createDensityPlot({ field: "value" });
  const layer = p.semanticSpec.layers[0];
  assert.equal(layer.encoding.group, undefined);
  assert.equal(layer.encoding.color, undefined);
  assert.equal(p.graphicSpec.objects.densityPlot.items.length, 1);
  assert.equal(p.semanticSpec.datasets.at(-1).values.length, 100);
  assert.equal(p.markConfigs.densityPlot.opacity, 0.2);
  assert.equal(p.semanticSpec.guides.legend, undefined);
  assert.deepEqual(Object.keys(p.semanticSpec.guides.grid), ["horizontal"]);
  assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace }, before);
  assert.equal(typeof basicChart().createDensityPlot, "undefined");
});

const invalid = [
  {}, { field: "" }, { field: "missing" }, { field: "value", source: "source" },
  { field: "value", placement: { type: "baseline" } }, { field: "value", x: "value" },
  { field: "value", groupBy: [] }, { field: "value", groupBy: "missing" },
  { field: "value", color: false }, { field: "value", color: "group" },
  { field: "value", groupBy: "group", color: "value" },
  { field: "value", groupBy: "group", color: { field: "group", fieldType: "quantitative" } },
  { field: "value", groupBy: "group", color: { field: "group", layout: "stack" } },
  { field: "value", groupBy: "group", color: "group", area: { fill: "red" } },
  { field: "value", bandwidth: 0 }, { field: "value", bandwidth: null },
  { field: "value", steps: 1 }, { field: "value", extent: [6, 0] },
  { field: "value", kernel: "invalid" }, { field: "value", normalization: "invalid" },
  { field: "value", densityChannel: "z" }, { field: "value", as: ["same", "same"] },
  { field: "value", densityScale: { domain: [1, 2] } },
  { field: "value", valueScale: { type: "band" } },
  { field: "value", area: { strokeWidth: 2 } }, { field: "value", area: { opacity: null } },
  { field: "value", area: { stroke: false } },
  { field: "value", guides: { legend: {} } },
  { field: "value", groupBy: "group", color: "group", guides: { legend: { gradient: {} } } },
  { field: "value", guides: { axes: { coordinate: { id: "foreign", type: "cartesian" } } } }
];
for (const [index, options] of invalid.entries()) {
  test(`rejects invalid density contract ${index + 1} atomically`, () => {
    const source = base();
    const before = structuredClone({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options });
    assert.throws(() => source.createDensityPlot(options));
    assert.deepEqual({ semantic: source.semanticSpec, graphic: source.graphicSpec, trace: source.trace, options }, before);
  });
}

test("preserves explicit group identity independently from color and supports JSON opt-out", () => {
  const source = base();
  const grouped = source.createDensityPlot({ field: "value", groupBy: "group", guides: false });
  assert.equal(grouped.graphicSpec.objects.densityPlot.items.length, 2);
  assert.equal(grouped.semanticSpec.layers[0].encoding.color, undefined);
  const ungrouped = source.createDensityPlot(JSON.parse('{"field":"value","groupBy":false,"guides":false}'));
  assert.equal(ungrouped.graphicSpec.objects.densityPlot.items.length, 1);
  const colored = source.createDensityPlot({ field: "value", groupBy: "group", color: "group" });
  const selection = resolveStoredSelection(colored.selectMarks({ target: "densityPlot", field: "group", op: "eq", value: "A" }));
  assert.equal(selection.keys.length, 1);
  assert.ok(selection.items[0].members.length > 0);
  const revision = colored.editDensity({ target: "densityPlot", groupBy: false });
  assert.equal(revision.semanticSpec.layers[0].encoding.group, undefined);
  assert.equal(revision.semanticSpec.layers[0].encoding.color, undefined);
  assert.equal(revision.semanticSpec.guides.legend?.color, undefined);
  assert.equal(revision.graphicSpec.objects.densityPlot.items.length, 1);
  assert.equal(colored.graphicSpec.objects.densityPlot.items.length, 2);
});

test("retains only valid numeric rows and supports explicit singleton statistics", () => {
  const p = base([{ value: 1 }, { value: null }, { value: 3 }, { value: "bad" }])
    .createDensityPlot({ field: "value", bandwidth: 1, extent: [0, 4], steps: 5, normalization: "count", as: ["v", "d"], guides: false });
  const values = p.semanticSpec.datasets.at(-1).values;
  assert.equal(values.length, 5);
  assert.deepEqual(Object.keys(values[0]).sort(), ["d", "v"]);
  assert.throws(() => base([{ value: 1 }]).createDensityPlot({ field: "value" }));
  assert.equal(base([{ value: 1 }]).createDensityPlot({ field: "value", bandwidth: 1, extent: [0, 2], guides: false })
    .graphicSpec.objects.densityPlot.items.length, 1);
});

test("reuses shared guides, selects explicit source and preserves optional undefined", () => {
  const source = base();
  const options = { field: "value", valueScale: { id: "values" }, densityScale: { id: "densities" } };
  const first = source.createDensityPlot(options);
  const second = first.createDensityPlot({ ...options, id: "second", data: "source" });
  assert.deepEqual(second.guideConfigs, first.guideConfigs);
  assert.throws(() => first.createDensityPlot(options));
  const expected = source.createDensityPlot({ field: "value", guides: false });
  const actual = source.createDensityPlot({ field: "value", bandwidth: undefined, groupBy: undefined,
    valueScale: { domain: undefined, range: undefined }, densityScale: { domain: undefined },
    area: { stroke: undefined, strokeWidth: undefined, opacity: undefined }, guides: false });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
});

test("replays selected profile highlights through source-field revisions", () => {
  const before = base().createDensityPlot({ field: "value", groupBy: "group", color: "group" })
    .highlightMarks({ target: "densityPlot", select: { field: "group", op: "eq", value: "A" },
      fill: "#111111", dimOthers: { opacity: 0.1 } });
  const snapshot = structuredClone(before.graphicSpec);
  const after = before.createData({ id: "observations", values: rows.map(row => ({ group: row.group, measure: row.value * 2 })) })
    .editDensity({ target: "densityPlot", source: "observations", field: "measure" });
  assert.equal(after.semanticSpec.datasets.at(-1).source, "observations");
  assert.ok(after.graphicSpec.objects.densityPlot.items.some(item => item.properties.fill === "#111111"));
  assert.ok(after.graphicSpec.objects.densityPlot.items.some(item => item.properties.opacity === 0.1));
  assert.deepEqual(before.graphicSpec, snapshot);
});

test("requires an explicit ambiguous coordinate and keeps new density roles independent", () => {
  const source = base().createCoordinate({ id: "one", type: "cartesian" })
    .createCoordinate({ id: "two", type: "cartesian" });
  assert.throws(() => source.createDensityPlot({ field: "value", guides: false }));
  const p = source.createDensityPlot({ field: "value", coordinate: "two", guides: false });
  assert.equal(p.semanticSpec.layers[0].coordinate, "two");
  const prior = base().createAreaMark({ id: "prior", data: "source" })
    .encodeX({ field: "value" }).encodeY({ field: "value" }).encodeGroup({ field: "group" });
  const next = prior.createDensityPlot({ field: "value", guides: false,
    valueScale: { id: "densityValue" }, densityScale: { id: "densityHeight" } });
  assert.equal(next.semanticSpec.layers[1].encoding.group, undefined);
  assert.equal(next.graphicSpec.objects.densityPlot.items.length, 1);
});

test("forwards every existing kernel and normalization without changing their statistical owner", () => {
  for (const kernel of ["gaussian", "epanechnikov", "uniform", "triangular"]) {
    for (const normalization of ["unit", "count"]) {
      const p = base().createDensityPlot({ field: "value", kernel, normalization,
        bandwidth: 1, extent: [0, 6], steps: 7, guides: false });
      const transform = p.semanticSpec.datasets.at(-1).transform[0];
      assert.equal(transform.kernel, kernel);
      assert.equal(transform.normalization, normalization);
      assert.ok(p.semanticSpec.datasets.at(-1).values.every(row => Number.isFinite(row.value_density) && row.value_density >= 0));
    }
  }
});
