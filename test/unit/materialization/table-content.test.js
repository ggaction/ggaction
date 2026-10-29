import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTablePlot } from "../../../src/grammar/tablePlot.js";
import { deriveTableData } from "../../../src/grammar/tableData.js";
import { layoutTableContent } from "../../../src/materialization/table/layout.js";
import { tableTextProperties } from "../../../src/materialization/table/text.js";
const frame = { x: 20, y: 20, width: 320, height: 180 };
const rows = [{ name: "Alpha", amount: 4, trend: [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }] },
  { name: "Beta", amount: 8, trend: [{ x: 0, y: 3 }, { x: 1, y: 1 }, { x: 2, y: 2 }] }];
function resolve(options, input = rows, viewport = frame) {
  const { binding, config } = normalizeTablePlot(options);
  const keys = input.map((_row, i) => `row-${i}`);
  return layoutTableContent(deriveTableData(input, keys, binding), keys, binding, config, viewport);
}
const columns = [{ field: "name", label: "Name", width: 100 }, { field: "amount", label: "Amount", width: 100, align: "right", cell: "bar", footer: "sum" },
  { field: "trend", label: "Trend", width: 120, cell: { type: "sparkline", x: "x", y: "y" } }];
test("Table content fixes literal cell, zero-based bar and shared sparkline coordinates", () => {
  const result = resolve({ columns });
  assert.equal(result.cells.length, 12);
  assert.deepEqual(result.cells[4].bounds, { left: 120, top: 48, right: 220, bottom: 76 });
  assert.deepEqual(result.cells[4].graphics.find(g => g.role === "bar").properties,
    { x: 124, y: 52, width: 46, height: 20, fill: "#93c5fd", stroke: "none", strokeWidth: 0, opacity: 1 });
  assert.deepEqual(result.cells[5].graphics.find(g => g.type === "path").properties.commands,
    [{ op: "M", x: 224, y: 72 }, { op: "L", x: 280, y: 52 }, { op: "L", x: 336, y: 62 }]);
  assert.equal(result.cells[10].text, "12"); assert.equal(result.cells[10].aggregate.inputRows, 2);
  for (const cell of result.cells) for (const graphic of cell.graphics) assert.deepEqual(graphic.clip,
    { x: cell.bounds.left, y: cell.bounds.top, width: cell.bounds.right - cell.bounds.left, height: 28 });
});
test("Table row limits keep full-source footer and provide a visible source-count notice", () => {
  const result = resolve({ columns, rowLimit: 1 });
  assert.equal(result.layout.sourceRowCount, 2); assert.equal(result.layout.visibleRowCount, 1);
  assert.equal(result.cells[7].text, "12"); assert.equal(result.note.text, "1 of 2 rows shown");
  assert.equal(result.note.y, 118);
  assert.throws(() => resolve({ columns }, rows, { ...frame, height: 100 }), /rowLimit/);
});
test("Table text wraps and displays grapheme-safe ellipsis without leaking the full value into concrete text", () => {
  const result = resolve({ columns: [{ field: "name", width: 70 }], rowHeight: 28 }, [{ name: "A long specimen name" }]);
  const cell = result.cells[1], text = cell.graphics.find(g => g.type === "text").properties;
  assert.equal(cell.text, "A long specimen name"); assert.equal(cell.truncated, true); assert.match(text.text, /…$/u);
  assert.notEqual(text.text, cell.text);
  const emoji = tableTextProperties("👨‍👩‍👧‍👦X", { left: 0, right: 16, top: 0, bottom: 24 }, { align: "left", wrap: false }, { fontSize: 12 }, 2);
  assert.equal(emoji.properties.text, "…");
  const multiline = resolve({ columns: [{ field: "name", width: 45 }], rowHeight: 60 }, [{ name: "Alpha Beta" }]).cells[1];
  assert.equal(multiline.truncated, false); assert.equal(multiline.graphics[1].properties.lines.length, 2);
});
test("Table text rejects insufficient indicator, font or width capacity before returning output", () => {
  assert.throws(() => resolve({ columns: [{ field: "name", width: 10 }] }), /indicator|width/);
  assert.throws(() => resolve({ columns: [{ field: "name", width: 90 }], labels: { fontSize: 30 } }), /fontSize/);
});
test("Table independent y domains and singleton marks preserve the shared x frame", () => {
  const single = [{ trend: [{ x: 0, y: 2 }] }, { trend: [{ x: 0, y: 100 }, { x: 2, y: 200 }] }];
  const result = resolve({ columns: [{ field: "trend", label: "", cell: { type: "sparkline", x: "x", y: "y", resolveY: "independent" } }] }, single);
  const point = result.cells[1].graphics.find(g => g.type === "circle");
  assert.deepEqual([point.properties.x, point.properties.y], [24, 62]);
  const path = result.cells[2].graphics.find(g => g.type === "path");
  assert.deepEqual(path.properties.commands, [{ op: "M", x: 24, y: 100 }, { op: "L", x: 336, y: 80 }]);
});
test("Table text preparation is bounded before its quadratic wrapping queries", () => {
  assert.throws(() => resolve({ columns: ["name"] }, [{ name: "x".repeat(4000) }]), /work/);
});
