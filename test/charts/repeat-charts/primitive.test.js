import assert from "node:assert/strict";
import test from "node:test";

import { createRepeatChartsPrimitive } from "./primitive.program.js";

test("authors three independently encoded units and one explicit shared legend", () => {
  const program = createRepeatChartsPrimitive();
  assert.doesNotMatch(JSON.stringify(program.trace), /repeatCharts/);
  assert.equal(program.compositionSpec.children.length, 3);
  assert.deepEqual(
    Object.values(program.children).map(child => child.semanticSpec.layers[0].encoding.x.field),
    ["speed", "quality", "cost"]
  );
  assert.equal(program.graphicSpec.objects.sharedLegend.type, "canvas");
});
