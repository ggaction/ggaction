import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { visualVariants } from "./manifest.js";
import { expectedColors } from "./reference-values.js";

for (const variant of visualVariants) test("quantitative area fills match independent primitives, native calls, RGBA and displayed trace exactly", () => {
  const actual = variant.userFacing(), expected = variant.primitive();
  assertDisplayedProgram(variant, actual);
  assertChartProgramsEquivalent({ publicProgram: actual, primitiveProgram: expected, compareSemanticSpec: false });
  assert.equal(renderToSVG(actual), renderToSVG(expected));
  assert.deepEqual(renderWithNativeTrace(actual, { width: 320, height: 220 }), renderWithNativeTrace(expected, { width: 320, height: 220 }));
  assert.deepEqual(actual.graphicSpec.objects.areaPlot.items.map(item => item.properties.fill), expectedColors);
  assert.deepEqual(actual.trace.children.map(node => node.op), ["createCanvas", "createData", "createAreaPlot", "encodeGroup", "encodeColor", "layoutSeries", "editAreaMark"]);
  assert.equal(actual.semanticSpec.layers[0].encoding.color.fieldType, "quantitative");
});
