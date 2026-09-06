import assert from "node:assert/strict";
import test from "node:test";

import { fittedLabelRows } from
  "../../../examples/fitted-long-labels/program.js";
import { createFittedLongLabelsPrimitive } from "./primitive.program.js";

test("keeps the explicit fitted-margin primitive baseline", () => {
  const program = createFittedLongLabelsPrimitive(fittedLabelRows);
  assert.deepEqual(program.materializationConfigs.canvas.margin, {
    top: 60,
    right: 4,
    bottom: 81.5,
    left: 39.75
  });
  assert.equal(program.graphicSpec.objects.xAxisLabels.items.length, 10);
  assert.equal(program.trace.children.some(node => node.op === "fitCanvas"), false);
});
