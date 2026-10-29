import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`Trail ${variant.variant} matches independent literal ribbons`, () => {
  const p = variant.userFacing(), q = variant.primitive();
  assert.deepEqual(p.graphicSpec.objects.trail.items.map(({ type, properties }) => ({ type, properties })), q.graphicSpec.objects.trail.items.map(({ type, properties }) => ({ type, properties })));
  assert.deepEqual(p.graphicSpec.objects.trail.clip, q.graphicSpec.objects.trail.clip);
  assert.equal(new Set(p.graphicSpec.objects.trail.items.map(item => item.identity.key)).size, 2);
});
