import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { bucketedCallChain } from "./manifest.js";
import { createTimeUnitComparisonPrimitives } from "./primitive.program.js";
import { createTimeUnitComparison } from "./public.program.js";
import { MONTH_ROWS } from "./reference-values.js";

test("matches the month-bucketing primitive through the public action", () => {
  const primitiveProgram = createTimeUnitComparisonPrimitives();
  const publicProgram = createTimeUnitComparison();

  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  const bucketed = publicProgram.children.bucketed;
  assertDisplayedProgram({
    chart: "time-unit-data",
    variant: "month-bucketing",
    callChain: bucketedCallChain
  }, bucketed);
  assert.deepEqual(bucketed.semanticSpec.datasets[1].values, MONTH_ROWS);
  assert.equal(bucketed.graphicSpec.objects.bucketedEvents.items.length, 9);
  assert.deepEqual(
    bucketed.trace.children.map(node => node.op),
    [
      "createCanvas",
      "createData",
      "createTimeUnitData",
      "createScatterPlot",
      "encodePointRadius",
      "createTitle"
    ]
  );
});
