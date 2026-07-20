import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

const rows = Object.freeze([
  Object.freeze({ time: 0, value: -2, category: "A" }),
  Object.freeze({ time: 1, value: 2, category: "A" }),
  Object.freeze({ time: 0, value: -8, category: "B" }),
  Object.freeze({ time: 1, value: 8, category: "B" })
]);

function horizon() {
  return chart()
    .createCanvas({ width: 320, height: 200, margin: 30 })
    .createData({ id: "source", values: rows })
    .createAreaMark()
    .encodeHorizon({
      x: "time",
      y: "value",
      groupBy: "category",
      bands: 3
    });
}

test("revises Horizon options through a new derived dataset", () => {
  const before = horizon();
  const previousGraphic = before.graphicSpec.objects.area;
  const edited = before.editHorizon({
    baseline: 1,
    bands: 2,
    palette: { positive: "greens" }
  });
  const layer = edited.semanticSpec.layers[0];
  const derived = edited.semanticSpec.datasets.find(
    dataset => dataset.id === layer.data
  );

  assert.equal(layer.data, "areaHorizonDataRevision1");
  assert.equal(derived.transform[0].baseline, 1);
  assert.equal(derived.transform[0].bands, 2);
  assert.equal(edited.semanticSpec.datasets.some(
    dataset => dataset.id === "areaHorizonData"
  ), false);
  assert.equal(before.semanticSpec.datasets.some(
    dataset => dataset.id === "areaHorizonData"
  ), true);
  assert.notEqual(edited.graphicSpec.objects.area, previousGraphic);
  assert.deepEqual(
    edited.semanticSpec.scales.find(scale => scale.id === "areaHorizonColor").domain,
    ["negative:0", "negative:1", "positive:0", "positive:1"]
  );
  assert.deepEqual(
    edited.trace.children.at(-1).children.slice(0, 3).map(node => node.op),
    ["createHorizonData", "rebindLayerData", "releaseDerivedData"]
  );
});

test("supports source, field, group, and empty-result revisions", () => {
  const withReplacement = horizon().createData({
    id: "replacement",
    values: [
      { date: "2000-01-01", amount: 5 },
      { date: "2001-01-01", amount: 5 }
    ]
  });
  const edited = withReplacement.editHorizon({
    source: "replacement",
    x: { field: "date", fieldType: "temporal" },
    y: "amount",
    groupBy: false,
    baseline: 5
  });
  const layer = edited.semanticSpec.layers[0];
  const dataset = edited.semanticSpec.datasets.find(item => item.id === layer.data);

  assert.equal(dataset.source, "replacement");
  assert.deepEqual(dataset.transform[0].x, {
    field: "date",
    fieldType: "temporal"
  });
  assert.equal(dataset.transform[0].groupBy, undefined);
  assert.equal(edited.semanticSpec.scales.find(scale => scale.id === "x").type, "time");
  assert.equal(edited.graphicSpec.objects.area.items.length, 0);
});

test("preserves area selection and highlight consumers across revision", () => {
  const highlighted = horizon().highlightMarks({
    target: "area",
    select: { field: "areaHorizonSign", op: "eq", value: "positive" },
    fill: "#111111",
    dimOthers: { opacity: 0.2 }
  });
  const edited = highlighted.editHorizon({ baseline: 1 });

  assert.equal(edited.materializationConfigs.selections.areaSelection.target, "area");
  assert.equal(edited.graphicSpec.objects.area.items.some(
    item => item.properties.fill === "#111111"
  ), true);
  assert.equal(edited.graphicSpec.objects.area.items.some(
    item => item.properties.opacity === 0.2
  ), true);
});

test("replays shared and independent Horizon extents in facet cells", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 160, margin: 24 })
    .createData({ id: "source", values: rows })
    .createAreaMark()
    .encodeHorizon({
      x: "time",
      y: "value",
      groupBy: "category",
      bands: 2
    });
  const shared = base.facet({ field: "category" });
  const independent = base.facet({
    field: "category",
    scales: { y: "independent" }
  });
  const extents = program => Object.values(program.children).map(child =>
    child.semanticSpec.datasets.find(dataset =>
      dataset.id === child.semanticSpec.layers[0].data
    ).transform[0].resolved.extents[0].extent
  );

  assert.deepEqual(extents(shared), [8, 8]);
  assert.deepEqual(extents(independent), [2, 8]);
});

test("rejects invalid Horizon edits before changing prior state", () => {
  const before = horizon();
  assert.throws(() => before.editHorizon(), /requires at least one/);
  assert.throws(() => before.editHorizon({ bands: 0 }), /positive integer/);
  assert.throws(
    () => before.editHorizon({ x: { field: "time", scale: { id: "other" } } }),
    /cannot change its id/
  );
  assert.equal(before.semanticSpec.datasets.at(-1).id, "areaHorizonData");
});
