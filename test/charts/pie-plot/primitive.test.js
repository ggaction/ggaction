import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { referenceSectors, rows, targets } from "./reference-values.js";
import { displayedActionCalls, assertDisplayedProgram } from "../../support/visual-variants.js";

for (const variant of visualVariants) {
  test(`authors ${variant.variant} sectors with independently calculated angles and paths`, () => {
    const before = structuredClone(rows);
    const p = variant.primitive();
    const expected = referenceSectors(variant.variant);
    const actual = p.graphicSpec.objects.pie.items;
    assert.equal(actual.length, 2);
    assert.deepEqual(expected.map(s => s.weight), variant.variant === "count" ? [2, 1] : [5, 5]);
    assert.deepEqual(expected.map(s => [s.startTheta, s.endTheta]), variant.variant === "count"
      ? [[0, 240], [240, 360]] : [[0, 180], [180, 360]]);
    assert.equal(expected.reduce((n, s) => n + s.share, 0), 1);
    for (const [i, sector] of expected.entries()) {
      assert.equal(actual[i].properties.fill, sector.fill);
      const commands = actual[i].properties.commands;
      assert.equal(commands.length, sector.commands.length);
      for (const [j, command] of sector.commands.entries()) {
        assert.equal(commands[j].op, command.op);
        for (const key of Object.keys(command).filter(key => key !== "op")) {
          assert.ok(Math.abs(commands[j][key] - command[key]) < 1e-9, `${i}/${j}/${key}`);
        }
      }
    }
    assert.deepEqual(rows, before);
    assert.equal(p.semanticSpec.guides.axis, undefined);
    assert.equal(p.semanticSpec.guides.grid, undefined);
    assert.deepEqual(p.guideConfigs.legend.color.domain, ["A", "B"]);
    assert.equal(p.markConfigs.pie.innerRadius, variant.variant === "donut" ? 0.55 : 0);
    assert.deepEqual(p.trace.children.map(c => c.op), ["createCanvas", "createData", "createArcMark", "encodeTheta", "encodeColor", "createGuides"]);
  });
  test(`records the exact displayed ${variant.variant} facade call`, () => {
    const calls = displayedActionCalls(variant.callChain);
    assert.deepEqual(calls.map(c => c.op), ["createCanvas", "createData", "createPiePlot"]);
    assert.deepEqual(calls.at(-1).args, targets[variant.variant]);
    assertDisplayedProgram(variant, variant.userFacing());
  });
}
