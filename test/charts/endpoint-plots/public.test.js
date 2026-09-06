import test from "node:test";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { visualVariants } from "./manifest.js";

for (const variant of visualVariants) {
  test(`${variant.chart} matches its explicit lower action chain`, () => {
    assertChartProgramsEquivalent({
      primitiveProgram: variant.primitive(),
      publicProgram: variant.userFacing()
    });
  });
}
