import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { buildReferenceAnnularSectorCommands } from "../polar-arcs/reference-values.js";
const expectedRadii = {
  "rose-disk": [Math.sqrt(0.5) * 140, Math.sqrt(0.75) * 140, 140],
  "rose-hole": [Math.sqrt(12250), Math.sqrt(15925), 140],
  "radial-disk": [70, 105, 140],
  "radial-hole": [105, 122.5, 140],
  "radial-theta-legend-order": [140, 105, 122.5]
};
for (const variant of visualVariants) {
  test(`matches ${variant.variant} primitives, Canvas calls, and independent polar geometry`, () => {
    const p = variant.userFacing();
    assertDisplayedProgram(variant, p);
    assertChartProgramsEquivalent({ publicProgram: p, primitiveProgram: variant.primitive() });
    const innerRadius = variant.variant.endsWith("disk") ? 0 : 70;
    const expectedColors = variant.variant === "radial-theta-legend-order"
      ? ["#e45756", "#4c78a8", "#f58518"] : ["#4c78a8", "#f58518", "#e45756"];
    for (const [index, outerRadius] of expectedRadii[variant.variant].entries()) {
      const expected = buildReferenceAnnularSectorCommands({ innerRadius, outerRadius,
        startTheta: -60 + 120 * index, endTheta: 60 + 120 * index, padAngle: 0,
        frame: { centerX: 500, centerY: 350, availableRadius: 200 } });
      const actual = p.graphicSpec.objects.sectors.items[index].properties;
      assert.equal(actual.fill, expectedColors[index]);
      assert.equal(actual.commands.length, expected.length);
      for (const [i, command] of expected.entries()) {
        assert.equal(actual.commands[i].op, command.op);
        for (const key of Object.keys(command).filter(key => key !== "op")) {
          assert.ok(Math.abs(actual.commands[i][key] - command[key]) < 1e-9);
        }
      }
    }
    const edit = program => program.editCanvas({ width: 1100 }).editScale({ id: "radius", domain: [0, 8] });
    assertChartProgramsEquivalent({ publicProgram: edit(p), primitiveProgram: edit(variant.primitive()) });
  });
}
