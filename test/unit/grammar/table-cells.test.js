import assert from "node:assert/strict";
import test from "node:test";
import { layoutTableCells, normalizeTableLayoutOptions } from "../../../src/grammar/cells.js";

const rows = [{ key: "a" }, { key: "b" }];
const columns = [{ key: "name", width: 40 }, { key: "value", width: "auto", intrinsicWidth: 20 }];
const layout = (rowInput = rows, columnInput = columns, options = {}) =>
  layoutTableCells(rowInput, columnInput, { width: 100, rowHeight: 20, ...options });

test("keyed table cells have literal header body footer rectangles in input order", () => {
  const result = layout(undefined, undefined, { footer: true });
  assert.deepEqual(result.columnWidths, [40, 60]);
  assert.equal(result.height, 80);
  assert.deepEqual(result.cells.map(cell => [cell.role, cell.rowIndex, cell.columnIndex, cell.bounds]), [
    ["header", null, 0, { left: 0, top: 0, right: 40, bottom: 20 }],
    ["header", null, 1, { left: 40, top: 0, right: 100, bottom: 20 }],
    ["body", 0, 0, { left: 0, top: 20, right: 40, bottom: 40 }],
    ["body", 0, 1, { left: 40, top: 20, right: 100, bottom: 40 }],
    ["body", 1, 0, { left: 0, top: 40, right: 40, bottom: 60 }],
    ["body", 1, 1, { left: 40, top: 40, right: 100, bottom: 60 }],
    ["footer", null, 0, { left: 0, top: 60, right: 40, bottom: 80 }],
    ["footer", null, 1, { left: 40, top: 60, right: 100, bottom: 80 }]
  ]);
  assert.equal(result.sourceRowCount, 2);
  assert.equal(result.visibleRowCount, 2);
  assert.equal(result.omittedRowCount, 0);
  assert.deepEqual(result.options, { width: 100, rowHeight: 20, header: true, footer: true });
});

test("auto columns proportionally use exact supplied measurements after fixed columns", () => {
  const cols = [
    { key: "fixed", width: 20 },
    { key: "short", width: "auto", intrinsicWidth: 10 },
    { key: "long", width: "auto", intrinsicWidth: 30 }
  ];
  assert.deepEqual(layout(rows, cols).columnWidths, [20, 20, 60]);
  assert.deepEqual(layout(rows, cols, { width: 180 }).columnWidths, [20, 40, 120]);
  assert.deepEqual(layout(rows, cols.map(col => col.width === "auto" ? { ...col, intrinsicWidth: 0 } : col)).columnWidths, [20, 40, 40]);
  assert.deepEqual(layout(rows, [{ key: "fixed", width: 20 }]).columnWidths, [20]);
  assert.deepEqual(layout(rows, [{ key: "fixed", width: 100 }, { key: "auto", width: "auto", intrinsicWidth: 50 }]).columnWidths, [100, 0]);
});

test("row and column reordering retain exact typed cell keys without using display indices", () => {
  const typedRows = [{ key: 1 }, { key: "1" }, { key: [true, 1n] }, { key: new Date("2020-01-01") }];
  const typedColumns = [{ key: 1, width: 30 }, { key: "1", width: 30 }];
  const first = layout(typedRows, typedColumns, { footer: true });
  const reordered = layout([...typedRows].reverse(), [...typedColumns].reverse(), { footer: true });
  assert.equal(new Set(first.cells.map(cell => cell.key)).size, 12);
  assert.deepEqual(new Set(reordered.cells.map(cell => cell.key)), new Set(first.cells.map(cell => cell.key)));
  assert.notEqual(first.cells[2].bounds.top, reordered.cells.find(cell => cell.key === first.cells[2].key).bounds.top);
  assert.notEqual(first.cells[2].bounds.left, reordered.cells.find(cell => cell.key === first.cells[2].key).bounds.left);
  assert.notEqual(first.cells[0].key, first.cells.at(-2).key);
});

test("visible row limits do not drop source counts or stop validation of hidden keys", () => {
  const result = layout(undefined, undefined, { rowLimit: 1, header: false, footer: true });
  assert.deepEqual([result.sourceRowCount, result.visibleRowCount, result.omittedRowCount, result.height], [2, 1, 1, 40]);
  assert.deepEqual(result.cells.map(cell => cell.role), ["body", "body", "footer", "footer"]);
  const zero = layout(undefined, undefined, { rowLimit: 0 });
  assert.deepEqual([zero.sourceRowCount, zero.visibleRowCount, zero.omittedRowCount], [2, 0, 2]);
  assert.ok(zero.cells.every(cell => cell.role === "header"));
  assert.throws(() => layout([{ key: "a" }, { key: "a" }], undefined, { rowLimit: 0 }), /unique/);
  assert.throws(() => layout([{ key: "a" }, { key: null }], undefined, { rowLimit: 1 }), /Row keys/);
  assert.equal(layout(undefined, undefined, { rowLimit: 500 }).visibleRowCount, 2);
});

test("empty body and zero measured auto width have explicit geometry", () => {
  const result = layout([], [{ key: "empty", width: "auto", intrinsicWidth: 0 }], { header: false });
  assert.deepEqual(result.cells, []);
  assert.equal(result.height, 0);
  assert.equal(result.omittedRowCount, 0);
  assert.deepEqual(result.columnWidths, [100]);
  assert.equal(layout([], columns, { footer: true }).cells.length, 4);
  assert.deepEqual(layout(rows, [
    { key: "empty", width: "auto", intrinsicWidth: 0 },
    { key: "nonempty", width: "auto", intrinsicWidth: 10 }
  ]).columnWidths, [0, 100]);
});

test("finite extreme measurements are normalized before summation or multiplication", () => {
  const result = layout(rows, [
    { key: "huge1", width: "auto", intrinsicWidth: Number.MAX_VALUE },
    { key: "huge2", width: "auto", intrinsicWidth: Number.MAX_VALUE }
  ], { width: Number.MAX_VALUE });
  assert.deepEqual(result.columnWidths, [Number.MAX_VALUE / 2, Number.MAX_VALUE / 2]);
  assert.equal(result.cells[1].bounds.right, Number.MAX_VALUE);
  assert.throws(() => layout(rows, columns, { rowHeight: Number.MAX_VALUE }), /height must remain finite/);
  assert.throws(() => layout(rows, [{ key: "a", width: 60 }, { key: "b", width: 41 }]), /exceed/);
  assert.throws(() => layout(rows, [{ key: "a", width: Number.MAX_VALUE }, { key: "b", width: Number.MAX_VALUE }], { width: Number.MAX_VALUE }), /exceed/);
});

test("cell rectangles partition every band and all geometry stays finite inside the resolved width", () => {
  const manyRows = Array.from({ length: 31 }, (_, index) => ({ key: index }));
  for (const width of [1, 101, 617.5]) {
    const manyColumns = Array.from({ length: 17 }, (_, index) => ({ key: index, width: "auto", intrinsicWidth: (index * 29) % 23 }));
    const result = layout(manyRows, manyColumns, { width, footer: true, rowHeight: 13.5 });
    assert.deepEqual(result, layout(manyRows, manyColumns, { width, footer: true, rowHeight: 13.5 }));
    for (let band = 0; band < 33; band++) {
      const bandCells = result.cells.slice(band * 17, (band + 1) * 17);
      assert.equal(bandCells[0].bounds.left, 0);
      assert.ok(Math.abs(bandCells.at(-1).bounds.right - width) < 1e-12);
      let area = 0;
      bandCells.forEach((cell, index) => {
        const { left, right, top, bottom } = cell.bounds;
        assert.ok([left, right, top, bottom].every(Number.isFinite));
        assert.ok(left >= 0 && right >= left && right <= width + 1e-12);
        assert.equal(top, band * 13.5);
        assert.equal(bottom, (band + 1) * 13.5);
        if (index) assert.equal(left, bandCells[index - 1].bounds.right);
        area += (right - left) * (bottom - top);
      });
      assert.ok(Math.abs(area - width * 13.5) < 1e-9);
    }
  }
});

test("table input and output are separately owned and immutable", () => {
  const inputRows = [{ key: [1, "a"] }], inputColumns = [{ key: [true, "b"], width: 50 }];
  const options = { width: 100 };
  const result = layoutTableCells(inputRows, inputColumns, options);
  assert.deepEqual(options, { width: 100 });
  assert.deepEqual(result.options, { width: 100, rowHeight: 24, header: true, footer: false });
  inputRows[0].key[0] = 2; inputColumns[0].key[0] = false;
  assert.equal(result.cells[1].rowKey, '["tuple",[["number",1],["string","a"]]]');
  assert.equal(result.cells[0].columnKey, '["tuple",[["boolean",true],["string","b"]]]');
  assert.throws(() => { result.cells[0].bounds.right = 0; }, TypeError);
  assert.throws(() => { result.columnWidths[0] = 0; }, TypeError);
});

test("extreme relative measurements never invert a residual column or exceed the viewport", () => {
  let seed = 12345;
  const random = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const width = attempt % 3 === 0 ? Number.MAX_VALUE : 10 ** (random() * 600 - 300);
    const count = 2 + Math.floor(random() * 80);
    const cols = Array.from({ length: count }, (_, key) => ({
      key, width: "auto", intrinsicWidth: random() < .2 ? 0 : 10 ** (random() * 600 - 300)
    }));
    const result = layout([{ key: 0 }], cols, { width });
    assert.ok(result.columnWidths.every(value => Number.isFinite(value) && value >= 0));
    for (const cell of result.cells) {
      assert.ok(Object.values(cell.bounds).every(Number.isFinite));
      assert.ok(cell.bounds.left <= cell.bounds.right);
      assert.ok(cell.bounds.right <= width);
    }
  }
});

test("closed own-data inputs reject invalid shapes without running getters", () => {
  for (const patch of [{ width: 0 }, { width: Infinity }, { rowHeight: -1 }, { header: 1 }, { footer: "yes" },
    { rowLimit: -1 }, { rowLimit: 1.5 }, { rowLimit: Number.MAX_SAFE_INTEGER + 1 }, { rowLimit: null },
    { header: undefined }, { wrap: "word" }]) assert.throws(() => layout(rows, columns, patch));
  assert.throws(() => normalizeTableLayoutOptions({}), /width/);
  assert.throws(() => normalizeTableLayoutOptions(null), /plain object/);
  for (const bad of [null, {}, new Array(1), [{ key: "a", extra: 1 }], [{ key: 0 }, { key: -0 }]]) assert.throws(() => layout(bad));
  for (const bad of [[], null, [{ key: "a" }], [{ key: "a", width: 0 }], [{ key: "a", width: 10, intrinsicWidth: 0 }],
    [{ key: "a", width: "auto" }], [{ key: "a", width: "auto", intrinsicWidth: -1 }],
    [{ key: "a", width: "auto", intrinsicWidth: Infinity }], [{ key: "a", width: 10 }, { key: "a", width: 10 }]]) assert.throws(() => layout(rows, bad));
  let calls = 0;
  for (const [badRows, badColumns, badOptions] of [
    [[{ get key() { calls++; return "a"; } }], columns, { width: 100 }],
    [rows, [{ key: "a", get width() { calls++; return 100; } }], { width: 100 }],
    [rows, columns, { get width() { calls++; return 100; } }]
  ]) assert.throws(() => layoutTableCells(badRows, badColumns, badOptions), /own data/);
  assert.equal(calls, 0);
});

test("bounds and work budgets reject large inputs before producing partial cells", () => {
  assert.throws(() => layout(Array.from({ length: 10001 }, (_, index) => ({ key: index }))), /exceed/);
  assert.throws(() => layout(rows, Array.from({ length: 10001 }, (_, index) => ({ key: index, width: 1 }))), /exceed/);
  assert.throws(() => layout(Array.from({ length: 5000 }, (_, index) => ({ key: index }))), /cell count/);
  assert.throws(() => layout([{ key: "a".repeat(10000001) }]), /work/);
  const row = { key: "a".repeat(30000) };
  assert.throws(() => layout([row], Array.from({ length: 400 }, (_, index) => ({ key: index, width: "auto", intrinsicWidth: 1 }))), /work/);
});
