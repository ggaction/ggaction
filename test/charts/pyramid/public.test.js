import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`Pyramid ${variant.variant} matches independent primitive geometry and preserves compound identity`, () => {
  const publicProgram = variant.userFacing(), primitive = variant.primitive();
  const items = publicProgram.graphicSpec.objects.pyramid.items;
  assert.deepEqual(items.map(({ type, properties }) => ({ type, properties })), primitive.graphicSpec.objects.pyramid.items.map(({ type, properties }) => ({ type, properties })));
  assert.deepEqual(publicProgram.graphicSpec.objects.pyramid.clip, primitive.graphicSpec.objects.pyramid.clip);
  assert.equal(new Set(items.map(item => item.identity.key)).size, 3);
  assert.equal(new Set(items.map(item => JSON.stringify([item.identity.key, item.identity.role]))).size, 6);
});
