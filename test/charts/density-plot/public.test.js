import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";

for (const variant of visualVariants) {
  test(`completes ${variant.variant} density with exact lower-owner parity`, () => {
    const publicProgram = variant.userFacing();
    assertDisplayedProgram(variant, publicProgram);
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram: variant.primitive() });
    assert.deepEqual(publicProgram.trace.children.at(-1).children.map(child => child.op),
      ["createAreaMark", "encodeDensity", ...(variant.variant === "vertical" ? [] : ["encodeColor"]), "createGuides"]);
  });
  test(`preserves ${variant.variant} statistics, scale, area and Canvas revisions`, () => {
    const edit = program => {
      const channel = variant.variant === "horizontal" ? "y" : "x";
      const id = program.semanticSpec.layers[0].encoding[channel].scale;
      return program.editDensity({ target: "density", bandwidth: 0.8, steps: 71, extent: [-1, 7] })
        .editAreaMark({ target: "density", opacity: 0.6, stroke: "black", strokeWidth: 2 })
        .editScale({ id, domain: [-1, 7] }).editCanvas({ width: 1100, height: 760 });
    };
    assertChartProgramsEquivalent({ publicProgram: edit(variant.userFacing()), primitiveProgram: edit(variant.primitive()) });
  });
}
