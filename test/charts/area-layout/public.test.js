import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
for (const variant of visualVariants) test(`${variant.variant} matches its primitive and displayed public calls`, () => {
  const publicProgram = variant.userFacing();
  assertDisplayedProgram(variant, publicProgram);
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: variant.primitive() });
});
test("Bar layout roundtrip is expressed as three real assignments", () => {
  const p = visualVariants.find(v => v.variant === "bar-layout-roundtrip").userFacing();
  assert.deepEqual(p.trace.children.filter(c => c.op === "layoutSeries").map(c => c.args.mode), ["group", "stack", "group"]);
});
