import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveECDF,
  normalizeECDFTransform,
  validateECDFTransform
} from "../../../../src/grammar/ecdf.js";

const output = { value: "support", cumulative: "cumulative", probability: "probability" };

function transform(options = {}) {
  return normalizeECDFTransform({ field: "value", as: output, ...options });
}

test("derives right-continuous ECDF steps with sorted, aggregated ties", () => {
  const source = [{ value: 4 }, { value: 1 }, { value: 2 }, { value: 1 }];
  const result = deriveECDF(source, transform());
  assert.deepEqual(result.values, [
    { support: 1, cumulative: 0, probability: 0 },
    { support: 1, cumulative: 2, probability: 0.5 },
    { support: 2, cumulative: 3, probability: 0.75 },
    { support: 4, cumulative: 4, probability: 1 }
  ]);
  assert.deepEqual(result.resolved.groups, [
    { keys: {}, denominator: 4, validCount: 4 }
  ]);
  assert.deepEqual(source, [{ value: 4 }, { value: 1 }, { value: 2 }, { value: 1 }]);
});

test("preserves first group appearance while sorting support within each group", () => {
  const result = deriveECDF([
    { group: "B", value: 3 }, { group: "A", value: 2 },
    { group: "B", value: 1 }, { group: "A", value: 1 }
  ], transform({ groupBy: "group" }));
  assert.deepEqual(result.values, [
    { group: "B", support: 1, cumulative: 0, probability: 0 },
    { group: "B", support: 1, cumulative: 1, probability: 0.5 },
    { group: "B", support: 3, cumulative: 2, probability: 1 },
    { group: "A", support: 1, cumulative: 0, probability: 0 },
    { group: "A", support: 1, cumulative: 1, probability: 0.5 },
    { group: "A", support: 2, cumulative: 2, probability: 1 }
  ]);
});

test("uses positive weight sum as denominator and omits zero-weight observations", () => {
  const result = deriveECDF([
    { value: 1, weight: 2 }, { value: 2, weight: 0 }, { value: 4, weight: 1 }
  ], transform({ weight: "weight" }));
  assert.deepEqual(result.values, [
    { support: 1, cumulative: 0, probability: 0 },
    { support: 1, cumulative: 2, probability: 0.666666666667 },
    { support: 4, cumulative: 3, probability: 1 }
  ]);
  assert.equal(result.resolved.groups[0].denominator, 3);
  assert.equal(result.resolved.groups[0].validCount, 2);
});

test("makes missing policy explicit and rejects invalid denominators and negative weights", () => {
  assert.deepEqual(deriveECDF([
    { value: 1 }, { value: null }, { value: Infinity }
  ], transform()).values.at(-1), { support: 1, cumulative: 1, probability: 1 });
  assert.throws(
    () => deriveECDF([{ value: null }], transform({ missing: "error" })),
    /row 0/
  );
  assert.throws(
    () => deriveECDF([{ value: 1, weight: -1 }], transform({ weight: "weight" })),
    /negative weight/
  );
  assert.throws(
    () => deriveECDF([{ value: 1, weight: 0 }], transform({ weight: "weight" })),
    /denominator/
  );
  assert.throws(
    () => deriveECDF([
      { group: "A", value: 1, weight: 1 },
      { group: "B", value: 2, weight: 0 }
    ], transform({ groupBy: "group", weight: "weight" })),
    /denominator/
  );
});

test("validates transform fields, outputs, and resolved provenance strictly", () => {
  const valid = transform({ groupBy: ["group"], weight: "weight" });
  assert.doesNotThrow(() => validateECDFTransform(valid));
  for (const invalid of [
    { ...valid, extra: true },
    { ...valid, missing: "keep" },
    { ...valid, groupBy: ["group", "group"] },
    { ...valid, weight: "value" },
    { ...valid, as: { ...output, probability: "support" } },
    { ...valid, resolved: { groups: [{ keys: {}, denominator: 1, validCount: 1 }] } }
  ]) assert.throws(() => validateECDFTransform(invalid));
});
