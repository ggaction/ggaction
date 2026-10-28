import assert from "node:assert/strict";
import test from "node:test";
import { GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { visualVariants, frame } from "./manifest.js";
import { fontFamily } from "../../../examples/mark-outlines/data.js";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
for (const v of visualVariants) test(`${v.variant}: public outline matches concrete properties, drawing order and pixels`, () => {
  const font = GlobalFonts.registerFromPath(fileURLToPath(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)), fontFamily);
  try {
    const publicProgram = v.userFacing(), primitive = v.primitive();
    assertEquivalentMeaning(publicProgram.graphicSpec, primitive.graphicSpec);
    assertDisplayedProgram(v, publicProgram);
    const actual = renderWithNativeTrace(publicProgram, frame), expected = renderWithNativeTrace(primitive, frame);
    assert.deepEqual(actual.rgba, expected.rgba);
    assert.deepEqual(actual.calls, expected.calls);
    assert.equal(publicProgram.graphicSpec.objects.outlined.items.length, 1);
    assert.equal(publicProgram.graphicSpec.objects.outlined.items[0].identity.lineage.rowKeys.length, v.variant === "path-outline" ? 3 : 1);
  } finally { GlobalFonts.remove(font); }
});
