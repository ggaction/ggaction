import assert from "node:assert/strict";
import test from "node:test";

import { createTimeUnitComparisonPrimitives } from "./primitive.program.js";
import { MONTH_ROWS } from "./reference-values.js";

test("authors the UTC month comparison through explicit data primitives", () => {
  const program = createTimeUnitComparisonPrimitives();
  const raw = program.children.raw;
  const bucketed = program.children.bucketed;

  assert.equal(raw.graphicSpec.objects.rawEvents.items.length, 9);
  assert.deepEqual(bucketed.semanticSpec.datasets[1].values, MONTH_ROWS);
  assert.equal(
    bucketed.trace.children.some(node => node.op === "createTimeUnitData"),
    false
  );
});
