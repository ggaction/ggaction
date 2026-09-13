import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

function multiply(constant) {
  return {
    op: "multiply",
    left: { field: "value" },
    right: { constant }
  };
}

function referenceValue(program, id) {
  const dataId = program.markConfigs[id].statisticalReference.dataId;
  return program.semanticSpec.datasets.find(dataset => dataset.id === dataId)
    .values[0].value;
}

function labelTexts(program) {
  return program.graphicSpec.objects.labels.items.map(item =>
    item.properties.text
  );
}

test("replays derived data through filters, selected labels, references, layout, and highlights", () => {
  const original = chart()
    .createCanvas({ width: 300, height: 220, margin: 30 })
    .createData({ id: "raw", values: [
      { category: "A", value: 1 },
      { category: "B", value: 5 },
      { category: "C", value: 3 }
    ] })
    .createComputedData({
      id: "scaled",
      source: "raw",
      as: "score",
      expression: multiply(1)
    })
    .createBarPlot({
      id: "bars",
      data: "scaled",
      x: "category",
      y: { field: "score", aggregate: "sum" },
      guides: false
    })
    .selectMarks({
      id: "high",
      target: "bars",
      field: "score",
      op: "max"
    })
    .createMarkLabels({
      id: "labels",
      source: "bars",
      field: "score",
      selection: "high",
      placement: { anchor: "outsideEnd" },
      layout: { axis: "y" }
    })
    .createReferenceLine({
      id: "bound",
      source: "bars",
      axis: "y",
      population: "boundData",
      statistic: { op: "mean" }
    })
    .createReferenceLine({
      id: "visible",
      source: "bars",
      axis: "y",
      population: "visibleItems",
      statistic: { op: "mean" }
    })
    .filterMarks({
      target: "bars",
      field: "score",
      op: "gte",
      value: 3
    })
    .highlightMarks({ selection: "high", fill: "#dc2626" });

  assert.equal(referenceValue(original, "bound"), 3);
  assert.equal(referenceValue(original, "visible"), 4);
  assert.deepEqual(labelTexts(original), ["5"]);
  assert.deepEqual(
    original.graphicSpec.objects.bars.items.map(item => item.properties.fill),
    ["#4c78a8", "#dc2626"]
  );
  assert.equal(
    original.materializationConfigs.labelLayouts.labels.resolution.overlapAfter,
    0
  );

  const revised = original.editComputedData({
    target: "scaled",
    expression: multiply(2),
    dependents: "recompute"
  });
  assert.equal(referenceValue(revised, "bound"), 6);
  assert.equal(referenceValue(revised, "visible"), 8);
  assert.deepEqual(labelTexts(revised), ["10"]);
  assert.deepEqual(
    revised.graphicSpec.objects.bars.items.map(item => item.properties.fill),
    ["#4c78a8", "#dc2626"]
  );
  assert.match(
    revised.materializationConfigs.marks.bars.markFilter.source,
    /^scaledComputedDataRevision/
  );
  assert.match(
    revised.materializationConfigs.marks.bars.markFilter.dataset,
    /^barsFilteredDataDerivedDataRevision/
  );
  assert.equal(referenceValue(original, "bound"), 3);
  assert.deepEqual(labelTexts(original), ["5"]);

  const resized = revised.editCanvas({ width: 360, height: 260 });
  assert.equal(referenceValue(resized, "bound"), 6);
  assert.equal(referenceValue(resized, "visible"), 8);
  assert.deepEqual(labelTexts(resized), ["10"]);

  const removed = resized.removeMark({ target: "bars" });
  assert.deepEqual(removed.semanticSpec.layers, []);
  assert.deepEqual(Object.keys(removed.graphicSpec.objects), ["canvas", "plot-main"]);
  assert.equal(
    removed.semanticSpec.datasets.some(dataset =>
      dataset.id.endsWith("-statistical-reference-data")
    ),
    false
  );
  assert.deepEqual(removed.materializationConfigs.marks, {});
  assert.equal(removed.materializationConfigs.selections, undefined);
  assert.equal(removed.materializationConfigs.highlights, undefined);
  assert.equal(removed.materializationConfigs.labelLayouts, undefined);
});
