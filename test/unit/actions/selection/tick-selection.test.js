import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { resolveStoredSelection } from
  "../../../../src/materialization/selection/state.js";

const rows = Object.freeze([
  Object.freeze({ id: "low", x: 1, y: 2, group: "A" }),
  Object.freeze({ id: "middle", x: 4, y: 5, group: "A" }),
  Object.freeze({ id: "high", x: 8, y: 7, group: "B" })
]);

function tickProgram() {
  return chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createTickMark({ id: "ticks", length: 18, stroke: "#2563eb" })
    .encodeX({ target: "ticks", field: "x" })
    .encodeY({ target: "ticks", field: "y" });
}

test("selects final Tick items with fields, channels, and concrete lines", () => {
  const base = tickProgram();
  const selected = base.selectMarks({
    id: "highest",
    target: "ticks",
    field: "x",
    op: "max"
  });
  const resolved = resolveStoredSelection(selected, "highest");

  assert.deepEqual(resolved.keys, ["ticks/tick/2"]);
  assert.deepEqual(resolved.items.map(item => item.fields.id), [
    "low", "middle", "high"
  ]);
  assert.deepEqual(resolved.items.map(item => item.channels.x), [1, 4, 8]);
  assert.equal(resolved.items.every(item =>
    Number.isFinite(item.properties.x1) &&
    Number.isFinite(item.properties.y2) &&
    item.graphicIds.length === 1
  ), true);
  assert.equal(selected.graphicSpec, base.graphicSpec);
});

test("replays Tick highlight order and appearance after rematerialization", () => {
  const highlighted = tickProgram().highlightMarks({
    target: "ticks",
    select: { field: "group", op: "eq", value: "A" },
    stroke: "#dc2626",
    strokeWidth: 3,
    bringToFront: true
  });
  const resized = highlighted.editCanvas({ width: 300 });
  const resolved = resolveStoredSelection(resized);

  assert.deepEqual(resolved.keys, ["ticks/tick/0", "ticks/tick/1"]);
  assert.deepEqual(
    resized.graphicSpec.objects.ticks.items.slice(-2).map(item =>
      item.properties.stroke
    ),
    ["#dc2626", "#dc2626"]
  );
  assert.deepEqual(
    resized.graphicSpec.objects.ticks.items.slice(-2).map(item => item.id),
    ["ticks:1", "ticks:2"]
  );
  assert.deepEqual(resolved.items.map(item => [
    item.fields.id,
    item.properties.stroke
  ]), [
    ["high", "#2563eb"],
    ["low", "#dc2626"],
    ["middle", "#dc2626"]
  ]);

  const retained = tickProgram().highlightMarks({
    target: "ticks",
    select: { field: "x", op: "max" },
    stroke: "#dc2626",
    bringToFront: false
  }).editCanvas({ height: 220 });
  assert.deepEqual(
    retained.graphicSpec.objects.ticks.items.map(item => item.id),
    ["ticks:0", "ticks:1", "ticks:2"]
  );
});

test("rejects incomplete Tick selection and unsupported selection grain", () => {
  const incomplete = chart()
    .createCanvas({ width: 240, height: 180, margin: 20 })
    .createData({ id: "rows", values: rows })
    .createTickMark({ id: "ticks" })
    .encodeX({ target: "ticks", field: "x" });

  assert.throws(
    () => incomplete.selectMarks({ target: "ticks", field: "x", op: "max" }),
    /incomplete for selection/
  );
  assert.throws(
    () => tickProgram().selectMarks({
      target: "ticks",
      grain: "series",
      field: "x",
      op: "max"
    }),
    /Unknown mark selector grain "series"/
  );
});
