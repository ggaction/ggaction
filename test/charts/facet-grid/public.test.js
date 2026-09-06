import assert from "node:assert/strict";
import test from "node:test";

import { createFacetGridExample } from "../../../examples/facet-grid/program.js";

test("creates stable row-column cells and preserves the missing pair as blank", () => {
  const program = createFacetGridExample();
  assert.deepEqual(program.compositionSpec.facet.grid.rows.values, ["North", "South"]);
  assert.deepEqual(program.compositionSpec.facet.grid.columns.values, ["Q1", "Q2", "Q3"]);
  assert.deepEqual(
    program.compositionSpec.facet.grid.cells.map(cell => [cell.row, cell.column, cell.empty]),
    [
      [0, 0, false], [0, 1, false], [0, 2, false],
      [1, 0, false], [1, 1, true], [1, 2, false]
    ]
  );
  const blank = program.children["matrix-row-2-column-2"];
  assert.equal(blank.semanticSpec.layers.length, 0);
  assert.equal(blank.graphicSpec.objects.canvas.type, "canvas");
});
