import assert from "node:assert/strict";
import test from "node:test";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) {
  test(`${variant.variant} shares exact graphics, order, Canvas calls and RGBA`, () => {
    const actual = variant.userFacing(), expected = variant.primitive();
    assertDisplayedProgram(variant, actual);
    assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
    assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
    const dimensions = { width: variant.width, height: variant.height };
    assert.deepEqual(renderWithNativeTrace(actual, dimensions), renderWithNativeTrace(expected, dimensions));
  });
}
