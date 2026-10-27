import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { observationMean, observationQuantile } from "../../../oracles/observation-statistics.js";

const rows = [0, 0, 10, 20, 20, 20, 40].map((value, index) => ({
  value, revised: value / 10 + 1, group: index < 3 ? "A" : "B",
  facet: index % 2 ? "odd" : "even", time: index
}));
const base = (values = rows) => chart().createCanvas({ width: 500, height: 400, margin: 50 })
  .createData({ id: "rows", values });
const values = (program, id = "statisticalReference") => program.semanticSpec.datasets.find(
  dataset => dataset.id === program.markConfigs[id].statisticalReference.dataId
).values;
const mean = { op: "mean" };
const interval = [{ op: "quantile", p: .025 }, { op: "quantile", p: .975 }];
const definitions = [
  ["Box", p => p.createBoxPlot({ id: "plot", x: { field: "group", fieldType: "nominal" },
    y: { field: "value" }, guides: false }), "plot", "y"],
  ["Violin", p => p.createViolinPlot({ id: "plot", x: "group", y: "value", guides: false }), "plot", "y"],
  ["Density", p => p.createDensityPlot({ id: "plot", field: "value", groupBy: "group", guides: false }), "plot", "x"],
  ["ECDF", p => p.createECDFPlot({ id: "plot", field: "value", groupBy: "group", guides: false }), "plot", "x"],
  ["Raincloud", p => p.createRaincloudPlot({ id: "plot", category: "group", value: "value", guides: false }), "plotCloud", "y"],
  ["Gradient", p => p.createGradientPlot({ id: "plot", x: { field: "group", fieldType: "nominal" },
    y: { field: "value" }, guides: false }), "plot", "y"]
];

test("independent observation oracle preserves multiplicity and interpolates percentiles", () => {
  assert.equal(observationMean([0, 0, 12]), 4);
  assert.equal(observationQuantile([0, 10, 20, 30], .25), 7.5);
  assert.equal(observationQuantile([3], .975), 3);
});

for (const [name, create, source, axis] of definitions) {
  test(`${name} bound statistics use original observations and source grouping`, () => {
    const p = create(base()), before = serializeProgram(p);
    for (const groupBy of [undefined, "group", "facet"]) {
      const groups = new Map();
      for (const row of rows) {
        const key = groupBy === undefined ? undefined : row[groupBy];
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row.value);
      }
      const q = p.createStatisticalReference({ source, axis, groupBy, statistic: mean });
      assert.deepEqual(values(q), [...groups].map(([group, observations]) => ({
        ...(groupBy === undefined ? {} : { group }), value: observationMean(observations)
      })));
      const band = p.createStatisticalReference({ source, axis, groupBy, statistics: interval });
      for (const [index, observations] of [...groups.values()].entries()) {
        assert.ok(Math.abs(values(band)[index].lower - observationQuantile(observations, .025)) < 1e-10);
        assert.ok(Math.abs(values(band)[index].upper - observationQuantile(observations, .975)) < 1e-10);
      }
      assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
    }
    assert.equal(serializeProgram(p), before);
  });
  test(`${name} facet-local references retain the original observation population`, () => {
    const q = create(base()).createStatisticalReference({ source, axis })
      .facet({ field: "group", guides: { legend: false } });
    assert.deepEqual(q.compositionSpec.children.map(id => values(q.children[id])[0].value), [10 / 3, 25]);
  });
}

test("box measure revisions refresh references and converge in either authoring order", () => {
  const p = definitions[0][1](base());
  const options = { source: "plot", axis: "y", groupBy: "group" };
  const edit = program => program.editBoxPlot({ target: "plot", y: { field: "revised" } });
  const first = edit(p.createStatisticalReference(options));
  const last = edit(p).createStatisticalReference(options);
  assert.deepEqual(values(first), values(last));
  assert.deepEqual(values(first), [
    { group: "A", value: 4 / 3 }, { group: "B", value: 3.5 }
  ]);
  assertEquivalentMeaning(first.graphicSpec.objects.statisticalReference, last.graphicSpec.objects.statisticalReference);
  assert.equal(values(p.createStatisticalReference(options))[0].value, 10 / 3);
});

test("grouped aggregate line statistics accept singleton partitions without changing source geometry", () => {
  const p = base().createLinePlot({ id: "plot", x: { field: "time", fieldType: "nominal" },
    y: { field: "value", aggregate: "mean" }, color: "group", guides: false });
  const source = p.graphicSpec.objects.plot;
  const q = p.createStatisticalReference({ source: "plot", axis: "y", groupBy: "time" });
  assert.deepEqual(values(q), rows.map(row => ({ group: row.time, value: row.value })));
  assert.deepEqual(q.graphicSpec.objects.plot, source);
});

test("all-bound group strokes keep hidden groups in their shared color domain in either order", () => {
  const p = base().createScatterPlot({ id: "plot", x: "time", y: "value", color: "group", guides: false });
  const reference = program => program.createStatisticalReference({ source: "plot", axis: "y", groupBy: "group" });
  const filter = program => program.filterMarks({ target: "plot", field: "value", op: "gte", value: 20 });
  for (const q of [reference(filter(p)), filter(reference(p))]) {
    assert.deepEqual(values(q), [{ group: "A", value: 10 / 3 }, { group: "B", value: 25 }]);
    const colorId = q.semanticSpec.layers.find(layer => layer.id === "plot").encoding.color.scale;
    assert.deepEqual(new Set(q.resolvedScales[colorId].domain), new Set(["A", "B"]));
    const visibleColor = q.graphicSpec.objects.plot.items[0].properties.fill;
    assert.equal(q.graphicSpec.objects.statisticalReference.items[1].properties.stroke, visibleColor);
    assert.doesNotThrow(() => q.editColorScale({ target: "plot", palette: "set2" }));
  }
});

test("ECDF missing-drop population keeps duplicate observations and excludes missing measurements", () => {
  const p = base([...rows, { value: null, group: "A" }])
    .createECDFPlot({ id: "plot", field: "value", groupBy: "group", guides: false })
    .createStatisticalReference({ source: "plot", axis: "x", groupBy: "group" });
  assert.deepEqual(values(p), [{ group: "A", value: 10 / 3 }, { group: "B", value: 25 }]);
});

test("text references reject unavailable visible-item grain with an actionable atomic error", () => {
  const p = base().createTextPlot({ id: "plot", x: "time", y: "value", text: "group", guides: false });
  const before = serializeProgram(p);
  for (const groupBy of [undefined, "group"]) {
    assert.throws(() => p.createStatisticalReference({
      source: "plot", axis: "x", groupBy, population: "visibleItems"
    }), /visibleItems population is unavailable for text marks. Use boundData/);
    assert.doesNotThrow(() => p.createStatisticalReference({ source: "plot", axis: "x", groupBy }));
  }
  assert.equal(serializeProgram(p), before);
});
