import assert from "node:assert/strict";
import test from "node:test";

import {
  POINT_PACKING_ALGORITHM,
  normalizePointPackingPolicy,
  resolvePointPacking
} from "../../../../src/grammar/pointPacking.js";

const SCALE = Object.freeze({ type: "point", step: 40, bandwidth: 0 });

function overlaps(left, right, padding = 1) {
  return Math.abs(left.fixed - right.fixed) <
      left.fixedHalfExtent + right.fixedHalfExtent + padding &&
    Math.abs(left.final - right.final) <
      left.halfExtent + right.halfExtent + padding;
}

test("packs deterministically inside a categorical slot without moving measure coordinates", () => {
  const policy = normalizePointPackingPolicy({ channel: "x", key: "id" });
  const source = ["c", "a", "b"].map((identity, index) => ({
    index, identity, base: 50, fixed: 80, halfExtent: 3, fixedHalfExtent: 3
  }));
  const resolution = resolvePointPacking({
    target: "points", policy, scale: SCALE, entries: source,
    plotMinimum: 0, plotMaximum: 100
  });
  const resolved = resolution.items.map(item => ({
    ...source[item.index], final: item.final
  }));
  assert.equal(resolution.algorithm, POINT_PACKING_ALGORITHM);
  assert.equal(resolution.maximumOffset, 20);
  assert.equal(resolution.unresolvedItemCount, 0);
  assert.equal(resolved.every(item => item.fixed === 80), true);
  assert.equal(resolved.every(item => item.final >= 33 && item.final <= 67), true);
  for (let left = 0; left < resolved.length; left += 1) {
    for (let right = left + 1; right < resolved.length; right += 1) {
      assert.equal(overlaps(resolved[left], resolved[right]), false);
    }
  }
  assert.equal(Object.isFrozen(resolution.items), true);
});

test("uses identity rather than input order as the deterministic tie break", () => {
  const policy = normalizePointPackingPolicy({
    channel: "y", maxOffset: { pixels: 18 }, key: "id"
  });
  const rows = ["a", "b", "c"].map((identity, index) => ({
    index, identity, base: 60, fixed: 20, halfExtent: 3, fixedHalfExtent: 3
  }));
  const resolve = entries => resolvePointPacking({
    target: "points", policy, scale: SCALE, entries,
    plotMinimum: 0, plotMaximum: 120
  }).items;
  const original = new Map(resolve(rows).map(item => [item.identity, item.finalOffset]));
  const reversedRows = [...rows].reverse().map((entry, index) => ({ ...entry, index }));
  const reversed = new Map(resolve(reversedRows).map(item => [item.identity, item.finalOffset]));
  assert.deepEqual(reversed, original);
});

test("reports infeasible packing explicitly and rejects malformed inputs", () => {
  const entry = index => ({
    index, identity: `row-${index}`, base: 20, fixed: 20,
    halfExtent: 9, fixedHalfExtent: 9
  });
  const args = {
    target: "points",
    scale: { type: "point", step: 20, bandwidth: 0 },
    entries: [entry(0), entry(1)],
    plotMinimum: 0,
    plotMaximum: 40
  };
  assert.throws(() => resolvePointPacking({
    ...args,
    policy: normalizePointPackingPolicy({ channel: "x" })
  }), /cannot avoid glyph overlap/);
  const bestEffort = resolvePointPacking({
    ...args,
    policy: normalizePointPackingPolicy({ channel: "x", overflow: "overlap" })
  });
  assert.equal(bestEffort.unresolvedItemCount, 1);
  assert.equal(bestEffort.items[1].collisionCount, 1);
  assert.throws(() => normalizePointPackingPolicy({ channel: "x", padding: -1 }));
  assert.throws(() => normalizePointPackingPolicy({
    channel: "x", maxOffset: { band: 0.6 }
  }));
  assert.throws(() => resolvePointPacking({
    ...args,
    entries: [entry(0), { ...entry(1), identity: "row-0" }],
    policy: normalizePointPackingPolicy({ channel: "x", overflow: "overlap" })
  }), /identity.*unique/);
});
