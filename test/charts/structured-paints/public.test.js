import assert from "node:assert/strict";
import test from "node:test";
import { variants } from "./manifest.js";
import { createStructuredPaintExample } from "../../../examples/structured-paints/program.js";
import { createStructuredPaintPrimitive } from "./primitive.program.js";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
for (const variant of variants) test(`${variant.id}: public interval converges with explicit concrete paint`, () => {
  const program = createStructuredPaintExample(variant), primitive = createStructuredPaintPrimitive(variant);
  assertEquivalentMeaning(program.graphicSpec, primitive.graphicSpec);
  const actual = renderWithNativeTrace(program, { width: 260, height: 180 });
  const expected = renderWithNativeTrace(primitive, { width: 260, height: 180 });
  assert.deepEqual(actual.rgba, expected.rgba);
  assert.deepEqual(actual.calls, expected.calls);
  assert.equal(program.graphicSpec.objects.paint.items[0].identity.lineage.rowKeys.length, 1);
});
