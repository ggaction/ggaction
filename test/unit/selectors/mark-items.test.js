import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { normalizeMarkSelector } from "../../../src/grammar/markSelection.js";
import { resolveMarkItems } from
  "../../../src/materialization/selection/policies/index.js";
import {
  resolveSelectionCreationId,
  resolveStoredSelection
} from "../../../src/materialization/selection/state.js";
import { createCarsDensityArea } from "../../../examples/cars-density-area/program.js";
import { createCarsBoxPlot } from "../../../examples/cars-box-plot/program.js";
import { createCarsHistogram } from "../../../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../../../examples/cars-line-chart/program.js";
import { createCarsScatterplot } from "../../../examples/cars-scatterplot/program.js";
import { createJobsGroupedBar } from "../../../examples/jobs-grouped-bar/program.js";
import { loadCars, loadJobs } from "../../support/data.js";

test("resolves one stable semantic item per point row and graphic child", () => {
  const program = createCarsScatterplot(loadCars());
  const layer = program.semanticSpec.layers.find(candidate =>
    candidate.mark?.type === "point"
  );
  const dataset = program.semanticSpec.datasets.find(candidate =>
    candidate.id === layer.data
  );
  const items = resolveMarkItems(program, layer.id);
  const child = program.graphicSpec.objects[layer.id].items[0];

  assert.equal(items.length, dataset.values.length);
  assert.deepEqual(items[0], {
    key: `${layer.id}/point/0`,
    layer: layer.id,
    markType: "point",
    fields: dataset.values[0],
    channels: {
      x: dataset.values[0].Horsepower,
      y: dataset.values[0].Miles_per_Gallon,
      color: dataset.values[0].Origin
    },
    properties: {
      x: child.properties.x,
      y: child.properties.y,
      fill: child.properties.fill,
      radius: child.properties.radius
    },
    members: [dataset.values[0]],
    graphicIds: [`${layer.id}:0`]
  });
  assert.equal(Object.isFrozen(items[0].members), true);
});

test("resolves histogram bars at final bin-cell grain without pixel values", () => {
  const program = createCarsHistogram(loadCars());
  const layer = program.semanticSpec.layers.find(candidate =>
    candidate.mark?.type === "bar"
  );
  const items = resolveMarkItems(program, layer.id);

  assert.equal(items.length, program.graphicSpec.objects[layer.id].items.length);
  assert.equal(items.every(item => item.markType === "bar"), true);
  assert.equal(items.every(item => Number.isFinite(item.channels.x)), true);
  assert.equal(items.every(item => Number.isFinite(item.channels.x2)), true);
  assert.equal(items.every(item => Number.isFinite(item.channels.y)), true);
  assert.equal(items.every(item => Number.isFinite(item.channels.y2)), true);
  assert.equal(items[0].fields.Displacement, undefined);
  assert.equal(items[0].channels.y, 0);
  assert.equal(items[0].channels.y2, 18);
  assert.notEqual(items[0].properties.y, items[0].channels.y);
  assert.notEqual(items[0].properties.height, items[0].channels.y2);
  assert.equal(
    items.some((item, index) =>
      item.channels.y2 - item.channels.y === program.graphicSpec.objects[layer.id].items[index].properties.height
    ),
    false
  );

  const stacks = resolveMarkItems(program, layer.id, "stack");
  assert.deepEqual(stacks.map(item => [item.channels.x, item.channels.x2]), [
    [50, 100], [100, 150], [150, 200], [200, 250], [250, 300],
    [300, 350], [350, 400], [400, 450], [450, 500]
  ]);
  assert.deepEqual(stacks.map(item => item.channels.y), Array(9).fill(0));
  assert.deepEqual(stacks.map(item => item.channels.y2), [98, 104, 33, 40, 28, 44, 37, 18, 4]);
  assert.equal(stacks[1].graphicIds.length, 3);
  assert.equal(stacks[1].properties.height > items[3].properties.height, true);
  assert.equal(
    items.reduce((sum, item) => sum + item.members.length, 0),
    program.semanticSpec.datasets.find(dataset => dataset.id === layer.data).values.length
  );
});

test("resolves grouped aggregate and ranged bars in concrete cell order", () => {
  const grouped = createJobsGroupedBar(loadJobs());
  const groupedItems = resolveMarkItems(grouped, "bars");
  assert.equal(groupedItems.length, grouped.graphicSpec.objects.bars.items.length);
  assert.equal(groupedItems.every(item => Number.isFinite(item.channels.y)), true);
  assert.equal(groupedItems.every(item => Number.isFinite(item.channels.y2)), true);
  assert.equal(groupedItems.every(item => typeof item.channels.color === "string"), true);
  assert.equal(groupedItems.every(item => item.channels.xOffset === item.channels.color), true);
  assert.throws(
    () => resolveMarkItems(grouped, "bars", "stack"),
    /does not define stacked items/
  );

  const ranged = createCarsBoxPlot(loadCars());
  const rangedItems = resolveMarkItems(ranged, "boxPlot");
  assert.equal(rangedItems.length, ranged.graphicSpec.objects.boxPlot.items.length);
  assert.equal(rangedItems.every(item => Number.isFinite(item.channels.y)), true);
  assert.equal(rangedItems.every(item => Number.isFinite(item.channels.y2)), true);
});

test("resolves line and area paths by unique semantic series", () => {
  const cars = loadCars();
  const line = createCarsLineChart(cars);
  const lineLayer = line.semanticSpec.layers.find(layer => layer.mark?.type === "line");
  const lineItems = resolveMarkItems(line, lineLayer.id);
  assert.deepEqual(
    lineItems.map(item => item.fields.Origin),
    ["USA", "Europe", "Japan"]
  );
  assert.equal(lineItems.every(item => item.channels.x === undefined), true);
  assert.equal(lineItems.every(item => item.channels.color === item.fields.Origin), true);

  const area = createCarsDensityArea(cars);
  const areaLayer = area.semanticSpec.layers.find(layer => layer.mark?.type === "area");
  const areaItems = resolveMarkItems(area, areaLayer.id);
  assert.deepEqual(
    areaItems.map(item => item.fields.Origin),
    ["USA", "Europe", "Japan"]
  );
  assert.equal(areaItems.every(item => item.graphicIds[0].startsWith(`${areaLayer.id}:`)), true);
});

test("resolves one rule item per final semantic rule", () => {
  const program = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: [
      { group: "A", value: 10 },
      { group: "B", value: 30 }
    ] })
    .createRuleMark()
    .encodeX({ field: "value", fieldType: "quantitative" });
  const items = resolveMarkItems(program, "rule");

  assert.deepEqual(items.map(item => item.fields.group), ["A", "B"]);
  assert.deepEqual(items.map(item => item.channels.x), [10, 30]);
  assert.deepEqual(items.map(item => item.graphicIds), [["rule:0"], ["rule:1"]]);
  assert.deepEqual(items.map(item => item.properties.x1), [
    program.graphicSpec.objects.rule.items[0].properties.x1,
    program.graphicSpec.objects.rule.items[1].properties.x1
  ]);
  assert.throws(
    () => resolveMarkItems(program, "rule", "stack"),
    /does not support stack selection grain/
  );
});

test("stores immutable selection intent and reevaluates current mark items", () => {
  const base = createCarsScatterplot(loadCars());
  const selectorInput = {
    field: "Horsepower",
    op: "max",
    groupBy: "Origin"
  };
  const id = resolveSelectionCreationId(base, undefined, "points");
  const selected = base
    ._withSelectionConfig(id, {
      target: "points",
      selector: normalizeMarkSelector(selectorInput)
    })
    ._withContext({ currentSelection: id });
  selectorInput.groupBy = "Cylinders";

  const resolved = resolveStoredSelection(selected);
  assert.equal(id, "pointsSelection");
  assert.equal(resolved.definition.selector.groupBy[0], "Origin");
  assert.deepEqual(
    resolved.items
      .filter(item => resolved.keys.includes(item.key))
      .map(item => item.fields.Origin),
    ["USA", "Europe", "Japan"]
  );
  assert.equal(resolved.keys.length, 3);
  assert.equal(selected.graphicSpec, base.graphicSpec);
  assert.equal(selected.trace, base.trace);

  const resized = selected.editCanvas({ width: 760 });
  assert.deepEqual(resolveStoredSelection(resized).keys, resolved.keys);
  assert.throws(
    () => resolveSelectionCreationId(selected, undefined, "points"),
    /already exists/
  );
});

test("rejects a multi-valued path field or channel at series grain", () => {
  const base = createCarsLineChart(loadCars());
  const selected = base._withSelectionConfig("xSelection", {
    target: "trends",
    selector: normalizeMarkSelector({ channel: "x", op: "max" })
  });
  assert.throws(
    () => resolveStoredSelection(selected, "xSelection"),
    /not uniquely defined/
  );
});

test("rejects incomplete, unknown, and ambiguous stored selection state", () => {
  const emptyPoint = chart()
    .createData({ values: [{ x: 1 }] })
    .createPointMark();
  assert.throws(
    () => resolveMarkItems(emptyPoint, "point"),
    /incomplete for selection/
  );
  assert.throws(() => resolveMarkItems(emptyPoint, "missing"), /Unknown mark target/);
  assert.throws(() => resolveStoredSelection(emptyPoint), /existing selection/);

  const first = emptyPoint
    ._withSelectionConfig("first", {
      target: "point",
      selector: normalizeMarkSelector({ field: "x", op: "eq", value: 1 })
    })
    ._withSelectionConfig("second", {
      target: "point",
      selector: normalizeMarkSelector({ field: "x", op: "eq", value: 2 })
    });
  assert.throws(() => resolveStoredSelection(first), /ambiguous/);
  assert.throws(() => resolveStoredSelection(first, "missing"), /Unknown selection/);
});
