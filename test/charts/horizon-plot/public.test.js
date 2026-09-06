import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";

for (const variant of visualVariants) {
  test(`completes ${variant.variant} Horizon with exact lower-owner parity`, () => {
    const publicProgram = variant.userFacing();
    assertDisplayedProgram(variant, publicProgram);
    assertChartProgramsEquivalent({ publicProgram, primitiveProgram: variant.primitive() });
    const facade = publicProgram.trace.children.find(child => child.op === "createHorizonPlot");
    assert.deepEqual(facade.children.map(child => child.op),
      ["createAreaMark", "encodeHorizon", ...(variant.variant === "baseline-style" ? ["editAreaMark"] : []), "createGuides"]);
  });
  test(`preserves ${variant.variant} Horizon through band, palette, style, scale and Canvas edits`, () => {
    const edit = program => {
      const scale = program.semanticSpec.layers[0].encoding.x.scale;
      return program.editHorizon({ target: "horizon", bands: 2, palette: { positive: "greens", negative: "oranges" } })
        .editAreaMark({ target: "horizon", opacity: 0.7, stroke: "black", strokeWidth: 1 })
        .editScale({ id: scale, reverse: true }).editCanvas({ width: 1100, height: 760 });
    };
    assertChartProgramsEquivalent({ publicProgram: edit(variant.userFacing()), primitiveProgram: edit(variant.primitive()) });
  });
}
