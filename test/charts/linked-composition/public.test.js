import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createLinkedOverlay } from "../../../examples/linked-overlay/program.js";
import { overlayPrimitive } from "./primitive.program.js";

test("public linked overlay exactly matches the approved primitive drawing", () => {
  const publicProgram = createLinkedOverlay(), primitive = overlayPrimitive();
  assertDisplayedProgram(visualVariants[0], publicProgram);
  assert.deepEqual(publicProgram.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(publicProgram.graphicSpec.order, primitive.graphicSpec.order);
  assert.equal(renderToSVG(publicProgram), renderToSVG(primitive));
});
