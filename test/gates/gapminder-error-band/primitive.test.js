import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { linearPathCommands } from "../../support/path.js";
import { createGapminderErrorBandPrimitives } from "./primitive.program.js";
import {
  ERROR_BAND_COLORS,
  ERROR_BAND_FIELDS,
  createGapminderErrorBandReferenceValues
} from "./reference-values.js";

function flattenActions(node) {
  return [node, ...(node.children ?? []).flatMap(flattenActions)];
}

test("locks independent year by cluster confidence intervals", () => {
  const values = createGapminderErrorBandReferenceValues(loadGapminder());

  assert.equal(values.rows.length, 66);
  assert.deepEqual(values.clusters, [0, 3, 4, 1, 5, 2]);
  assert.deepEqual(values.scales.x.domain, [
    Date.UTC(1955, 0, 1),
    Date.UTC(2005, 0, 1)
  ]);
  assert.deepEqual(values.scales.y.domain, [30, 90]);
  assert.deepEqual(values.axes.x.ticks.map(tick => tick.label), [
    "1960", "1970", "1980", "1990", "2000"
  ]);
  assert.deepEqual(values.axes.y.ticks.map(tick => tick.value), [
    40, 60, 80
  ]);

  const clusterOne1955 = values.intervals.find(row =>
    row.year === 1955 && row.cluster === 1
  );
  assert.equal(clusterOne1955.count, 19);
  assert.ok(Math.abs(clusterOne1955.mean - 66.48263157894736) < 1e-12);
  assert.ok(Math.abs(clusterOne1955.lower - 63.277896931216496) < 1e-12);
  assert.ok(Math.abs(clusterOne1955.upper - 69.68736622667822) < 1e-12);

  const clusterFour2005 = values.intervals.find(row =>
    row.year === 2005 && row.cluster === 4
  );
  assert.equal(clusterFour2005.count, 9);
  assert.ok(Math.abs(clusterFour2005.mean - 76.18333333333334) < 1e-12);
  assert.ok(Math.abs(clusterFour2005.lower - 71.78316530054533) < 1e-12);
  assert.ok(Math.abs(clusterFour2005.upper - 80.58350136612134) < 1e-12);

  for (const row of values.rows) {
    assert.ok(row[ERROR_BAND_FIELDS.lower] <= row[ERROR_BAND_FIELDS.center]);
    assert.ok(row[ERROR_BAND_FIELDS.center] <= row[ERROR_BAND_FIELDS.upper]);
  }
  for (const series of values.series) {
    const times = series.values.map(row => row.time);
    assert.deepEqual(times, [...times].sort((left, right) => left - right));
  }
});

test("authors the Gapminder vertical error band with raw primitives", () => {
  const gapminder = loadGapminder();
  const values = createGapminderErrorBandReferenceValues(gapminder);
  const program = createGapminderErrorBandPrimitives(gapminder);
  const layer = program.semanticSpec.layers.find(item => item.id === "errorBand");
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === "errorBandIntervalData"
  );
  const paths = program.graphicSpec.objects.errorBand.children;

  assert.equal(layer.mark.type, "area");
  assert.equal(layer.data, "errorBandIntervalData");
  assert.equal(layer.encoding.x.fieldType, "temporal");
  assert.equal(layer.encoding.y.field, ERROR_BAND_FIELDS.lower);
  assert.equal(layer.encoding.y2.field, ERROR_BAND_FIELDS.upper);
  assert.equal(layer.encoding.group.field, "cluster");
  assert.equal(layer.encoding.color.field, "cluster");
  assert.deepEqual(dataset.transform, [values.transform]);
  assert.deepEqual(dataset.values, values.rows);
  assert.equal(paths.length, 6);
  assert.deepEqual(
    paths.map(path => path.properties.commands),
    values.series.map(series => linearPathCommands(series.points, { close: true }))
  );
  assert.deepEqual(
    paths.map(path => path.properties.fill),
    ERROR_BAND_COLORS
  );
  assert.deepEqual(
    paths.map(path => path.properties.opacity),
    [0.2, 0.2, 0.2, 0.2, 0.2, 0.2]
  );

  const order = program.graphicSpec.order;
  assert.ok(order.indexOf("horizontalGridLines") < order.indexOf("errorBand"));
  assert.ok(order.indexOf("errorBand") < order.indexOf("xAxisLine"));
  assert.ok(order.indexOf("errorBand") < order.indexOf("colorLegendSymbols"));
  assert.ok(order.indexOf("colorLegendSymbols") < order.indexOf("chartTitle"));

  const operations = flattenActions(program.trace).map(node => node.op);
  assert.equal(operations.includes("createErrorBand"), false);
  assert.equal(operations.includes("createIntervalData"), false);
  assert.equal(operations.includes("encodeYRange"), false);
});

test("owns input rows and rejects an empty valid dataset", () => {
  const gapminder = loadGapminder();
  const values = createGapminderErrorBandReferenceValues(gapminder);
  const original = structuredClone(values.validGapminder[0]);

  gapminder[0].life_expect = 999;
  assert.deepEqual(values.validGapminder[0], original);
  assert.throws(
    () => createGapminderErrorBandReferenceValues([{ year: null }]),
    /at least one valid gapminder row/
  );
});
