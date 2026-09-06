import assert from "node:assert/strict";
import test from "node:test";

import { createRepeatChartsExample } from "../../../examples/repeat-charts/program.js";

test("repeats ordered fields with independent x domains and one parent legend", () => {
  const program = createRepeatChartsExample();
  assert.deepEqual(program.compositionSpec.facet.repeat.fields, ["speed", "quality", "cost"]);
  assert.deepEqual(
    Object.values(program.children).map(child => child.resolvedScales.metricScale.domain),
    [[18, 41], [64, 88], [180, 320]]
  );
  assert.equal(program.compositionSpec.facet.scales.x, "independent");
  assert.equal(program.graphicSpec.objects["metrics-shared-legend"].type, "canvas");
});
