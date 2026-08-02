import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOMATIC_DOMAIN,
  CATEGORY_TOTALS,
  DESCENDING_TOTAL_DOMAIN,
  ORDERED_CATEGORY_ROWS
} from "./reference-values.js";

test("anchors automatic and descending-total order to literal reference values", () => {
  assert.deepEqual(AUTOMATIC_DOMAIN, ["Support", "Product", "Sales", "Operations"]);
  assert.deepEqual(DESCENDING_TOTAL_DOMAIN, ["Product", "Sales", "Operations", "Support"]);
  assert.deepEqual(
    Object.fromEntries(AUTOMATIC_DOMAIN.map(category => [
      category,
      ORDERED_CATEGORY_ROWS
        .filter(row => row.category === category)
        .reduce((sum, row) => sum + row.value, 0)
    ])),
    CATEGORY_TOTALS
  );
});
