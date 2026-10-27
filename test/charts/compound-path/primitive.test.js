import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
for (const variant of visualVariants) test(`${variant.variant}: concrete primitive and public structure agree`, () => {
  const actual=variant.userFacing(),expected=variant.primitive();
  assert.deepEqual(actual.graphicSpec,expected.graphicSpec);
  assertDisplayedProgram(variant,actual);
});
