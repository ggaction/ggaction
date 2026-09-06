import assert from "node:assert/strict";
import test from "node:test";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { resolvePointItems } from "../../../src/materialization/selection/items/point.js";
import { cases, rows } from "./fixture.js";
import { referenceFor } from "./reference-values.js";
import { visualVariants } from "./manifest.js";

for (const [index, variant] of visualVariants.entries()) {
  test(`${variant.variant} public temporal input matches independent primitive graphics and normalized meaning`, () => {
    const program = variant.userFacing();
    const layer = program.semanticSpec.layers[0];
    const dataset = program.semanticSpec.datasets[0];
    const reference = referenceFor(cases[index]);
    assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: variant.primitive(), compareSemanticSpec: false });
    assertDisplayedProgram(variant, program);
    assert.deepEqual(layer.encoding.x, { field: "time", fieldType: "temporal", temporalUnit: cases[index].unit, scale: "x" });
    assert.deepEqual(dataset.values, rows);
    assert.deepEqual(program.resolvedScales.x.domain, reference.domain);
    assert.deepEqual(resolvePointItems(program, layer, dataset).map(item => item.channels.x), reference.timestamps);
    assert.deepEqual(program.graphicSpec.objects.xAxisLabels.items.map(item => item.properties.text), reference.labels);
  });
}
