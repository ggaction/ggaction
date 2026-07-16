import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";
import { createCarsHistogram } from "../../../../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../../../../examples/cars-line-chart/program.js";
import { createCarsDensityArea } from "../../../../examples/cars-density-area/program.js";
import { loadCars } from "../../../support/data.js";

const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", label: "low" }),
  Object.freeze({ x: 5, y: 4, group: "A", label: "high" }),
  Object.freeze({ x: 3, y: 6, group: "B", label: "middle" }),
  Object.freeze({ x: 8, y: 8, group: "B", label: "top" })
]);

function pointProgram(shape) {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ values: rows })
    .createPointMark(shape === undefined ? {} : { shape })
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeRadius({ value: 3 });
}

test("creates a reusable selection without changing graphics", () => {
  const before = pointProgram();
  const selected = before.selectMarks({ field: "x", op: "max" });

  assert.equal(selected.context.currentSelection, "pointSelection");
  assert.deepEqual(selected.materializationConfigs.selections, {
    pointSelection: {
      target: "point",
      selector: {
        grain: "item",
        field: "x",
        op: "max",
        count: 1,
        ties: "first"
      }
    }
  });
  assert.deepEqual(resolveStoredSelection(selected).keys, ["point/point/3"]);
  assert.equal(selected.graphicSpec, before.graphicSpec);
  assert.deepEqual(selected.trace.children.at(-1).children, []);
  assert.equal(before.materializationConfigs.selections, undefined);
});

test("supports explicit targets, ids, and every point selector family", () => {
  const base = pointProgram();
  const cases = [
    [{ field: "x", op: "eq", value: 3 }, ["point/point/2"]],
    [{ field: "label", op: "oneOf", values: ["low", "top"] }, ["point/point/0", "point/point/3"]],
    [{ channel: "x", op: "range", min: 3, max: 5 }, ["point/point/1", "point/point/2"]],
    [{ field: "x", op: "max", groupBy: "group" }, ["point/point/1", "point/point/3"]]
  ];
  for (const [selector, keys] of cases) {
    const program = base.selectMarks({
      id: `selection${cases.indexOf(cases.find(item => item[0] === selector))}`,
      target: "point",
      ...selector
    });
    assert.deepEqual(resolveStoredSelection(program).keys, keys);
  }
});

test("selects final bar and series items without changing their graphics", () => {
  const cars = loadCars();
  const histogram = createCarsHistogram(cars);
  const selectedBar = histogram.selectMarks({
    target: "bars",
    grain: "stack",
    channel: "y2",
    op: "max"
  });
  assert.equal(resolveStoredSelection(selectedBar).keys.length, 1);
  assert.deepEqual(resolveStoredSelection(selectedBar).keys, ["bars/stack/1"]);
  assert.equal(selectedBar.graphicSpec, histogram.graphicSpec);
  const resizedBar = selectedBar.editCanvas({ height: 520 });
  assert.deepEqual(resolveStoredSelection(resizedBar).keys, ["bars/stack/1"]);
  assert.equal(
    resolveStoredSelection(resizedBar).items[1].channels.y2,
    resolveStoredSelection(selectedBar).items[1].channels.y2
  );
  assert.notEqual(
    resolveStoredSelection(resizedBar).items[1].properties.height,
    resolveStoredSelection(selectedBar).items[1].properties.height
  );

  const tallestSegment = histogram.selectMarks({
    id: "tallestSegment",
    target: "bars",
    property: "height",
    op: "max"
  });
  assert.deepEqual(resolveStoredSelection(tallestSegment).keys, [
    "bars/histogram/2"
  ]);

  const line = createCarsLineChart(cars);
  const selectedSeries = line.selectMarks({
    target: "trends",
    field: "Origin",
    op: "eq",
    value: "Japan"
  });
  assert.deepEqual(
    resolveStoredSelection(selectedSeries).items
      .filter(item => resolveStoredSelection(selectedSeries).keys.includes(item.key))
      .map(item => item.fields.Origin),
    ["Japan"]
  );
  assert.equal(selectedSeries.graphicSpec, line.graphicSpec);
});

test("highlights inline and reusable selections through wrapped point actions", () => {
  const inline = pointProgram().highlightMarks({
    select: { field: "x", op: "max", groupBy: "group" },
    color: "#dc2626",
    shape: "diamond",
    size: 4,
    offset: { x: 2, y: -3 },
    dimOthers: { opacity: 0.2 }
  });
  assert.deepEqual(inline.trace.children.at(-1).children.map(child => child.op), [
    "selectMarks",
    "applyPointHighlight",
    "dimUnselectedMarkItems",
    "placeSelectedMarkItemsLast"
  ]);
  assert.deepEqual(
    inline.graphicSpec.objects.point.children.slice(-2).map(child => child.type),
    ["path", "path"]
  );
  assert.equal(
    inline.graphicSpec.objects.point.children.slice(0, 2).every(child =>
      child.properties.opacity === 0.2
    ),
    true
  );

  const reusable = pointProgram()
    .selectMarks({ id: "high", field: "x", op: "gte", value: 5 })
    .highlightMarks({ selection: "high", color: "#dc2626", size: 4 });
  assert.deepEqual(resolveStoredSelection(reusable, "high").keys, [
    "point/point/1",
    "point/point/3"
  ]);
  assert.deepEqual(
    reusable.trace.children.at(-1).children.map(child => child.op),
    ["applyPointHighlight", "placeSelectedMarkItemsLast"]
  );
});

test("uses the default point recipe and can replace an existing assignment", () => {
  const selected = pointProgram()
    .selectMarks({ field: "x", op: "max" })
    .highlightMarks({});
  const highlighted = selected.graphicSpec.objects.point.children.at(-1);
  assert.equal(
    highlighted.type ?? selected.graphicSpec.objects.point.type,
    "circle"
  );
  assert.equal(highlighted.properties.fill, "#dc2626");
  assert.equal(highlighted.properties.radius, 3 * Math.sqrt(2));

  const replaced = selected.highlightMarks({
    selection: "pointSelection",
    color: "navy",
    size: 1,
    dimOthers: false,
    bringToFront: false
  });
  assert.equal(
    replaced.graphicSpec.objects.point.children[3].properties.fill,
    "navy"
  );
  assert.equal(
    replaced.graphicSpec.objects.point.children.slice(0, 3).every(child =>
      child.properties.opacity === undefined
    ),
    true
  );
  assert.equal(replaced.materializationConfigs.highlights.pointSelection.bringToFront, false);
});

test("keeps an empty point highlight graphical no-op unless complement dimming is requested", () => {
  const base = pointProgram();
  const empty = base.highlightMarks({
    select: { field: "x", op: "eq", value: 999 }
  });
  assert.equal(empty.graphicSpec, base.graphicSpec);
  assert.deepEqual(resolveStoredSelection(empty).keys, []);

  const dimmed = base.highlightMarks({
    select: { field: "x", op: "eq", value: 999 },
    dimOthers: { opacity: 0.1 }
  });
  assert.equal(
    dimmed.graphicSpec.objects.point.children.every(child =>
      child.properties.opacity === 0.1
    ),
    true
  );
});

test("scales existing rect and path point geometry without changing shape", () => {
  for (const shape of ["square", "triangle-up"]) {
    const base = pointProgram(shape);
    const before = base.graphicSpec.objects.point.children[3];
    const highlighted = base.highlightMarks({
      select: { field: "x", op: "max" },
      size: 4,
      offset: { x: 1, y: -2 },
      bringToFront: false
    });
    const after = highlighted.graphicSpec.objects.point.children[3];
    assert.equal(
      after.type ?? highlighted.graphicSpec.objects.point.type,
      before.type ?? base.graphicSpec.objects.point.type
    );
    if (shape === "square") {
      assert.equal(after.properties.width, before.properties.width * 2);
      assert.equal(after.properties.height, before.properties.height * 2);
    } else {
      assert.equal(after.properties.commands.at(-1).op, "Z");
      assert.notDeepEqual(after.properties.commands, before.properties.commands);
    }
  }
});

test("reapplies selection and highlight intent after point rematerialization", () => {
  const highlighted = pointProgram().highlightMarks({
    select: { field: "x", op: "max", groupBy: "group" },
    shape: "diamond",
    dimOthers: true
  });
  const resized = highlighted.editCanvas({ width: 300 });
  assert.deepEqual(resolveStoredSelection(resized).keys, [
    "point/point/1",
    "point/point/3"
  ]);
  assert.deepEqual(
    resized.graphicSpec.objects.point.children.slice(-2).map(child => child.type),
    ["path", "path"]
  );
  assert.equal(
    resized.graphicSpec.objects.point.children.slice(0, 2).every(child =>
      child.properties.opacity === 0.25
    ),
    true
  );

  const filtered = highlighted.filterMarks({
    field: "group",
    op: "eq",
    value: "A"
  });
  assert.deepEqual(resolveStoredSelection(filtered).keys, ["point/point/1"]);
  assert.equal(filtered.graphicSpec.objects.point.children.length, 2);
  assert.equal(filtered.graphicSpec.objects.point.children.at(-1).type, "path");
});

test("validates selection and point highlight options atomically", () => {
  const base = pointProgram();
  const invalidSelections = [
    [{ field: "x", channel: "x", op: "max" }, /exactly one/],
    [{ field: "x", op: "max", count: 0 }, /positive integer/],
    [{ target: "missing", field: "x", op: "max" }, /Unknown mark selection target/]
  ];
  for (const [options, error] of invalidSelections) {
    assert.throws(() => base.selectMarks(options), error);
  }
  assert.throws(
    () => base.selectMarks({ field: "x", op: "max" })
      .selectMarks({ field: "x", op: "min" }),
    /already exists/
  );
  for (const [options, error] of [
    [{}, /existing selection/],
    [{ select: { field: "x", op: "max" }, selection: "other" }, /select or selection/],
    [{ select: { field: "x", op: "max" }, color: "red", fill: "blue" }, /color or fill/],
    [{ select: { field: "x", op: "max" }, strokeWidth: 2 }, /requires stroke/],
    [{ select: { field: "x", op: "max" }, strokeDash: "dashed" }, /does not support/],
    [{ select: { field: "x", op: "max" }, size: 0 }, /positive finite/],
    [{ select: { field: "x", op: "max" }, opacity: 2 }, /between 0 and 1/],
    [{ select: { field: "x", op: "max" }, offset: { z: 1 } }, /Unknown highlight offset/]
  ]) {
    assert.throws(() => base.highlightMarks(options), error);
  }
  assert.equal(base.materializationConfigs.selections, undefined);
  assert.equal(base.materializationConfigs.highlights, undefined);
});

test("highlights one bar item or one complete stack from the same y2 channel", () => {
  const base = createCarsHistogram(loadCars());
  const item = base.highlightMarks({
    target: "bars",
    select: { channel: "y2", op: "max" },
    fill: "#facc15",
    stroke: "#713f12",
    strokeWidth: 2.5,
    opacity: 1
  });
  assert.deepEqual(resolveStoredSelection(item).keys, ["bars/histogram/5"]);
  assert.equal(item.graphicSpec.objects.bars.children.at(-1).properties.fill, "#facc15");
  assert.deepEqual(item.trace.children.at(-1).children.map(child => child.op), [
    "selectMarks",
    "applyBarHighlight",
    "placeSelectedMarkItemsLast"
  ]);

  const stack = base.highlightMarks({
    target: "bars",
    select: { grain: "stack", channel: "y2", op: "max" },
    fill: "#facc15",
    stroke: "#713f12",
    strokeWidth: 2.5,
    opacity: 1
  });
  assert.deepEqual(resolveStoredSelection(stack).keys, ["bars/stack/1"]);
  assert.equal(stack.graphicSpec.objects.bars.children.slice(-3).every(child =>
    child.properties.fill === "#facc15" &&
    child.properties.stroke === "#713f12"
  ), true);

  const resized = stack.editCanvas({ height: 520 });
  assert.deepEqual(resolveStoredSelection(resized).keys, ["bars/stack/1"]);
  assert.equal(resized.graphicSpec.objects.bars.children.slice(-3).every(child =>
    child.properties.fill === "#facc15"
  ), true);
});

test("validates bar-specific highlight appearance before creating selection state", () => {
  const base = createCarsHistogram(loadCars());
  for (const [option, error] of [
    [{ shape: "diamond" }, /does not support shape/],
    [{ size: 2 }, /does not support size/],
    [{ offset: { x: 1 } }, /does not support offset/],
    [{ strokeDash: "dashed" }, /does not support strokeDash/],
    [{ strokeWidth: 2 }, /requires stroke/]
  ]) {
    assert.throws(() => base.highlightMarks({
      target: "bars",
      select: { channel: "y2", op: "max" },
      ...option
    }), error);
  }
  assert.equal(base.materializationConfigs.selections, undefined);
});

test("highlights complete area paths and preserves logical offsets after resize", () => {
  const base = createCarsDensityArea(loadCars());
  const highlighted = base.highlightMarks({
    target: "densities",
    select: { field: "Origin", op: "eq", value: "Japan" },
    fill: "#dc2626",
    opacity: 0.8,
    stroke: "#111111",
    strokeWidth: 2,
    offset: { x: 4, y: -3 },
    dimOthers: true
  });
  const original = base.graphicSpec.objects.densities.children[2].properties.commands[0];
  const selected = highlighted.graphicSpec.objects.densities.children.at(-1);

  assert.equal(selected.properties.fill, "#dc2626");
  assert.equal(selected.properties.opacity, 0.8);
  assert.equal(selected.properties.commands[0].x, original.x + 4);
  assert.equal(selected.properties.commands[0].y, original.y - 3);
  const resized = highlighted.editCanvas({ width: 760 });
  const resizedBase = base.editCanvas({ width: 760 });
  assert.equal(
    resized.graphicSpec.objects.densities.children.at(-1).properties.commands[0].x,
    resizedBase.graphicSpec.objects.densities.children[2].properties.commands[0].x + 4
  );
});

test("highlights rule items with stroke recipes and translated endpoints", () => {
  const base = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ values: [
      { group: "A", value: 10 },
      { group: "B", value: 30 }
    ] })
    .createRuleMark()
    .encodeX({ field: "value", fieldType: "quantitative" });
  const original = base.graphicSpec.objects.rule.children[1].properties;
  const highlighted = base.highlightMarks({
    select: { field: "group", op: "eq", value: "B" },
    stroke: "#dc2626",
    strokeWidth: 4,
    strokeDash: "dashdot",
    offset: { x: 2, y: 3 },
    dimOthers: { opacity: 0.2 }
  });
  const selected = highlighted.graphicSpec.objects.rule.children.at(-1).properties;

  assert.equal(selected.stroke, "#dc2626");
  assert.equal(selected.strokeWidth, 4);
  assert.deepEqual(selected.strokeDash, [6, 3, 1, 3]);
  assert.equal(selected.x1, original.x1 + 2);
  assert.equal(selected.y1, original.y1 + 3);
  assert.equal(highlighted.graphicSpec.objects.rule.children[0].properties.opacity, 0.2);
});

test("rejects mark-incompatible path and rule highlight options atomically", () => {
  const line = createCarsLineChart(loadCars());
  const area = createCarsDensityArea(loadCars());
  assert.throws(
    () => line.highlightMarks({
      target: "trends",
      select: { field: "Origin", op: "eq", value: "Japan" },
      fill: "red"
    }),
    /Line highlight does not support fill/
  );
  assert.throws(
    () => area.highlightMarks({
      target: "densities",
      select: { field: "Origin", op: "eq", value: "Japan" },
      strokeWidth: 2
    }),
    /strokeWidth requires stroke/
  );
  assert.equal(line.materializationConfigs.selections, undefined);
  assert.equal(area.materializationConfigs.selections, undefined);
});
