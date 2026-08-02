import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCategoryOrder,
  resolveCategoryOrder
} from "../../../src/grammar/categoryOrder.js";

const rows = Object.freeze([
  Object.freeze({ category: "Beta", value: 3 }),
  Object.freeze({ category: "Alpha", value: 8 }),
  Object.freeze({ category: "Gamma", value: 4 }),
  Object.freeze({ category: "Beta", value: 5 }),
  Object.freeze({ category: "Gamma", value: 4 })
]);

test("normalizes explicit and computed category-order intent without retaining input", () => {
  const values = ["Gamma"];
  const summary = { field: "value", aggregate: "sum" };
  const explicit = normalizeCategoryOrder({ values });
  const computed = normalizeCategoryOrder({ by: summary, direction: "descending" });
  values[0] = "Alpha";
  summary.field = "changed";

  assert.deepEqual(explicit, { values: ["Gamma"] });
  assert.deepEqual(computed, {
    by: { field: "value", aggregate: "sum" },
    direction: "descending"
  });
  assert.equal(Object.isFrozen(explicit.values), true);
});

test("completes partial explicit order by stable first appearance", () => {
  assert.deepEqual(
    resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
      values: ["Gamma"]
    })),
    ["Gamma", "Beta", "Alpha"]
  );
  assert.throws(
    () => resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
      values: ["Unknown"]
    })),
    /Unknown category order value/
  );
  assert.throws(
    () => normalizeCategoryOrder({ values: ["Alpha", "Alpha"] }),
    /must be unique/
  );
});

test("orders categories and counts with stable first-appearance ties", () => {
  assert.deepEqual(
    resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
      by: "category"
    })),
    ["Alpha", "Beta", "Gamma"]
  );
  assert.deepEqual(
    resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
      by: "category",
      direction: "descending"
    })),
    ["Gamma", "Beta", "Alpha"]
  );
  assert.deepEqual(
    resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
      by: "count",
      direction: "descending"
    })),
    ["Beta", "Gamma", "Alpha"]
  );
});

test("supports sum, mean, min, and max summary ordering", () => {
  const expected = {
    sum: ["Beta", "Alpha", "Gamma"],
    mean: ["Alpha", "Beta", "Gamma"],
    min: ["Alpha", "Gamma", "Beta"],
    max: ["Alpha", "Beta", "Gamma"]
  };
  for (const aggregate of Object.keys(expected)) {
    assert.deepEqual(
      resolveCategoryOrder(rows, "category", normalizeCategoryOrder({
        by: { field: "value", aggregate },
        direction: "descending"
      })),
      expected[aggregate]
    );
  }
});

test("rejects invalid union shapes, mixed category primitives, and summary values", () => {
  assert.throws(() => normalizeCategoryOrder(), /exactly one/);
  assert.throws(
    () => normalizeCategoryOrder({ values: ["A"], by: "category" }),
    /exactly one/
  );
  assert.throws(
    () => normalizeCategoryOrder({ values: ["A"], direction: "ascending" }),
    /does not support direction/
  );
  assert.throws(
    () => normalizeCategoryOrder({ by: { field: "value", aggregate: "median" } }),
    /Unsupported category summary aggregate/
  );
  assert.throws(
    () => resolveCategoryOrder(
      [{ category: "1" }, { category: 2 }],
      "category",
      normalizeCategoryOrder({ by: "category" })
    ),
    /uniform primitive type/
  );
  assert.throws(
    () => resolveCategoryOrder(
      [{ category: "A", value: NaN }],
      "category",
      normalizeCategoryOrder({ by: { field: "value", aggregate: "sum" } })
    ),
    /finite number at row 0/
  );
});
