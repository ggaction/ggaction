import assert from "node:assert/strict";
import test from "node:test";

import { createCarsOriginDonut } from
  "../../../../examples/cars-origin-donut/program.js";
import { createGapminderRadialBars } from
  "../../../../examples/gapminder-radial-bars/program.js";
import { createGapminderPopulationDonut } from
  "../../../../examples/gapminder-population-donut/program.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";
import { loadCars, loadGapminder } from "../../../support/data.js";

test("selects count sectors at their final visual grain", () => {
  const base = createCarsOriginDonut(loadCars());
  const selected = base.selectMarks({
    target: "arc",
    field: "Origin",
    op: "eq",
    value: "Japan"
  });
  const resolved = resolveStoredSelection(selected);

  assert.deepEqual(resolved.keys, ["arc/sector/2"]);
  assert.deepEqual(resolved.items.map(item => item.channels.theta), [
    "USA", "Europe", "Japan"
  ]);
  assert.equal(resolved.items[2].members.length, 79);
  assert.equal(selected.graphicSpec, base.graphicSpec);
});

test("selects weighted sectors at the grouped source-member grain", () => {
  const base = createGapminderPopulationDonut(loadGapminder());
  const selected = base.selectMarks({
    target: "arc",
    channel: "theta",
    op: "eq",
    value: 4
  });
  const resolved = resolveStoredSelection(selected);
  const item = resolved.items.find(candidate => resolved.keys.includes(candidate.key));

  assert.deepEqual(resolved.keys, ["arc/sector/4"]);
  assert.equal(item.channels.theta, 4);
  assert.equal(item.members.every(row => row.cluster === 4), true);
  assert.equal(item.members.length > 1, true);
  assert.equal(selected.graphicSpec, base.graphicSpec);
});

test("selects the largest radial sector by semantic radius", () => {
  const selected = createGapminderRadialBars(loadGapminder()).selectMarks({
    target: "arc",
    channel: "radius",
    op: "max"
  });
  const resolved = resolveStoredSelection(selected);
  const item = resolved.items.find(candidate => resolved.keys.includes(candidate.key));

  assert.equal(resolved.keys.length, 1);
  assert.equal(item.channels.radius, Math.max(
    ...resolved.items.map(candidate => candidate.channels.radius)
  ));
  assert.equal(item.members.length, 1);
});

test("highlights arc paths and matching legend symbols without dimming labels", () => {
  const highlighted = createCarsOriginDonut(loadCars()).highlightMarks({
    target: "arc",
    select: { field: "Origin", op: "eq", value: "Japan" },
    fill: "#dc2626",
    stroke: "#7f1d1d",
    strokeWidth: 2,
    dimOthers: { opacity: 0.2 }
  });
  const paths = highlighted.graphicSpec.objects.arc.items;
  const symbols = highlighted.graphicSpec.objects.colorLegendSymbols.items;
  const labels = highlighted.graphicSpec.objects.colorLegendLabels.items;

  assert.equal(paths.at(-1).properties.fill, "#dc2626");
  assert.equal(paths.at(-1).properties.stroke, "#7f1d1d");
  assert.equal(paths.slice(0, -1).every(item => item.properties.opacity === 0.2), true);
  assert.equal(symbols[2].properties.fill, "#dc2626");
  assert.equal(symbols.slice(0, 2).every(item => item.properties.opacity === 0.2), true);
  assert.equal(labels.every(item => item.properties.opacity === undefined), true);
});

test("reapplies arc highlights after geometry rematerialization", () => {
  const highlighted = createGapminderRadialBars(loadGapminder()).highlightMarks({
    target: "arc",
    select: { channel: "radius", op: "max" },
    fill: "#dc2626",
    dimOthers: true
  });
  const resized = highlighted.editCanvas({ width: 840 });

  assert.deepEqual(resolveStoredSelection(resized).keys, ["arc/sector/9"]);
  assert.equal(resized.graphicSpec.objects.arc.items.at(-1).properties.fill, "#dc2626");
  assert.equal(resized.graphicSpec.objects.arc.items.slice(0, -1).every(
    item => item.properties.opacity === 0.25
  ), true);
});

test("filters count arcs through selected sector members", () => {
  const filtered = createCarsOriginDonut(loadCars()).filterMarks({
    target: "arc",
    field: "Origin",
    op: "eq",
    value: "Europe"
  });

  assert.equal(filtered.semanticSpec.datasets.at(-1).values.length, 73);
  assert.equal(filtered.graphicSpec.objects.arc.items.length, 1);
  assert.deepEqual(filtered.resolvedScales.theta.domain, ["Europe"]);
  assert.deepEqual(filtered.graphicSpec.objects.colorLegendLabels.items.map(
    item => item.properties.text
  ), ["Europe"]);
});
