import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
test("Table public cells match the independent clipped primitive tree and drawing order", () => {
  const variant = visualVariants[0], p = variant.userFacing(), q = variant.primitive();
  const content = program => program.graphicSpec.objects.table.children.map(id => {
    const group = program.graphicSpec.objects[id];
    return { clip: group.clip, items: group.items.map(({ type, properties }) => ({ type, properties })) };
  });
  assert.deepEqual(content(p), content(q));
  assert.deepEqual(p.graphicSpec.objects.table.clip, q.graphicSpec.objects.table.clip);
  assert.equal(new Set(p.graphicSpec.objects.table.children).size, 12);
  const keys = p.graphicSpec.objects.table.children.map(id => p.graphicSpec.objects[id].items[0].identity.key);
  assert.equal(new Set(keys).size, 12);
  assertDisplayedProgram(variant, p);
});
