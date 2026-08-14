import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveInterval,
  normalizeIntervalTransform,
  studentTCritical
} from "../../../../src/grammar/interval.js";
import { loadCars } from "../../../support/data.js";

const outputs = Object.freeze({
  center: "center",
  lower: "lower",
  upper: "upper"
});

function transform(options = {}) {
  return normalizeIntervalTransform({
    field: "value",
    groupBy: "group",
    as: outputs,
    ...options
  });
}

test("derives the canonical grouped Student-t confidence intervals", () => {
  const result = deriveInterval(loadCars(), normalizeIntervalTransform({
    field: "Acceleration",
    groupBy: "Origin",
    as: outputs
  }));

  assert.deepEqual(result, [
    { Origin: "USA", center: 14.942519685039, lower: 14.595961849125, upper: 15.289077520954 },
    { Origin: "Europe", center: 16.821917808219, lower: 16.11941878434, upper: 17.524416832098 },
    { Origin: "Japan", center: 16.172151898734, lower: 15.734269872553, upper: 16.610033924915 }
  ]);
});

test("supports stderr, sample stdev, and deterministic IQR intervals", () => {
  const rows = [
    { group: "A", value: 1 },
    { group: "A", value: 2 },
    { group: "A", value: 3 },
    { group: "A", value: 4 }
  ];

  assert.deepEqual(deriveInterval(rows, transform({ extent: "stderr" })), [
    { group: "A", center: 2.5, lower: 1.854502775632, upper: 3.145497224368 }
  ]);
  assert.deepEqual(deriveInterval(rows, transform({ extent: "stdev" })), [
    { group: "A", center: 2.5, lower: 1.209005551264, upper: 3.790994448736 }
  ]);
  assert.deepEqual(deriveInterval(rows, transform({
    center: "median",
    extent: "iqr"
  })), [
    { group: "A", center: 2.5, lower: 1.75, upper: 3.25 }
  ]);
});

test("preserves sub-picounit interval ordering instead of rounding to zero", () => {
  const rows = [1e-13, 2e-13, 3e-13, 4e-13].map(value => ({
    group: "A",
    value
  }));
  const result = deriveInterval(rows, transform({
    center: "median",
    extent: "iqr"
  }));

  assert.deepEqual(result, [{
    group: "A",
    center: 2.5e-13,
    lower: 1.75e-13,
    upper: 3.25e-13
  }]);
  assert.equal(result[0].lower < result[0].center, true);
  assert.equal(result[0].center < result[0].upper, true);
});

test("preserves first group appearance and omits undersized or missing samples", () => {
  const rows = [
    { group: "B", value: 5 },
    { group: "A", value: null },
    { group: "A", value: 2 },
    { group: "B", value: 7 },
    { group: "A", value: Number.NaN },
    { group: "A", value: 4 },
    { group: "C", value: 9 }
  ];
  const result = deriveInterval(rows, transform({ extent: "stderr" }));

  assert.deepEqual(result.map(row => row.group), ["B", "A"]);
  assert.equal(result.every(row => row.lower <= row.center), true);
  assert.equal(result.every(row => row.center <= row.upper), true);
});

test("supports an ungrouped interval and validates statistical combinations", () => {
  const ungrouped = normalizeIntervalTransform({
    field: "value",
    as: outputs,
    extent: "stderr"
  });
  assert.deepEqual(ungrouped.groupBy, []);
  assert.deepEqual(deriveInterval([{ value: 1 }, { value: 3 }], ungrouped), [
    { center: 2, lower: 1, upper: 3 }
  ]);

  assert.throws(
    () => transform({ center: "median", extent: "ci" }),
    /Median intervals/
  );
  assert.throws(
    () => transform({ extent: "stderr", level: 0.9 }),
    /level is supported only/
  );
  assert.throws(
    () => studentTCritical(0, 0.95),
    /degreesOfFreedom/
  );
});

test("owns derived rows and rejects non-numeric measure values", () => {
  const rows = [{ group: "A", value: 1 }, { group: "A", value: 3 }];
  const result = deriveInterval(rows, transform({ extent: "stderr" }));
  rows[0].value = 100;

  assert.equal(result[0].center, 2);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result[0]), true);
  assert.throws(
    () => deriveInterval([
      { group: "A", value: 1 },
      { group: "A", value: "3" }
    ], transform()),
    /numeric or missing/
  );
});
