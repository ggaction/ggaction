import assert from "node:assert/strict";
import test from "node:test";

import { resolveFacetLayout } from "../../../../src/layout/facets.js";

const children = ["a", "b", "c"].map((id, index) => ({
  id,
  value: index,
  width: 100,
  height: 80,
  widthMode: "explicit",
  heightMode: "explicit"
}));

test("lays out one row by default and wraps row-major with explicit columns", () => {
  const row = resolveFacetLayout({ children, titleHeight: 52, sharedLegend: true });
  const wrapped = resolveFacetLayout({
    children,
    columns: 2,
    gap: 18,
    padding: 14,
    titleHeight: 52,
    sharedLegend: true
  });

  assert.deepEqual(row.children.map(child => [child.column, child.row]), [
    [0, 0], [1, 0], [2, 0]
  ]);
  assert.equal(row.gridWidth, 332);
  assert.equal(row.width, 482);
  assert.deepEqual(wrapped.children.map(child => [child.column, child.row]), [
    [0, 0], [1, 0], [0, 1]
  ]);
  assert.deepEqual(wrapped.children.map(child => [child.x, child.y]), [
    [14, 66], [132, 66], [14, 164]
  ]);
  assert.equal(wrapped.width, 396);
  assert.equal(wrapped.height, 258);
});

test("aligns unequal children inside stable grid tracks", () => {
  const layout = resolveFacetLayout({
    children: [
      { ...children[0], width: 80, height: 60 },
      { ...children[1], width: 120, height: 80 },
      { ...children[2], width: 100, height: 70 }
    ],
    columns: 2,
    align: "end",
    gap: 10
  });

  assert.deepEqual(layout.children.map(child => [child.x, child.y]), [
    [20, 20], [110, 0], [0, 90]
  ]);
});

test("rejects invalid grid options without mutating inputs", () => {
  const snapshot = structuredClone(children);
  assert.throws(() => resolveFacetLayout({ children, columns: 0 }), /positive integer/);
  assert.throws(() => resolveFacetLayout({ children, gap: -1 }), /non-negative/);
  assert.throws(() => resolveFacetLayout({ children, align: "middle" }), /Unknown composition align/);
  assert.throws(() => resolveFacetLayout({ children, padding: { inline: 2 } }), /Unknown composition padding/);
  assert.deepEqual(children, snapshot);
});
