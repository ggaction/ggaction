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

test("reserves a shared legend lane on its configured edge", () => {
  const options = {
    children: [children[0]],
    padding: { top: 5, right: 7, bottom: 11, left: 13 },
    titleHeight: 20,
    sharedLegend: true,
    sharedLegendGap: 6,
    sharedLegendWidth: 30,
    sharedLegendHeight: 12
  };
  const right = resolveFacetLayout({
    ...options,
    sharedLegendPosition: "right"
  });
  const left = resolveFacetLayout({
    ...options,
    sharedLegendPosition: "left"
  });
  const top = resolveFacetLayout({
    ...options,
    sharedLegendPosition: "top"
  });
  const bottom = resolveFacetLayout({
    ...options,
    sharedLegendPosition: "bottom"
  });

  assert.deepEqual(
    [right.width, right.height, right.children[0].x, right.children[0].y],
    [156, 116, 13, 25]
  );
  assert.deepEqual(
    [left.width, left.height, left.children[0].x, left.children[0].y],
    [156, 116, 49, 25]
  );
  assert.deepEqual(
    [top.width, top.height, top.children[0].x, top.children[0].y],
    [120, 134, 13, 43]
  );
  assert.deepEqual(
    [bottom.width, bottom.height, bottom.children[0].x, bottom.children[0].y],
    [120, 134, 13, 25]
  );
  assert.deepEqual(
    [right.legend.position, right.legend.x, right.legend.y],
    ["right", 126, 55]
  );
  assert.deepEqual(
    [left.legend.position, left.legend.x, left.legend.y],
    ["left", 0, 55]
  );
  assert.deepEqual(
    [top.legend.position, top.legend.x, top.legend.y],
    ["top", 0, 20]
  );
  assert.deepEqual(
    [bottom.legend.position, bottom.legend.x, bottom.legend.y],
    ["bottom", 0, 122]
  );
});

test("reserves outer and per-row facet header lanes exactly once", () => {
  const four = ["a", "b", "c", "d"].map((id, index) => ({
    id,
    value: index,
    width: 100,
    height: 80,
    widthMode: "explicit",
    heightMode: "explicit"
  }));
  const outer = resolveFacetLayout({
    children: four,
    columns: 2,
    gap: 10,
    padding: 0,
    headerLayout: {
      outer: { left: 16.2, top: 14 },
      cellRows: { top: [0, 0], bottom: [0, 0] }
    }
  });
  assert.equal(outer.width, 226.2);
  assert.equal(outer.height, 184);
  assert.deepEqual(outer.children.map(item => [item.x, item.y]), [
    [16.2, 14], [126.2, 14], [16.2, 104], [126.2, 104]
  ]);

  const rows = resolveFacetLayout({
    children: four,
    columns: 2,
    gap: 10,
    padding: 0,
    headerLayout: {
      outer: {},
      cellRows: { top: [14, 14], bottom: [0, 0] }
    }
  });
  assert.equal(rows.height, 198);
  assert.deepEqual(rows.children.map(item => item.y), [14, 14, 118, 118]);
});

test("rejects invalid grid options without mutating inputs", () => {
  const snapshot = structuredClone(children);
  assert.throws(() => resolveFacetLayout({ children, columns: 0 }), /positive integer/);
  assert.throws(() => resolveFacetLayout({ children, gap: -1 }), /non-negative/);
  assert.throws(() => resolveFacetLayout({ children, align: "middle" }), /Unknown composition align/);
  assert.throws(() => resolveFacetLayout({ children, padding: { inline: 2 } }), /Unknown composition padding/);
  assert.throws(
    () => resolveFacetLayout({ children, sharedLegendPosition: "inline" }),
    /Unknown facet shared legend position/
  );
  assert.deepEqual(children, snapshot);
});

test("reserves independent left and right header lanes for each physical column", () => {
  const source = { cellColumns: { left: [20, 30], right: [10, 40] } };
  const layout = resolveFacetLayout({ children, columns: 2, gap: 0, padding: 0, headerLayout: source });
  assert.deepEqual(layout.children.map(child => [child.x, child.y]), [[20, 0], [160, 0], [20, 80]]);
  assert.equal(layout.width, 300);
  assert.equal(layout.height, 160);
  assert.deepEqual(source, { cellColumns: { left: [20, 30], right: [10, 40] } });
  for (const cellColumns of [{ left: [1] }, { right: [-1, 0] }, { top: [0, 0] }, null]) {
    assert.throws(() => resolveFacetLayout({ children, columns: 2, headerLayout: { cellColumns } }));
  }
});
