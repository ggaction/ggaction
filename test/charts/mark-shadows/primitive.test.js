import assert from "node:assert/strict";
import test from "node:test";
import { createMarkShadowPrimitive } from "./primitive.program.js";

test("explicit shadow primitives retain literal source geometry, negative offsets and clipping", () => {
  const negative = createMarkShadowPrimitive("negative-offset");
  const item = negative.graphicSpec.objects.shadowed.items[0].properties;
  assert.deepEqual([item.x, item.y, item.width, item.height], [80, 80, 70, 60]);
  assert.deepEqual(item.shadow, { color: "rgba(30,60,90,.5)", offsetX: -14, offsetY: -10, blurRadius: 8 });
  const circle = createMarkShadowPrimitive("circle").graphicSpec.objects.shadowed.items[0].properties;
  assert.deepEqual([circle.x, circle.y, circle.radius], [115, 110, 26]);
  assert.deepEqual(createMarkShadowPrimitive("clip").graphicSpec.objects.shadowed.clip,
    { x: 65, y: 65, width: 70, height: 78 });
  assert.equal(createMarkShadowPrimitive("zero-blur").graphicSpec.objects.shadowed.items[0].properties.shadow.blurRadius, 0);
});
