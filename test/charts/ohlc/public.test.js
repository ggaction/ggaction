import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
for (const variant of visualVariants) test(`OHLC ${variant.variant} matches independent literal primitives`, () => {
  const p = variant.userFacing(), q = variant.primitive();
  assert.deepEqual(p.graphicSpec.objects.ohlc.items.map(({ type, properties }) => ({ type, properties })), q.graphicSpec.objects.ohlc.items.map(({ type, properties }) => ({ type, properties })));
  assert.deepEqual(p.graphicSpec.objects.ohlc.clip, q.graphicSpec.objects.ohlc.clip);
  assert.equal(new Set(p.graphicSpec.objects.ohlc.items.map(item => item.identity.key)).size, 3);
});
