import test from "node:test";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test("Bullet public composition matches its independent primitive tree", () => {
  const program = variant.userFacing(); assertDisplayedProgram(variant, program);
  assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: variant.primitive(), compareSemanticSpec: false });
});
