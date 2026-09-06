import assert from "node:assert/strict";
import test from "node:test";

import { createECDFPrimitive } from "./primitive.program.js";

test("authors the ECDF target through its public data and ordinary line owners", () => {
  const program = createECDFPrimitive();
  assert.doesNotMatch(JSON.stringify(program.trace), /createECDFPlot/);
  assert.equal(program.graphicSpec.objects.ecdf.items.length, 2);
  assert.deepEqual(
    program.semanticSpec.datasets.find(dataset => dataset.id === "ecdfECDFData")
      .transform[0].resolved.groups.map(group => group.denominator),
    [3, 4]
  );
});
