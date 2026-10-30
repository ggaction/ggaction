import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDensityRouteOptions } from "../../../../../src/grammar/graph/routes/density.js";
import { normalizeForceRouteOptions } from "../../../../../src/grammar/graph/routes/forceDirected.js";
import { normalizeEdgePathOptions } from "../../../../../src/grammar/graph/routes/edgePath.js";
import { normalizeHierarchicalRouteOptions } from "../../../../../src/grammar/graph/routes/hierarchical.js";
import { normalizeSplineOptions } from "../../../../../src/grammar/graph/routes/spline.js";
import { normalizeRouteIntent, routeNumericOptions } from "../../../../../src/grammar/graph/routes/options.js";

function withoutInheritedReads(keys, run) {
  let reads = 0;
  const descriptors = keys.map(key => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)]);
  for (const key of keys) Object.defineProperty(Object.prototype, key, { configurable: true, get() { reads++; throw new Error(`Inherited ${key} read`); } });
  try { run(); assert.equal(reads, 0); }
  finally { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(Object.prototype, key, descriptor); else delete Object.prototype[key]; } }
}

const numeric = [
  [normalizeDensityRouteOptions, { zeroLength: "point" }],
  [normalizeForceRouteOptions, { compatibilityThreshold: 0.6, zeroLength: "point" }],
  [normalizeEdgePathOptions, { exponent: 2, maxStretch: 2, zeroLength: "point" }],
  [normalizeHierarchicalRouteOptions, { strength: 0.85, zeroLength: "point", tolerance: 0.001, maxSubdivisions: 4096 }],
  [normalizeSplineOptions, { tolerance: 0.001, maxSubdivisions: 4096 }]
];
for (const [normalize, expected] of numeric) test(`${normalize.name} ignores inherited optional values and rejects own accessors`, () => {
  const input = Object.freeze({});
  withoutInheritedReads(Object.keys(expected), () => {
    assert.deepEqual(normalize(input), expected);
    assert.deepEqual(normalize(Object.create(null)), expected);
    assert.deepEqual(normalize({ ...expected }), expected);
  });
  let reads = 0;
  for (const key of Object.keys(expected)) assert.throws(() => normalize({ get [key]() { reads++; return expected[key]; } }), /accessors/);
  assert.equal(reads, 0);
  assert.deepEqual(input, {});
});

test("route intent and numeric projection use only own mapping, limits and numeric options", () => {
  const input = Object.freeze({ exponent: 1, maxStretch: 1 });
  const intent = normalizeRouteIntent("edge-path", input);
  withoutInheritedReads(["limits", "mapping", "zeroLength"], () => {
    assert.deepEqual(normalizeRouteIntent("edge-path", input), intent);
    assert.deepEqual(routeNumericOptions(intent), { exponent: 1, maxStretch: 1, zeroLength: "point" });
    assert.throws(() => normalizeRouteIntent("hierarchical", {}), /ordinary array/);
  });
  for (const invalid of [{ limits: undefined }, { mapping: null }, { exponent: undefined }, { exponent: null }]) assert.throws(() => normalizeRouteIntent("edge-path", invalid), /null or undefined/);
  assert.deepEqual(input, { exponent: 1, maxStretch: 1 });
});
