import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJitterScalar,
  normalizePointJitterPolicy,
  resolveJitterMaximum,
  resolvePointJitter,
  stableUint32HashV1
} from "../../../../src/grammar/jitter.js";

test("locks the production jitter-uniform-v1 grammar", () => {
  const policy = normalizePointJitterPolicy({
    channel: "x",
    maxOffset: { pixels: 12 },
    seed: "stable-fixture",
    key: "id"
  });
  const resolved = resolvePointJitter({
    target: "points",
    policy,
    scale: { type: "linear" },
    entries: [{ index: 0, identity: 7, base: 50, halfExtent: 3 }],
    plotMinimum: 0,
    plotMaximum: 100
  });
  assert.equal(canonicalJitterScalar("é"), "string:2:é");
  assert.equal(stableUint32HashV1("hello"), 1335831723);
  assert.equal(resolved.items[0].requestedOffset, 5.343984559178352);
  assert.equal(resolved.items[0].finalOffset, 5.343984559178352);
  assert.equal(resolved.algorithm, "jitter-uniform-v1");
  assert.equal(Object.isFrozen(resolved.items), true);
});

test("resolves band maximum and contains the whole point extent", () => {
  const policy = normalizePointJitterPolicy({
    channel: "y",
    maxOffset: { band: 0.4 }
  });
  assert.equal(resolveJitterMaximum(policy, {
    type: "point",
    step: 50,
    bandwidth: 0
  }), 20);
  const resolved = resolvePointJitter({
    target: "points",
    policy,
    scale: { type: "point", step: 40, bandwidth: 0 },
    entries: [{ index: 0, identity: 0, base: 20, halfExtent: 5 }],
    plotMinimum: 0,
    plotMaximum: 100
  });
  assert.equal(Math.abs(resolved.items[0].finalOffset) <= 15, true);
});

test("rejects invalid policies and incompatible band scales", () => {
  assert.equal(normalizePointJitterPolicy({ channel: "both", maxOffset: { pixels: 4 } }).channel, "both");
  assert.throws(
    () => normalizePointJitterPolicy({ channel: "theta", maxOffset: { pixels: 1 } }),
    /channel/
  );
  assert.throws(
    () => normalizePointJitterPolicy({
      channel: "x",
      maxOffset: { pixels: 1, band: 0.1 }
    }),
    /exactly one/
  );
  assert.throws(
    () => resolveJitterMaximum(normalizePointJitterPolicy({
      channel: "x",
      maxOffset: { band: 0.1 }
    }), { type: "linear" }),
    /categorical position scale/
  );
});
