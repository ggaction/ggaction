import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";

for (const variant of visualVariants) {
  test(`creates ${variant.variant} with exact semantic, graphic and Canvas parity`, () => {
    const publicProgram = variant.userFacing();
    assertDisplayedProgram(variant, publicProgram);
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram: variant.primitive() });
    assert.deepEqual(publicProgram.trace.children.at(-1).children.map(child => child.op),
      ["createArcMark", "encodeTheta", "encodeColor", "createGuides"]);
  });
  test(`preserves ${variant.variant} parity through lower arc, theta and canvas edits`, () => {
    const edit = program => program
      .editArcMark({ target: "pie", innerRadius: 0.3, padAngle: 1, opacity: 0.7 })
      .encodeTheta({ target: "pie", field: "category", fieldType: "nominal", aggregate: "count" })
      .editCanvas({ width: 1100, height: 760 });
    assertChartProgramsEquivalent({ publicProgram: edit(variant.userFacing()), primitiveProgram: edit(variant.primitive()) });
  });
}
