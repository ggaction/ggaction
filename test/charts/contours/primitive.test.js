import assert from "node:assert/strict";
import test from "node:test";
import { createContourPrimitive } from "./primitive.program.js";
import { variants, contourReference } from "./reference-values.js";
for (const variant of variants) test(`contour primitive ${variant.id} retains complete rings and its empty center`, () => {
  const p = createContourPrimitive(variant.id), collection = p.graphicSpec.objects.contours;
  assert.ok(collection.items.every(item => item.properties.commands.at(-1).op === "Z"));
  assert.deepEqual(collection.clip, contourReference(variant.id).clip);
  const expected = ["filled", "histogram", "kde"].includes(variant.id) ? [2, 1] : [variant.id === "holes" ? 2 : 1];
  assert.deepEqual(collection.items.map(item => item.properties.commands.filter(command => command.op === "M").length), expected);
});
test("contour reference rejects an unknown variant", () => assert.throws(() => createContourPrimitive("unknown")));
