import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants, patternFixture, styles } from "./manifest.js";
import { assertDisplayedProgram } from "../../../../support/visual-variants.js";
import { samplePixels, expectedColor } from "./reference.js";
import { validatePathCommands } from "../../../../../src/grammar/pathCommands.js";

test("keeps all seven primitive pattern targets and four explicit panels", () => {
  assert.deepEqual(styles, ["solid", "diagonal", "antidiagonal", "horizontal", "vertical", "cross", "dots"]);
  for (const variant of visualVariants) {
    const fixture = patternFixture(variant.variant), program = variant.primitive();
    assertDisplayedProgram(variant, program);
    assert.equal(fixture.bars.length, 8);
    assert.equal(program.semanticSpec.datasets.length, 0);
    for (const bar of fixture.bars) {
      assert.ok(bar.commands.length < 30000);
      assert.equal(validatePathCommands(bar.commands).length, bar.commands.length);
    }
    assert.ok(samplePixels(fixture).length >= 11);
  }
});

test("anchors plot/object phase and single alpha multiplication with literal values", () => {
  const fixture = patternFixture("solid");
  assert.deepEqual(fixture.bars[0].origin, [24, 60]);
  assert.deepEqual(fixture.bars[2].origin, [342, 88]);
  assert.deepEqual(fixture.bars[4].origin, [31, 235]);
  assert.deepEqual(expectedColor(fixture.bars[6], ...fixture.bars[6].circle.center), [157, 195, 198, 255]);
  assert.deepEqual(expectedColor(fixture.bars[6], fixture.bars[6].bounds.x + 3, fixture.bars[6].bounds.y + 3), [226, 232, 240, 255]);
  assert.equal(patternFixture("dots").bars[6].options.strokeWidth, 20);
});
