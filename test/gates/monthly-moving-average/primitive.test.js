import assert from "node:assert/strict";
import test from "node:test";

import { createMonthlyMovingAveragePrimitives } from "./primitive.program.js";
import { MONTHLY_MOVING_ROWS, MONTHLY_ROWS } from "./reference-values.js";

test("authors the monthly moving-average visual target without future window actions", () => {
  const program = createMonthlyMovingAveragePrimitives();
  assert.equal(
    program.graphicSpec.objects.monthly.items[0].properties.commands.length,
    MONTHLY_ROWS.length
  );
  assert.equal(
    program.graphicSpec.objects.moving.items[0].properties.commands.length,
    MONTHLY_MOVING_ROWS.length
  );
  assert.equal(
    program.trace.children.some(node => node.op === "createWindowData"),
    false
  );
  assert.deepEqual(program.resolvedScales.y.domain, [0, 60]);
});
