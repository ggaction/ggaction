import assert from "node:assert/strict";
import test from "node:test";
import { normalizePointJitterPolicy, resolvePointJitter } from "../../../../src/grammar/jitter.js";
import { normalizePointPackingPolicy, resolvePointPacking } from "../../../../src/grammar/pointPacking.js";

const narrow = Object.freeze({ type: "point", step: 40, bandwidth: 0 });
const wide = Object.freeze({ type: "band", step: 100, bandwidth: 80 });
const jitter = normalizePointJitterPolicy({ channel: "x", maxOffset: { band: 0.3 }, seed: "stable-fixture" });
const packing = normalizePointPackingPolicy({ channel: "x", padding: 2 });
const bounds = { target: "points", plotMinimum: 0, plotMaximum: 200 };
const point = (index, scale) => ({ index, identity: `item-${index}`, base: 50, fixed: 80, halfExtent: 3, fixedHalfExtent: 3, ...(scale === undefined ? {} : { scale }) });

test("jitter scales each deterministic request by its selected native slot", () => {
  const result = resolvePointJitter({ ...bounds, policy: jitter, scales: [narrow, wide], entries: [
    { index: 0, identity: 7, base: 50, halfExtent: 3, scale: narrow },
    { index: 1, identity: 7, base: 100, halfExtent: 3, scale: wide }
  ] });
  assert.equal(result.maximum, 24);
  assert.equal(result.items[0].requestedOffset, 5.343984559178352);
  assert.equal(result.items[1].requestedOffset, 10.687969118356705);
  assert.equal(result.items.some(item => Object.hasOwn(item, "scale")), false);
});

test("packing compares collisions across native slots and summarizes selected bounds", () => {
  const entries = [point(0, narrow), point(1, wide)];
  const result = resolvePointPacking({ ...bounds, policy: packing, scales: [narrow, wide], entries });
  assert.deepEqual(result.items.map(item => item.final), [50, 42]);
  assert.equal(result.slotWidth, 80);
  assert.equal(result.maximumOffset, 40);
  assert.equal(result.unresolvedItemCount, 0);
  assert.deepEqual(entries, [point(0, narrow), point(1, wide)]);
  const selected = resolvePointPacking({ ...bounds, policy: packing, scales: [narrow, wide], entries: [point(0, narrow)] });
  assert.equal(selected.slotWidth, 40);
  assert.equal(selected.maximumOffset, 20);
  assert.equal(result.items.some(item => Object.hasOwn(item, "scale")), false);
});

test("empty point layout summarizes every validated branch without choosing a scale", () => {
  const resolvedJitter = resolvePointJitter({ ...bounds, policy: jitter, scales: [narrow, wide], entries: [] });
  assert.equal(resolvedJitter.maximum, 24);
  assert.equal(resolvedJitter.itemCount, 0);
  const resolvedPacking = resolvePointPacking({ ...bounds, policy: packing, scales: [narrow, wide], entries: [] });
  assert.equal(resolvedPacking.slotWidth, 80);
  assert.equal(resolvedPacking.maximumOffset, 40);
  assert.equal(resolvedPacking.itemCount, 0);
  for (const entries of [[], [point(0, narrow)]]) {
    assert.throws(() => resolvePointJitter({ ...bounds, policy: jitter, scales: [narrow, { type: "linear" }], entries }), /categorical.*slot/);
    assert.throws(() => resolvePointPacking({ ...bounds, policy: packing, scales: [narrow, { type: "linear" }], entries }), /categorical.*slot/);
  }
});

test("explicit row scales preserve ordinary and common-scale resolution byte for byte", () => {
  for (const [resolve, policy] of [[resolvePointJitter, jitter], [resolvePointPacking, packing]]) {
    for (const entries of [[], [point(0), point(1)]]) {
      const ordinary = resolve({ ...bounds, policy, scale: narrow, entries });
      const explicit = resolve({ ...bounds, policy, scales: [narrow, narrow], entries: entries.map(entry => ({ ...entry, scale: narrow })) });
      assert.deepEqual(explicit, ordinary);
      assert.ok(Object.isFrozen(explicit));
    }
  }
});
