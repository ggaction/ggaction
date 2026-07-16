import assert from "node:assert/strict";
import test from "node:test";

import {
  alignLegendStart,
  measureLegendSymbolHeight,
  measureLegendTextWidth,
  resolveLegendGrid
} from "../../../src/layout/legend.js";

const config = Object.freeze({
  domain: ["A", "Long"],
  columns: 2,
  direction: "horizontal",
  itemGap: 8,
  labels: Object.freeze({ offset: 4, fontSize: 12 }),
  symbol: Object.freeze({
    layers: Object.freeze([
      Object.freeze({ type: "swatch", height: 10 }),
      Object.freeze({ type: "point", size: 7 }),
      Object.freeze({ type: "line", lineWidth: 3 })
    ])
  })
});

test("measures legend symbols, text, grids, and alignment deterministically", () => {
  assert.equal(measureLegendSymbolHeight(config), 14);
  assert.equal(measureLegendTextWidth("Long"), 28);
  assert.deepEqual(resolveLegendGrid(config, 12, 2), {
    cells: [{ column: 0, row: 0 }, { column: 1, row: 0 }],
    columnWidths: [23, 44],
    gridWidth: 75,
    gridHeight: 14,
    rowHeight: 14
  });
  const bounds = { x: 10, width: 100 };
  assert.equal(alignLegendStart(bounds, 30, "left"), 10);
  assert.equal(alignLegendStart(bounds, 30, "center"), 45);
  assert.equal(alignLegendStart(bounds, 30, "right"), 80);
});

test("lays out vertical legend direction by rows first", () => {
  assert.deepEqual(
    resolveLegendGrid({ ...config, direction: "vertical", columns: 1 }, 12, 2)
      .cells,
    [{ column: 0, row: 0 }, { column: 0, row: 1 }]
  );
});
