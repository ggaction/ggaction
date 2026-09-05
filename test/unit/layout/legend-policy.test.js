import assert from "node:assert/strict";
import test from "node:test";

import {
  alignLegendStart,
  measureLegendTextWidth,
  resolveLegendGrid
} from "../../../src/layout/legend.js";

const config = Object.freeze({
  domain: ["A", "Long"],
  columns: 2,
  direction: "horizontal",
  itemGap: 8,
  labels: Object.freeze({ offset: 4, fontSize: 12 })

});

test("measures legend symbols, text, grids, and alignment deterministically", () => {
  assert.ok(Math.abs(measureLegendTextWidth("Long") - 24.24) < 1e-12);
  assert.deepEqual(resolveLegendGrid(config, 12, 2, 14), {
    cells: [{ column: 0, row: 0 }, { column: 1, row: 0 }],
    columnWidths: [23.32, 40.24],
    gridWidth: 71.56,
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
    resolveLegendGrid({ ...config, direction: "vertical", columns: 1 }, 12, 2, 14)
      .cells,
    [{ column: 0, row: 0 }, { column: 0, row: 1 }]
  );
});
