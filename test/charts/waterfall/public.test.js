import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`Waterfall ${variant.variant} matches independent literal primitives`, () => {
  const p = variant.userFacing(), q = variant.primitive();
  assert.deepEqual(p.graphicSpec.objects.waterfall.items.map(({ type, properties }) => ({ type, properties })), q.graphicSpec.objects.waterfall.items.map(({ type, properties }) => ({ type, properties })));
  assert.deepEqual(p.graphicSpec.objects.waterfall.clip, q.graphicSpec.objects.waterfall.clip);
  assert.equal(new Set(p.graphicSpec.objects.waterfall.items.map(item => item.identity.key)).size, 5);
});
