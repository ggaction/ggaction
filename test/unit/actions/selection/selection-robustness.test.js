import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";

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
    .encodeY({ field: "y", scale: { nice: false, zero: false } })
    .encodeRadius({ value: 3 });
}

function highlighted(program = pointProgram()) {
  return program.highlightMarks({
    select: { field: "x", op: "max", groupBy: "group" },
    color: "#dc2626",
    shape: "diamond",
    size: 4,
    opacity: 0.9,
    stroke: "white",
    strokeWidth: 1.5,
    offset: { x: 2, y: -2 },
    dimOthers: { opacity: 0.18 },
    bringToFront: true
  });
}

test("runs every selector operator through reusable action state", () => {
  const cases = [
    ["eq", { field: "x", op: "eq", value: 5 }, ["point/point/1"]],
    ["neq", { field: "x", op: "neq", value: 5 }, ["point/point/0", "point/point/2", "point/point/3"]],
    ["gt", { channel: "x", op: "gt", value: 5 }, ["point/point/3"]],
    ["gte", { channel: "x", op: "gte", value: 5 }, ["point/point/1", "point/point/3"]],
    ["lt", { property: "x", op: "lt", value: 120 }, ["point/point/0", "point/point/2"]],
    ["lte", { field: "x", op: "lte", value: 3 }, ["point/point/0", "point/point/2"]],
    ["oneOf", { field: "label", op: "oneOf", values: ["low", "top"] }, ["point/point/0", "point/point/3"]],
    ["range", { field: "x", op: "range", min: 1, max: 8, inclusive: false }, ["point/point/1", "point/point/2"]],
    ["min", { field: "x", op: "min", count: 2 }, ["point/point/0", "point/point/2"]],
    ["max", { field: "x", op: "max", count: 2 }, ["point/point/3", "point/point/1"]]
  ];
  const before = pointProgram();
  let next = before;
  for (const [id, selector, expected] of cases) {
    next = next.selectMarks({ id, ...selector });
    assert.deepEqual(resolveStoredSelection(next, id).keys, expected);
  }

  assert.equal(Object.keys(next.materializationConfigs.selections).length, cases.length);
  assert.equal(next.graphicSpec, before.graphicSpec);
  assert.equal(before.materializationConfigs.selections, undefined);
});

test("resolves explicit, current, unique, and ambiguous mark targets", () => {
  const first = pointProgram();
  assert.equal(
    first._withContext({ currentMark: undefined })
      .selectMarks({ field: "x", op: "max" })
      .materializationConfigs.selections.pointSelection.target,
    "point"
  );

  const layered = first
    .createPointMark({ id: "second" })
    .encodeX({ target: "second", field: "x", scale: { id: "secondX" } })
    .encodeY({ target: "second", field: "y", scale: { id: "secondY" } })
    .encodeRadius({ target: "second", value: 2 });
  assert.equal(
    layered.selectMarks({ id: "current", field: "x", op: "max" })
      .materializationConfigs.selections.current.target,
    "second"
  );
  assert.equal(
    layered.selectMarks({ id: "explicit", target: "point", field: "x", op: "max" })
      .materializationConfigs.selections.explicit.target,
    "point"
  );
  assert.throws(
    () => layered._withContext({ currentMark: undefined })
      .selectMarks({ field: "x", op: "max" }),
    /target is ambiguous/
  );
});

test("keeps multiple highlight assignments independent when one is replaced", () => {
  const base = pointProgram()
    .selectMarks({ id: "low", field: "x", op: "min" })
    .selectMarks({ id: "high", field: "x", op: "max" });
  const both = base
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
      dimOthers: false,
      bringToFront: false
    });
  assert.equal(both.graphicSpec.objects.point.items[0].properties.fill, "#2563eb");
  assert.equal(both.graphicSpec.objects.point.items[3].properties.fill, "#dc2626");

  const replaced = both.highlightMarks({
    selection: "low",
    color: "#16a34a",
    size: 2,
    dimOthers: false,
    bringToFront: false
  });
  assert.equal(replaced.graphicSpec.objects.point.items[0].properties.fill, "#16a34a");
  assert.equal(replaced.graphicSpec.objects.point.items[3].properties.fill, "#dc2626");
  assert.deepEqual(Object.keys(replaced.materializationConfigs.highlights), ["high", "low"]);
  assert.equal(both.graphicSpec.objects.point.items[0].properties.fill, "#2563eb");
});

test("converges across color encoding, scale, Canvas, and filter order", () => {
  const encodeThenHighlight = highlighted(
    pointProgram().encodeColor({ field: "group" })
  );
  const highlightThenEncode = highlighted().encodeColor({ field: "group" });
  assert.deepEqual(highlightThenEncode.semanticSpec, encodeThenHighlight.semanticSpec);
  assert.deepEqual(highlightThenEncode.graphicSpec, encodeThenHighlight.graphicSpec);
  assert.deepEqual(
    highlightThenEncode.materializationConfigs,
    encodeThenHighlight.materializationConfigs
  );

  const resizeThenHighlight = highlighted(pointProgram().editCanvas({ width: 300 }));
  const highlightThenResize = highlighted().editCanvas({ width: 300 });
  assert.deepEqual(highlightThenResize.graphicSpec, resizeThenHighlight.graphicSpec);

  const reverseThenHighlight = highlighted(pointProgram().editScale({
    id: "x",
    reverse: true
  }));
  const highlightThenReverse = highlighted().editScale({ id: "x", reverse: true });
  assert.deepEqual(highlightThenReverse.graphicSpec, reverseThenHighlight.graphicSpec);

  const selector = { field: "group", op: "eq", value: "A" };
  const filterThenHighlight = highlighted(pointProgram().filterMarks(selector));
  const highlightThenFilter = highlighted().filterMarks(selector);
  assert.deepEqual(highlightThenFilter.semanticSpec, filterThenHighlight.semanticSpec);
  assert.deepEqual(highlightThenFilter.graphicSpec, filterThenHighlight.graphicSpec);
  assert.deepEqual(resolveStoredSelection(highlightThenFilter).keys, ["point/point/1"]);
  assert.equal(highlightThenFilter.graphicSpec.objects.point.items.length, 2);
});

test("replays homogeneous point highlights after direct appearance scale edits", () => {
  const base = pointProgram()
    .encodeColor({ field: "group" })
    .encodeOpacity({ field: "x" });
  const editScales = program => program
    .editScale({ id: "color", range: ["black", "white"] })
    .editScale({ id: "opacity", range: [0.1, 0.9] });
  const applyHighlight = program => program.highlightMarks({
    select: { field: "x", op: "max" },
    fill: "#dc2626",
    opacity: 0.8,
    size: 2,
    dimOthers: { opacity: 0.15 },
    bringToFront: false
  });
  const expected = applyHighlight(editScales(base));
  const highlighted = applyHighlight(base);
  const edited = editScales(highlighted);

  assert.deepEqual(
    edited.graphicSpec.objects.point,
    expected.graphicSpec.objects.point
  );
  assert.deepEqual(
    edited.removeMarkHighlight().graphicSpec.objects.point,
    editScales(base).graphicSpec.objects.point
  );
  assert.deepEqual(
    highlighted.graphicSpec.objects.point.items.map(item => item.properties.opacity),
    [0.15, 0.15, 0.15, 0.8]
  );
});

test("preserves selected-last order and encoded-style precedence after rematerialization", () => {
  const base = pointProgram()
    .encodeColor({ field: "group" })
    .encodeOpacity({ field: "x" });
  const result = highlighted(base).editCanvas({ width: 300, height: 220 });
  const children = result.graphicSpec.objects.point.items;

  assert.deepEqual(resolveStoredSelection(result).keys, [
    "point/point/1",
    "point/point/3"
  ]);
  assert.deepEqual(children.slice(-2).map(child => child.type), ["path", "path"]);
  assert.equal(children.slice(-2).every(child =>
    child.properties.fill === "#dc2626" &&
    child.properties.opacity === 0.9 &&
    child.properties.stroke === "white"
  ), true);
  assert.equal(children.slice(0, 2).every(child =>
    child.properties.opacity === 0.18
  ), true);
  assert.equal(new Set(children.map(child => child.id)).size, children.length);
});

test("uses every supported point shape as a highlighted replacement", () => {
  for (const shape of [
    "circle", "square", "diamond", "triangle-up", "triangle-down",
    "triangle-left", "triangle-right", "plus", "cross", "star",
    "hexagon", "wye"
  ]) {
    const result = pointProgram().highlightMarks({
      select: { field: "x", op: "max" },
      shape,
      bringToFront: false
    });
    const child = result.graphicSpec.objects.point.items[3];
    const type = child.type ?? result.graphicSpec.objects.point.type;
    assert.equal(["circle", "rect", "path"].includes(type), true, shape);
    if (type === "path") {
      assert.equal(child.properties.commands.at(-1).op, "Z", shape);
    }
  }
});

test("rejects invalid aggregate options without mutating program or caller input", () => {
  const before = pointProgram();
  const select = Object.freeze({ field: "x", op: "max" });
  const options = Object.freeze({
    select,
    color: "red",
    fill: "blue",
    dimOthers: Object.freeze({ opacity: 0.2 })
  });
  assert.throws(() => before.highlightMarks(options), /color or fill/);
  assert.deepEqual(options, {
    select: { field: "x", op: "max" },
    color: "red",
    fill: "blue",
    dimOthers: { opacity: 0.2 }
  });
  assert.equal(before.materializationConfigs.selections, undefined);
  assert.equal(before.materializationConfigs.highlights, undefined);
  assert.equal(before.trace.children.at(-1).op, "encodeRadius");
});
