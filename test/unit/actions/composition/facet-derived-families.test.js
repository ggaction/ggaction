import assert from "node:assert/strict";
import test from "node:test";

import { createCarsBoxPlot } from
  "../../../../examples/cars-box-plot/program.js";
import { createCarsDensityArea } from
  "../../../../examples/cars-density-area/program.js";
import { createGapminderErrorBand } from
  "../../../../examples/gapminder-error-band/program.js";
import { loadCars, loadGapminder } from "../../../support/data.js";

function transformDatasets(program, type) {
  return program.semanticSpec.datasets.filter(
    dataset => dataset.transform?.[0]?.type === type
  );
}

function replayOperations(child) {
  return child.trace.children.at(-1).children.filter(
    node => node.op === "replayDerivedData"
  );
}

test("replays requested density intent from each facet partition", () => {
  const source = createCarsDensityArea(loadCars());
  const faceted = source.facet({
    field: "Origin",
    columns: 3,
    guides: { legend: false }
  });

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const densities = transformDatasets(child, "density");
    const replayed = densities.find(dataset => dataset.id.startsWith(`${id}-`));
    assert.ok(replayed);
    assert.equal(replayed.transform[0].bandwidth, 0.6);
    assert.equal(Number.isFinite(replayed.transform[0].resolved.bandwidth), true);
    assert.equal(replayed.values.length, 100);
    assert.equal(replayOperations(child).length, 1);
    assert.equal(child.semanticSpec.layers[0].data, replayed.id);
  }
  assert.equal(source.semanticSpec.layers[0].data, "densitiesDensityData");
});

test("replays interval summaries before rebinding every error-band layer", () => {
  const source = createGapminderErrorBand(loadGapminder());
  const faceted = source.facet({
    field: "cluster",
    columns: 3,
    guides: { legend: false }
  });

  assert.equal(faceted.compositionSpec.children.length, 6);
  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const intervals = transformDatasets(child, "interval");
    const replayed = intervals.find(dataset => dataset.id.startsWith(`${id}-`));
    assert.ok(replayed);
    assert.equal(replayed.values.length > 0, true);
    assert.equal(replayOperations(child).length, 1);
    assert.equal(
      child.semanticSpec.layers.every(layer => layer.data === replayed.id),
      true
    );
  }
});

test("replays box summaries and outliers as sibling derived branches", () => {
  const source = createCarsBoxPlot(loadCars());
  const faceted = source.facet({
    field: "Origin",
    columns: 3,
    guides: { legend: false }
  });

  assert.equal(faceted.compositionSpec.children.length, 3);
  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const summary = transformDatasets(child, "boxSummary")
      .find(dataset => dataset.id.startsWith(`${id}-`));
    const outliers = transformDatasets(child, "boxOutlier")
      .find(dataset => dataset.id.startsWith(`${id}-`));
    assert.ok(summary);
    assert.ok(outliers);
    assert.equal(summary.values.length, 1);
    assert.equal(replayOperations(child).length, 2);
    assert.equal(
      child.semanticSpec.layers.filter(layer => layer.id !== "boxPlotOutliers")
        .every(layer => layer.data === summary.id),
      true
    );
    assert.equal(
      child.semanticSpec.layers.find(layer => layer.id === "boxPlotOutliers").data,
      outliers.id
    );
  }
});

