import { assertEquivalentMeaning, comparableSVG } from "../../support/identity-equivalence.js";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createLinkedOverlay } from "../../../examples/linked-overlay/program.js";
import { overlayPrimitive } from "./primitive.program.js";

test("public linked overlay exactly matches the approved primitive drawing", () => {
  const publicProgram = createLinkedOverlay(), primitive = overlayPrimitive();
  assertDisplayedProgram(visualVariants[0], publicProgram);
  assertEquivalentMeaning(publicProgram.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
  assert.equal(comparableSVG(publicProgram), comparableSVG(primitive));
});

for (const variant of visualVariants.slice(1)) test(`${variant.chart} matches the approved primitive drawing`, () => {
  const actual = variant.userFacing(), expected = variant.primitive();
  assertDisplayedProgram(variant, actual);
  assertEquivalentMeaning(actual.graphicSpec, expected.graphicSpec);
  assert.equal(comparableSVG(actual), comparableSVG(expected));
});
