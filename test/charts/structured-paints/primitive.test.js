import assert from "node:assert/strict";
import test from "node:test";
import { variants } from "./manifest.js";
import { createStructuredPaintPrimitive } from "./primitive.program.js";
import { patternInk } from "../../oracles/patterns.js";
import { radialOffset } from "../../oracles/radial-gradient.js";

test("explicit fill primitives pin plot bounds, normalized origins and independent coverage anchors", () => {
  for (const variant of variants) {
    const p = createStructuredPaintPrimitive(variant);
    const glyph = p.graphicSpec.objects.paint.items[0].properties;
    assert.deepEqual([glyph.x, glyph.y, glyph.width, glyph.height], [20, 20, 220, 140]);
    if (variant.fill.type === "pattern") assert.deepEqual(glyph.fill.origin, { x: 23, y: 25 });
    else assert.equal(radialOffset(glyph.fill, glyph.fill.focal), 0);
  }
  assert.equal(patternInk("cross", 0, 0, 3 / 16), true);
  assert.equal(patternInk("cross", .5, .5, 3 / 16), false);
  const ellipse = variants.find(v => v.id === "radial-ellipse").fill;
  assert.equal(radialOffset(ellipse, { x: 1, y: .5 }), 1);
  assert.equal(radialOffset(ellipse, { x: .5, y: 1 }), 1);
});
