import assert from "node:assert/strict";
import test from "node:test";

import { EVENT_ROWS, MONTH_ROWS } from "./reference-values.js";

test("anchors the comparison to literal UTC month boundaries", () => {
  assert.deepEqual(MONTH_ROWS.map(row => row.month), [
    Date.UTC(2024, 0, 1),
    Date.UTC(2024, 0, 1),
    Date.UTC(2024, 0, 1),
    Date.UTC(2024, 1, 1),
    Date.UTC(2024, 1, 1),
    Date.UTC(2024, 1, 1),
    Date.UTC(2024, 2, 1),
    Date.UTC(2024, 2, 1),
    Date.UTC(2024, 2, 1)
  ]);
  assert.equal(EVENT_ROWS.every(row => !Object.hasOwn(row, "month")), true);
});
