import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { visualVariants } from "./manifest.js";
import { expectedRows } from "./reference-values.js";
for (const variant of visualVariants) test("seeded raw-data computation matches the independent band and line exactly", () => {
  const actual = variant.userFacing(), expected = variant.primitive();
  assertDisplayedProgram(variant, actual);
  assert.deepEqual(actual.semanticSpec.datasets.find(dataset => dataset.id === "intervals").values, expectedRows);
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: expected, compareSemanticSpec: false });
  assert.equal(renderToSVG(actual), renderToSVG(expected));
  assert.deepEqual(renderWithNativeTrace(actual, { width: 320, height: 220 }), renderWithNativeTrace(expected, { width: 320, height: 220 }));
});
