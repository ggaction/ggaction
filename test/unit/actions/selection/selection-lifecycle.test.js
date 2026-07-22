import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";
import { createCarsDensityArea } from
  "../../../../examples/cars-density-area/program.js";
import { createCarsHistogram } from
  "../../../../examples/cars-histogram/program.js";
import { createCarsLineChart } from
  "../../../../examples/cars-line-chart/program.js";
import { createCarsOriginDonut } from
  "../../../../examples/cars-origin-donut/program.js";
import { loadCars } from "../../../support/data.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", label: "low" }),
  Object.freeze({ x: 5, y: 4, group: "A", label: "high" }),
  Object.freeze({ x: 3, y: 6, group: "B", label: "middle" }),
  Object.freeze({ x: 8, y: 8, group: "B", label: "top" })
]);

function pointProgram() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x", scale: { nice: false, zero: false } })
    .encodeY({ field: "y", scale: { nice: false, zero: false } });
}

function legendPointProgram() {
  return chart()
    .createCanvas({
      width: 360,
      height: 220,
      margin: { top: 20, right: 120, bottom: 40, left: 40 }
    })
    .createData({ values: rows })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createLegend({ target: "point" });
}

test("replaces a complete selector while preserving selection identity and target", () => {
  const original = pointProgram().selectMarks({
    id: "extreme",
    field: "x",
    op: "max"
  });
  const options = Object.freeze({
    selection: "extreme",
    field: "label",
    op: "oneOf",
    values: Object.freeze(["low", "top"])
  });
  const edited = original.editMarkSelection(options);

  assert.deepEqual(edited.materializationConfigs.selections.extreme, {
    target: "point",
    selector: {
      grain: "item",
      field: "label",
      op: "oneOf",
      values: ["low", "top"]
    }
  });
  assert.deepEqual(resolveStoredSelection(edited).keys, [
    "point/point/0",
    "point/point/3"
  ]);
  assert.equal(edited.context.currentSelection, "extreme");
  assert.equal(edited.graphicSpec, original.graphicSpec);
  assert.equal(original.materializationConfigs.selections.extreme.selector.op, "max");
  assert.deepEqual(options.values, ["low", "top"]);
});

test("supports every selector operator and source through complete replacement", () => {
  const base = pointProgram().selectMarks({
    id: "active",
    field: "x",
    op: "max"
  });
  const cases = [
    [{ field: "x", op: "eq", value: 5 }, ["point/point/1"]],
    [{ field: "x", op: "neq", value: 5 }, ["point/point/0", "point/point/2", "point/point/3"]],
    [{ channel: "x", op: "gt", value: 5 }, ["point/point/3"]],
    [{ channel: "x", op: "gte", value: 5 }, ["point/point/1", "point/point/3"]],
    [{ property: "x", op: "lt", value: 120 }, ["point/point/0", "point/point/2"]],
    [{ field: "x", op: "lte", value: 3 }, ["point/point/0", "point/point/2"]],
    [{ field: "label", op: "oneOf", values: ["high", "top"] }, ["point/point/1", "point/point/3"]],
    [{ field: "x", op: "range", min: 1, max: 8, inclusive: false }, ["point/point/1", "point/point/2"]],
    [{ field: "x", op: "min", count: 2 }, ["point/point/0", "point/point/2"]],
    [{ field: "x", op: "max", count: 1, groupBy: "group", ties: "all" }, ["point/point/1", "point/point/3"]]
  ];
  for (const [selector, keys] of cases) {
    const edited = base.editMarkSelection({
      selection: "active",
      ...selector
    });
    assert.deepEqual(resolveStoredSelection(edited, "active").keys, keys);
  }

  const histogram = createCarsHistogram(loadCars()).selectMarks({
    id: "bars",
    target: "bars",
    channel: "y2",
    op: "max"
  });
  const stack = histogram.editMarkSelection({
    selection: "bars",
    grain: "stack",
    channel: "y2",
    op: "max"
  });
  assert.deepEqual(resolveStoredSelection(stack, "bars").keys, ["bars/stack/1"]);
  assert.equal(stack.materializationConfigs.selections.bars.target, "bars");
});

test("replays edited selections and remaining highlights from a clean baseline", () => {
  const highlighted = pointProgram()
    .selectMarks({ id: "low", field: "x", op: "max" })
    .selectMarks({ id: "high", field: "x", op: "max" })
    .highlightMarks({
      selection: "low",
      color: "#2563eb",
      size: 2,
      dimOthers: false,
      bringToFront: false
    })
    .highlightMarks({
      selection: "high",
      color: "#dc2626",
      size: 3,
      dimOthers: { opacity: 0.2 }
    });
  const edited = highlighted.editMarkSelection({
    selection: "high",
    field: "x",
    op: "min",
    count: 2
  });
  const items = edited.graphicSpec.objects.point.items;

  assert.deepEqual(resolveStoredSelection(edited, "high").keys, [
    "point/point/0",
    "point/point/2"
  ]);
  assert.equal(items.slice(-2).every(item => item.properties.fill === "#dc2626"), true);
  assert.equal(items.some(item => item.properties.fill === "#2563eb"), true);
  assert.deepEqual(Object.keys(edited.materializationConfigs.highlights), ["low", "high"]);

  const resized = edited.editCanvas({ width: 300 });
  assert.deepEqual(resolveStoredSelection(resized, "high").keys, [
    "point/point/0",
    "point/point/2"
  ]);
  assert.equal(
    resized.graphicSpec.objects.point.items.slice(-2).every(
      item => item.properties.fill === "#dc2626"
    ),
    true
  );
});

test("removes only one highlight and restores categorical legend symbols", () => {
  const base = legendPointProgram();
  const highlighted = base
    .selectMarks({ id: "groupA", field: "group", op: "eq", value: "A" })
    .selectMarks({ id: "highest", field: "x", op: "max" })
    .highlightMarks({
      selection: "groupA",
      color: "#2563eb",
      dimOthers: { opacity: 0.2 },
      bringToFront: false
    })
    .highlightMarks({
      selection: "highest",
      color: "#dc2626",
      size: 2,
      dimOthers: false
    });
  const removed = highlighted.removeMarkHighlight({ selection: "groupA" });

  assert.notEqual(removed.materializationConfigs.selections.groupA, undefined);
  assert.equal(removed.materializationConfigs.highlights.groupA, undefined);
  assert.notEqual(removed.materializationConfigs.highlights.highest, undefined);
  assert.equal(
    removed.graphicSpec.objects.point.items.at(-1).properties.fill,
    "#dc2626"
  );
  assert.deepEqual(
    removed.graphicSpec.objects.seriesLegendSymbols,
    base.graphicSpec.objects.seriesLegendSymbols
  );
  assert.deepEqual(
    removed.graphicSpec.objects.seriesLegendLabels,
    base.graphicSpec.objects.seriesLegendLabels
  );
});

test("restores the clean baseline for every selectable mark family", () => {
  const cars = loadCars();
  const rect = chart()
    .createCanvas({ width: 260, height: 180, margin: 20 })
    .createData({ values: rows })
    .createRectMark()
    .encodeX({ field: "group", fieldType: "nominal" })
    .encodeY({ field: "label", fieldType: "nominal" });
  const rule = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: rows })
    .createRuleMark()
    .encodeX({ field: "x", fieldType: "quantitative" });
  const cases = [
    [pointProgram(), "point", { field: "x", op: "max" }, { color: "red", size: 2 }],
    [createCarsHistogram(cars), "bars", { channel: "y2", op: "max" }, { fill: "red" }],
    [rect, "rect", { field: "x", op: "max" }, { fill: "red" }],
    [createCarsLineChart(cars), "trends", { field: "Origin", op: "eq", value: "Japan" }, { stroke: "red" }],
    [createCarsDensityArea(cars), "densities", { field: "Origin", op: "eq", value: "Japan" }, { fill: "red" }],
    [createCarsOriginDonut(cars), "arc", { field: "Origin", op: "eq", value: "Japan" }, { fill: "red" }],
    [rule, "rule", { field: "x", op: "max" }, { stroke: "red" }]
  ];

  for (const [base, target, selector, style] of cases) {
    const highlighted = base.highlightMarks({
      target,
      select: selector,
      ...style,
      dimOthers: { opacity: 0.2 }
    });
    const selection = highlighted.context.currentSelection;
    const removed = highlighted.removeMarkHighlight({ selection });
    assert.deepEqual(removed.graphicSpec.objects[target], base.graphicSpec.objects[target]);
    assert.notEqual(removed.materializationConfigs.selections[selection], undefined);
    assert.equal(removed.materializationConfigs.highlights?.[selection], undefined);
  }
});

test("removes a dependent highlight before releasing its selection", () => {
  const highlighted = pointProgram().highlightMarks({
    id: "highest",
    select: { field: "x", op: "max" },
    color: "red",
    size: 3,
    dimOthers: true
  });
  const removed = highlighted.removeMarkSelection({ selection: "highest" });

  assert.equal(removed.materializationConfigs.selections, undefined);
  assert.equal(removed.materializationConfigs.highlights, undefined);
  assert.equal(removed.context.currentSelection, undefined);
  assert.deepEqual(
    removed.graphicSpec.objects.point,
    pointProgram().graphicSpec.objects.point
  );
  assert.deepEqual(
    removed.trace.children.at(-1).children.map(child => child.op),
    ["removeMarkHighlight"]
  );
  assert.notEqual(highlighted.materializationConfigs.selections.highest, undefined);
});

test("rejects missing, ambiguous, invalid, and empty lifecycle requests atomically", () => {
  const base = pointProgram()
    .selectMarks({ id: "low", field: "x", op: "min" })
    .selectMarks({ id: "high", field: "x", op: "max" })
    ._withContext({ currentSelection: undefined });
  const options = Object.freeze({
    selection: "low",
    field: "x",
    op: "max",
    count: 0
  });

  assert.throws(() => base.editMarkSelection(options), /positive integer/);
  assert.throws(
    () => base.editMarkSelection({ field: "x", op: "max" }),
    /ambiguous/
  );
  assert.throws(
    () => base.editMarkSelection({ selection: "missing", field: "x", op: "max" }),
    /Unknown selection/
  );
  assert.throws(
    () => base.editMarkSelection({ selection: "low" }),
    /exactly one|operator/
  );
  assert.throws(
    () => base.removeMarkHighlight({ selection: "low" }),
    /no highlight assignment/
  );
  assert.throws(() => base.removeMarkSelection(), /ambiguous/);
  assert.throws(
    () => base.removeMarkSelection({ selection: "low", extra: true }),
    /Unknown removeMarkSelection option/
  );
  assert.deepEqual(options, {
    selection: "low",
    field: "x",
    op: "max",
    count: 0
  });
  assert.deepEqual(Object.keys(base.materializationConfigs.selections), ["low", "high"]);
  assert.equal(base.materializationConfigs.highlights, undefined);
});
