import assert from "node:assert/strict";
import test from "node:test";

import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import {
  comparisonCallChain,
  orderedCallChain,
  resetCallChain
} from "./manifest.js";
import { createOrderedCategoryBarComparisonPrimitives } from
  "./primitive.program.js";
import { createOrderedCategoryBarComparison } from "./public.program.js";
import {
  AUTOMATIC_DOMAIN,
  CATEGORY_TOTALS,
  DESCENDING_TOTAL_DOMAIN
} from "./reference-values.js";

test("matches primitives through the public category-order lifecycle", () => {
  const primitive = createOrderedCategoryBarComparisonPrimitives();
  const program = createOrderedCategoryBarComparison();
  assertChartProgramsEquivalent({ primitiveProgram: primitive, publicProgram: program });
  assertDisplayedProgram({
    chart: "ordered-category-bar",
    variant: "automatic-ordered-reset",
    callChain: comparisonCallChain
  }, program);

  const { automatic, ordered, reset } = program.children;
  assert.deepEqual(automatic.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.deepEqual(ordered.resolvedScales.x.domain, DESCENDING_TOTAL_DOMAIN);
  assert.deepEqual(reset.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.deepEqual(
    ordered.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text),
    DESCENDING_TOTAL_DOMAIN
  );
  assert.deepEqual(CATEGORY_TOTALS, {
    Support: 14,
    Product: 31,
    Sales: 24,
    Operations: 18
  });
  assertDisplayedProgram({
    chart: "ordered-category-bar",
    variant: "ordered-panel",
    callChain: orderedCallChain
  }, ordered);
  assertDisplayedProgram({
    chart: "ordered-category-bar",
    variant: "reset-panel",
    callChain: resetCallChain
  }, reset);
});
