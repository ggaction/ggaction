import assert from "node:assert/strict";
import test from "node:test";

import { createOrderedCategoryBarComparisonPrimitives } from
  "./primitive.program.js";
import {
  AUTOMATIC_DOMAIN,
  DESCENDING_TOTAL_DOMAIN
} from "./reference-values.js";

test("authors the comparison through semantic and materialization primitives", () => {
  const program = createOrderedCategoryBarComparisonPrimitives();
  assert.deepEqual(program.children.automatic.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.deepEqual(program.children.ordered.resolvedScales.x.domain, DESCENDING_TOTAL_DOMAIN);
  assert.deepEqual(program.children.reset.resolvedScales.x.domain, AUTOMATIC_DOMAIN);
  assert.equal(
    Object.values(program.children).some(child =>
      child.trace.children.some(node => node.op === "orderCategories")
    ),
    false
  );
});
