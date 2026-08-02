import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { createOrderedCategoryBarComparisonPrimitives } from
  "./primitive.program.js";
import { createOrderedCategoryBarComparison } from "./public.program.js";
import { AUTOMATIC_DOMAIN, DESCENDING_TOTAL_DOMAIN } from
  "./reference-values.js";

test("matches the ordered category primitive through the public lifecycle", () => {
  const primitiveProgram = createOrderedCategoryBarComparisonPrimitives();
  const publicProgram = createOrderedCategoryBarComparison();
  assertChartProgramsEquivalent({ primitiveProgram, publicProgram });
  assert.deepEqual(publicProgram.children.automatic.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.deepEqual(publicProgram.children.ordered.resolvedScales.x.domain, DESCENDING_TOTAL_DOMAIN);
  assert.deepEqual(publicProgram.children.reset.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
});
