import assert from "node:assert/strict";
import test from "node:test";
import { createMarkOutlinePrimitive } from "./primitive.program.js";
import { resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";

test("anchors the pre-fill contours and zero-width limit with independent literal bounds", () => {
  for (const [variant, expected] of [
    ["rectangle-outline", { left: 76, right: 204, top: 76, bottom: 144 }],
    ["circle-halo", { left: 96, right: 184, top: 66, bottom: 154 }],
    ["path-outline", { left: 76, right: 204, top: 66, bottom: 144 }],
    ["zero-width", { left: 80, right: 200, top: 80, bottom: 140 }]
  ]) {
    const program = createMarkOutlinePrimitive(variant);
    const owner = program.graphicSpec.objects.outlined;
    const item = owner.items[0];
    assert.deepEqual(resolvePrimitiveGraphicBounds(owner.type, item.properties), expected, variant);
    assert.deepEqual(program.graphicSpec.objects["plot-main"].children, ["background", "title", "outlined"]);
  }
  const text = createMarkOutlinePrimitive("text-opacity").graphicSpec.objects.outlined.items[0].properties;
  assert.equal(text.text, "AB");
  assert.equal(text.opacity, 0.5);
  assert.deepEqual(text.outline, { color: "rgb(92,42,115)", width: 8 });
  assert.equal(text.stroke, undefined);
  assert.deepEqual(createMarkOutlinePrimitive("clip").graphicSpec.objects.outlined.clip,
    { x: 90, y: 60, width: 105, height: 80 });
});
