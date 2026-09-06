import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { buildReferenceAnnularSectorCommands } from "../polar-arcs/reference-values.js";

for (const variant of visualVariants) {
  test(`keeps ${variant.variant} category ordering equivalent to explicit primitives and literal sectors`, () => {
    const program = variant.userFacing();
    assertDisplayedProgram(variant, program);
    assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: variant.primitive() });
    const expected = [
      { startTheta: 0, endTheta: 160, fill: "#e45756" },
      { startTheta: 160, endTheta: 240, fill: "#4c78a8" },
      { startTheta: 240, endTheta: 360, fill: "#f58518" }
    ];
    for (const [index, sector] of expected.entries()) {
      const commands = buildReferenceAnnularSectorCommands({ ...sector,
        innerRadius: 0, outerRadius: 200, padAngle: 0,
        frame: { centerX: 500, centerY: 350, availableRadius: 200 } });
      const actual = program.graphicSpec.objects.pie.items[index].properties;
      assert.equal(actual.fill, sector.fill);
      assert.equal(actual.commands.length, commands.length);
      for (const [i, command] of commands.entries()) {
        assert.equal(actual.commands[i].op, command.op);
        for (const key of Object.keys(command).filter(key => key !== "op")) {
          assert.ok(Math.abs(command[key] - actual.commands[i][key]) < 1e-9);
        }
      }
    }
    assert.deepEqual(program.graphicSpec.objects.colorLegendLabels.items.map(i => i.properties.text),
      variant.variant === "linked" ? ["C", "A", "B"] : ["B", "A", "C"]);
    const edit = p => p.editCanvas({ width: 1100 }).editArcMark({ target: "pie", innerRadius: 0.4 });
    assertChartProgramsEquivalent({ publicProgram: edit(program), primitiveProgram: edit(variant.primitive()) });
  });
}
