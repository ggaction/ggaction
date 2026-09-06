import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const ROWS = Object.freeze([
  Object.freeze({ id: "a", category: "A", value: 2, size: 80 }),
  Object.freeze({ id: "b", category: "A", value: 2, size: 140 }),
  Object.freeze({ id: "c", category: "A", value: 2, size: 60 }),
  Object.freeze({ id: "d", category: "B", value: 4, size: 100 })
]);

function createProgram(rows = ROWS) {
  return chart()
    .createCanvas({ width: 420, height: 300, margin: 50 })
    .createData({ id: "rows", values: rows })
    .createPointMark({ id: "points", data: "rows", stroke: "black", strokeWidth: 2 })
    .encodeX({
      target: "points", field: "category", fieldType: "nominal",
      scale: { id: "categoryScale", domain: ["A", "B"] }
    })
    .encodeY({
      target: "points", field: "value", fieldType: "quantitative",
      scale: { id: "valueScale", domain: [0, 5], zero: false }
    })
    .encodeSize({ target: "points", field: "size", scale: { range: [60, 140] } });
}

function values(program, property) {
  return program.graphicSpec.objects.points.items.map(item => item.properties[property]);
}

function offsetsById(program, base, rows) {
  return new Map(rows.map((row, index) => [
    row.id,
    values(program, "x")[index] - values(base, "x")[index]
  ]));
}

test("packs actual variable glyph extents on only the categorical axis", () => {
  const base = createProgram();
  const packed = base.packPoints({ channel: "x", key: "id", padding: 2 });
  assert.deepEqual(packed.semanticSpec, base.semanticSpec);
  assert.deepEqual(values(packed, "y"), values(base, "y"));
  assert.notDeepEqual(values(packed, "x"), values(base, "x"));
  const first = packed.graphicSpec.objects.points.items.slice(0, 3);
  for (let left = 0; left < first.length; left += 1) {
    for (let right = left + 1; right < first.length; right += 1) {
      const a = first[left].properties;
      const b = first[right].properties;
      assert.equal(Math.abs(a.x - b.x) >= a.radius + b.radius + 4, true);
    }
  }
  assert.equal(packed.materializationConfigs.pointPacking.points.resolved.unresolvedItemCount, 0);
  assert.deepEqual(
    packed.trace.children.at(-1).children.map(node => node.op),
    ["rematerializePointMark"]
  );
  assert.equal(base.materializationConfigs.pointPacking, undefined);
});

test("keeps keyed placement stable across source row order and removes exactly", () => {
  const options = { channel: "x", key: "id", padding: 1 };
  const originalBase = createProgram(ROWS);
  const reversedRows = [...ROWS].reverse();
  const reversedBase = createProgram(reversedRows);
  const original = originalBase.packPoints(options);
  const reversed = reversedBase.packPoints(options);
  assert.deepEqual(
    offsetsById(reversed, reversedBase, reversedRows),
    offsetsById(original, originalBase, ROWS)
  );
  const restored = original.removePointPacking();
  assert.deepEqual(restored.graphicSpec, originalBase.graphicSpec);
  assert.equal(restored.materializationConfigs.pointPacking, undefined);
});

test("replays from semantic positions after Canvas and point style edits", () => {
  const packed = createProgram().packPoints({ channel: "x", key: "id" });
  const direct = packed
    .editPointMark({ shape: "diamond", strokeWidth: 4 })
    .editCanvas({ width: 520 });
  const reordered = packed
    .editCanvas({ width: 520 })
    .editPointMark({ shape: "diamond", strokeWidth: 4 });
  assert.deepEqual(reordered.graphicSpec, direct.graphicSpec);
  assert.equal(direct.graphicSpec.objects.points.type, "collection");
  assert.equal(direct.materializationConfigs.pointPacking.points.resolved.itemCount, ROWS.length);
});

test("replays through scale, filter, highlight, and facet lifecycles", () => {
  const options = { channel: "x", key: "id", overflow: "overlap" };
  const base = createProgram();
  const packed = base.packPoints(options);
  const directScale = base
    .editScale({ id: "categoryScale", reverse: true })
    .packPoints(options);
  assert.deepEqual(
    packed.editScale({ id: "categoryScale", reverse: true }).graphicSpec,
    directScale.graphicSpec
  );
  const filtered = packed.filterMarks({
    target: "points", field: "id", op: "oneOf", values: ["a", "b"]
  });
  assert.equal(filtered.materializationConfigs.pointPacking.points.resolved.itemCount, 2);
  assert.equal(
    filtered.removeMarkFilter({ target: "points" })
      .materializationConfigs.pointPacking.points.resolved.itemCount,
    ROWS.length
  );
  const highlight = {
    target: "points", select: { field: "id", op: "eq", value: "b" },
    offset: { x: 2, y: -1 }, dimOthers: false, bringToFront: false
  };
  assert.deepEqual(
    packed.highlightMarks(highlight).editCanvas({ width: 500 }).graphicSpec,
    packed.editCanvas({ width: 500 }).highlightMarks(highlight).graphicSpec
  );
  const faceted = packed.facet({ field: "category", columns: 2 });
  assert.deepEqual(
    Object.values(faceted.children).map(child =>
      child.materializationConfigs.pointPacking.points.resolved.itemCount
    ),
    [3, 1]
  );
});

test("rejects overflow, duplicate keys, wrong axes, and jitter conflicts atomically", () => {
  const tiny = chart()
    .createCanvas({ width: 80, height: 80, margin: 20 })
    .createData({ values: [{ id: "a", c: "A", v: 1 }, { id: "b", c: "A", v: 1 }] })
    .createPointMark()
    .encodeX({ field: "c", fieldType: "nominal" })
    .encodeY({ field: "v", fieldType: "quantitative" })
    .encodePointRadius({ value: 15 });
  const before = JSON.stringify(tiny);
  assert.throws(() => tiny.packPoints({ channel: "x", key: "id" }), /cannot avoid|no available/);
  assert.equal(JSON.stringify(tiny), before);
  const overlap = tiny.packPoints({ channel: "x", key: "id", overflow: "overlap" });
  assert.equal(overlap.materializationConfigs.pointPacking.point.resolved.unresolvedItemCount > 0, true);
  assert.throws(() => createProgram([
    { id: "same", category: "A", value: 2, size: 80 },
    { id: "same", category: "A", value: 2, size: 80 }
  ]).packPoints({ channel: "x", key: "id" }), /must be unique/);
  assert.throws(() => createProgram().packPoints({ channel: "y" }), /eligible layer/);
  const jittered = createProgram().jitterPoints({
    channel: "x", maxOffset: { band: 0.1 }, key: "id"
  });
  assert.throws(() => jittered.packPoints({ channel: "x" }), /conflicts with point jitter/);
  const packed = createProgram().packPoints({ channel: "x", key: "id" });
  assert.throws(() => packed.jitterPoints({
    channel: "x", maxOffset: { band: 0.1 }
  }), /conflicts with point packing/);
  assert.equal(
    packed.removeMark({ target: "points" }).materializationConfigs.pointPacking,
    undefined
  );
});
