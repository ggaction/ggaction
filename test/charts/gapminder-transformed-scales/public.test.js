import assert from "node:assert/strict";
import test from "node:test";

import { createGapminderTransformedScaleScatterplot } from
  "../../../examples/gapminder-transformed-scales/program.js";
import { assertChartProgramsEquivalent } from
  "../../support/chart-equivalence.js";
import { loadGapminder } from "../../support/data.js";
import { createGapminderTransformedScalePrimitives } from
  "./primitive.program.js";

const gapminder = loadGapminder();

test("builds the transformed-scale scatterplot with public actions", () => {
  const program = createGapminderTransformedScaleScatterplot(gapminder);
  const point = program.semanticSpec.layers.find(layer => layer.id === "point");
  const scales = Object.fromEntries(
    program.semanticSpec.scales.map(scale => [scale.id, scale])
  );

  assert.equal(point.data, "gapminder2005");
  assert.equal(point.encoding.x.field, "pop");
  assert.equal(point.encoding.y.field, "fertility");
  assert.equal(scales.x.type, "log");
  assert.equal(scales.x.base, 10);
  assert.equal(scales.y.type, "sqrt");
  assert.equal(program.graphicSpec.objects.point.children.length, 62);
  assert.deepEqual(program.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "filterData",
    "createPointMark",
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeRadius",
    "editPointMark",
    "createGuides",
    "createTitle"
  ]);
});

test("exactly matches the approved transformed-scale primitive", () => {
  assertChartProgramsEquivalent({
    publicProgram: createGapminderTransformedScaleScatterplot(gapminder),
    primitiveProgram: createGapminderTransformedScalePrimitives(gapminder)
  });
});
