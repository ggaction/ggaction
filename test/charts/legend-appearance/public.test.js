import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
for (const variant of visualVariants) {
  test(`${variant.variant} preserves literal graphics, order, native calls and all pixels`, () => {
    const actual = variant.userFacing(), expected = variant.primitive();
    assertDisplayedProgram(variant, actual);
    assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
    const dimensions = { width: variant.width, height: variant.height };
    assert.deepEqual(renderWithNativeTrace(actual, dimensions), renderWithNativeTrace(expected, dimensions));
  });
}
