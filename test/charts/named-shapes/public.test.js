import assert from "node:assert/strict";
import test from "node:test";
import { summarizeArgs } from "../../../src/core/action.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram, displayedActionCalls } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test("named glyphs preserve exact independent graphics, order, native calls, RGBA and trace", () => {
    const actual = variant.userFacing(), expected = variant.primitive();
    assertDisplayedProgram(variant, actual);
    assert.deepEqual(actual.trace.children.map(({op,args})=>({op,args})),
      displayedActionCalls(variant.callChain).map(({op,args})=>({op,args:summarizeArgs(args)})));
    assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: expected, compareSemanticSpec: false });
    const dimensions = { width: variant.width, height: variant.height };
    assert.deepEqual(renderWithNativeTrace(actual, dimensions), renderWithNativeTrace(expected, dimensions));
    assert.deepEqual(deserializeProgram(serializeProgram(actual)).graphicSpec, actual.graphicSpec);
    assert.deepEqual(actual.semanticSpec.layers[0].encoding.angle, { field: "angle", fieldType: "quantitative" });
  });
}
