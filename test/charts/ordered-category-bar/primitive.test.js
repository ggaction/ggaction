import assert from "node:assert/strict";
import test from "node:test";

import { createOrderedCategoryBarComparisonPrimitives } from
  "./primitive.program.js";
import {
  AUTOMATIC_DOMAIN,
  DESCENDING_TOTAL_DOMAIN
} from "./reference-values.js";

test("authors the category-order comparison through explicit primitives", () => {
  const program = createOrderedCategoryBarComparisonPrimitives();
  assert.deepEqual(program.children.automatic.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.deepEqual(program.children.ordered.resolvedScales.x.domain, DESCENDING_TOTAL_DOMAIN);
  assert.deepEqual(program.children.reset.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
});
