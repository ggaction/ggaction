import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { observationMean, observationQuantile } from "../../../oracles/observation-statistics.js";

const rows = [
  { category: "A", value: 1, before: 10, cohort: "P", time: 0 },
  { category: "A", value: 3, before: 30, cohort: "Q", time: 1 },
  { category: "A", value: 8, before: 80, cohort: "P", time: 3 },
  { category: "B", value: 20, before: 200, cohort: "Q", time: 8 }
];
const base = () => chart().createCanvas({ width: 600, height: 400, margin: 60 })
  .createData({ id: "rows", values: rows });
const statistics = (program, id = "statisticalReference") =>
  program.semanticSpec.datasets.find(dataset =>
    dataset.id === program.markConfigs[id].statisticalReference.dataId).values;
const add = (program, source, axis, options = {}) =>
  program.createStatisticalReference({ source, axis, ...options });

for (const method of ["createDotPlot", "createLollipopPlot", "createDumbbellPlot"]) {
  for (const orientation of ["horizontal", "vertical"]) {
    test(`${method} ${orientation} statistics resolve original endpoint observations`, () => {
      const p = base()[method]({
        id: "plot", category: "category", summary: "mean", orientation, guides: false,
        ...(method === "createDumbbellPlot" ? { start: "before", end: "value" } : { value: "value" })
      });
      const axis = orientation === "horizontal" ? "x" : "y";
      const before = serializeProgram(p);
      const bound = add(p, "plot", axis);
      assert.equal(statistics(bound)[0].value, observationMean(rows.map(row => row.value)));
      assert.deepEqual(statistics(add(p, "plot", axis, { population: "visibleItems" })), [{ value: 12 }]);
      const grouped = add(p, "plot", axis, { groupBy: "cohort" });
      assert.deepEqual(statistics(grouped), [
        { group: "P", value: 4.5 }, { group: "Q", value: 11.5 }
      ]);
      const interval = add(p, "plot", axis, {
        statistics: [{ op: "quantile", p: .025 }, { op: "quantile", p: .975 }]
      });
      assert.ok(Math.abs(statistics(interval)[0].lower -
        observationQuantile(rows.map(row => row.value), .025)) < 1e-12);
      assert.ok(Math.abs(statistics(interval)[0].upper -
        observationQuantile(rows.map(row => row.value), .975)) < 1e-12);
      if (method === "createDumbbellPlot") {
        assert.equal(statistics(add(p, "plotStart", axis))[0].value,
          observationMean(rows.map(row => row.before)));
      }
      assert.equal(serializeProgram(p), before);
      assert.deepEqual(deserializeProgram(serializeProgram(grouped)).graphicSpec, grouped.graphicSpec);
    });
  }
}

test("endpoint statistics partition original observations inside facets", () => {
  const p = base().createDotPlot({ id: "plot", category: "category", value: "value",
    summary: "mean", guides: false })
    .createStatisticalReference({ source: "plot", axis: "x" })
    .facet({ field: "category", guides: { legend: false } });
  assert.deepEqual(p.compositionSpec.children.map(id => statistics(p.children[id])[0].value), [4, 20]);
});

test("endpoint edits preserve references, styles and source roles in either action order", () => {
  for (const method of ["createDotPlot", "createLollipopPlot", "createDumbbellPlot"]) {
    const p = base()[method]({ id: "plot", category: "category", summary: "mean",
      ...(method === "createDumbbellPlot" ? { start: "before", end: "value" } : { value: "value" }) });
    const source = method === "createDumbbellPlot" ? "plotStart" : "plot";
    const reference = program => program.createStatisticalReference({
      source, axis: program.markConfigs.plot.endpointPlot.orientation === "vertical" ? "y" : "x",
      groupBy: "cohort", stroke: "#334455", strokeWidth: 4
    });
    const edit = program => program.editEndpointPlot({ target: "plot", orientation: "vertical",
      ...(method === "createDumbbellPlot" ? { start: "value", end: "before" } : { value: "before" }) });
    const first = edit(reference(p));
    const last = reference(edit(p));
    assert.deepEqual(statistics(first), statistics(last));
    assert.equal(first.markConfigs.statisticalReference.statisticalReference.source, source);
    assert.equal(first.markConfigs.statisticalReference.statisticalReference.axis, "y");
    assert.deepEqual(first.graphicSpec.objects.statisticalReference, last.graphicSpec.objects.statisticalReference);
    assert.equal(first.graphicSpec.objects.statisticalReference.items[0].properties.strokeWidth, 4);
    assert.equal(first.graphicSpec.objects.statisticalReference.items[0].properties.stroke, "#334455");
    assert.deepEqual(deserializeProgram(serializeProgram(first)).graphicSpec, first.graphicSpec);
  }
});

test("Horizon X statistics use source observations instead of repeated folded band samples", () => {
  const p = base().createHorizonPlot({ id: "plot", x: "time", y: "value", bands: 4, guides: false });
  const q = add(p, "plot", "x", { groupBy: "cohort" });
  assert.deepEqual(statistics(q), [{ group: "P", value: 1.5 }, { group: "Q", value: 4.5 }]);
  const interval = add(p, "plot", "x", {
    statistics: [{ op: "quantile", p: .025 }, { op: "quantile", p: .975 }]
  });
  assert.deepEqual(statistics(interval), [{
    lower: observationQuantile(rows.map(row => row.time), .025),
    upper: observationQuantile(rows.map(row => row.time), .975)
  }]);
  assert.deepEqual(statistics(q.editHorizon({ target: "plot", bands: 2 })), statistics(q));
});

test("Raincloud rebuild keeps inferred axis titles independent of temporarily detached statistics", () => {
  const p = base().createRaincloudPlot({ id: "plot", category: "category", value: "value",
    points: { type: "strip" } })
    .createStatisticalReference({ source: "plotCloud", axis: "y", groupBy: "cohort" });
  const q = p.editRaincloudPlot({ target: "plot", value: "before" });
  assert.deepEqual(statistics(q), [{ group: "P", value: 45 }, { group: "Q", value: 115 }]);
  assert.equal(q.graphicSpec.objects.yAxisTitle.properties.text, "before");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
});

test("Horizon folded Y rejects numerical references atomically and temporal X remains nonnumeric", () => {
  const p = base().createHorizonPlot({ id: "plot", x: "time", y: "value", guides: false });
  const before = serializeProgram(p);
  for (const population of ["boundData", "visibleItems"]) {
    assert.throws(() => add(p, "plot", "y", { population }), /Horizon folded Y.*quantitative X/);
  }
  assert.equal(serializeProgram(p), before);
  const temporal = chart().createCanvas({ width: 600, height: 400, margin: 60 })
    .createData({ id: "rows", values: rows.map(row => ({ ...row, time: 2020 + row.time })) })
    .createHorizonPlot({ id: "plot", x: { field: "time", fieldType: "temporal", temporalUnit: "year" },
      y: "value", guides: false });
  assert.throws(() => add(temporal, "plot", "x"), /quantitative scaled encoding/);
});
