import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { findDataset } from "../../../../src/selectors/datasets.js";

const rows = [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 4 }];

test("creates immutable ECDF data with complete resolved provenance and child trace", () => {
  const base = chart().createData({ id: "source", values: rows });
  const program = base.createECDFData({ id: "distribution", field: "value" });
  const dataset = findDataset(program, "distribution");
  assert.equal(dataset.source, "source");
  assert.deepEqual(dataset.transform[0], {
    type: "ecdf", field: "value", groupBy: [], missing: "drop",
    as: {
      value: "__distribution_value",
      cumulative: "__distribution_cumulative",
      probability: "__distribution_probability"
    },
    resolved: { groups: [{ keys: {}, denominator: 4, validCount: 4 }] }
  });
  assert.deepEqual(program.trace.children.at(-1).children.map(node => node.op), [
    "createDerivedData", "materializeECDFData"
  ]);
  assert.equal(findDataset(base, "distribution"), undefined);
  assert.deepEqual(rows, [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 4 }]);
});

test("supports grouped weighted output and custom fields", () => {
  const program = chart().createData({ id: "source", values: [
    { group: "A", value: 1, weight: 2 }, { group: "A", value: 3, weight: 1 },
    { group: "B", value: 2, weight: 4 }
  ] }).createECDFData({
    id: "weighted", field: "value", groupBy: "group", weight: "weight",
    as: { value: "x", cumulative: "n", probability: "p" }
  });
  const dataset = findDataset(program, "weighted");
  assert.deepEqual(dataset.values, [
    { group: "A", x: 1, n: 0, p: 0 },
    { group: "A", x: 1, n: 2, p: 0.666666666667 },
    { group: "A", x: 3, n: 3, p: 1 },
    { group: "B", x: 2, n: 0, p: 0 },
    { group: "B", x: 2, n: 4, p: 1 }
  ]);
});

test("rejects invalid requests without mutating the caller", () => {
  const base = chart().createData({ id: "source", values: rows });
  const before = JSON.stringify(base);
  for (const create of [
    () => base.createECDFData({ id: "bad", field: "value", groupBy: "value" }),
    () => base.createECDFData({ id: "bad", field: "missing" }),
    () => base.createECDFData({ id: "bad", field: "value", missing: "keep" })
  ]) {
    assert.throws(create);
    assert.equal(JSON.stringify(base), before);
  }
});
