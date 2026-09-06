import assert from "node:assert/strict";
import test from "node:test";
import { resolveLineItems } from "../../../src/materialization/selection/items/path.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { cases } from "./fixture.js";
import { referenceFor } from "./reference-values.js";
import { visualVariants } from "./manifest.js";

for (const [index, variant] of visualVariants.entries()) {
  test(`${variant.variant} public actions match primitive graphics and exact source membership`, () => {
    const program = variant.userFacing();
    assertChartProgramsEquivalent({ publicProgram: program,
      primitiveProgram: variant.primitive(), compareSemanticSpec: false });
    assertDisplayedProgram(variant, program);
    const layer = program.semanticSpec.layers[0];
    const dataset = program.semanticSpec.datasets[0];
    const fixture = cases[index];
    assert.deepEqual(layer.encoding.group, {
      ...(fixture.fields.length === 1 ? { field: fixture.fields[0] } : { fields: fixture.fields }),
      fieldType: "nominal"
    });
    const items = resolveLineItems(program, layer, dataset);
    assert.deepEqual(items.map(item => item.members), referenceFor(fixture).paths.map(
      path => path.indices.map(i => fixture.rows[i])
    ));
    const selected = program.selectMarks({ target: "series", id: "japan",
      field: "country", op: "eq", value: "Japan" });
    assert.equal(resolveStoredSelection(selected, "japan").keys.length,
      fixture.id === "tuple-color-dash" ? 2 : 1);
  });
}
