import assert from "node:assert/strict";
import test from "node:test";

import {
  mapLinearValues,
  mapOrdinalValues,
  readQuantitativeField,
  readNominalField,
  readTemporalField,
  resolveColorRange,
  resolveOrdinalDomain,
  resolveScaleDomain,
  resolveScaleRange,
  validateFieldType,
  validateColorRange,
  validateNominalFieldType,
  validateOrdinalDomain,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType
} from "../../src/core/scale.js";

test("reads finite quantitative field values", () => {
  const values = readQuantitativeField([{ value: 1 }, { value: 4 }], "value");

  assert.deepEqual(values, [1, 4]);
  assert.equal(Object.isFrozen(values), true);
  assert.throws(
    () => readQuantitativeField([{ value: 1 }, {}], "value"),
    /finite number at row 1/
  );
});

test("normalizes temporal field values to timestamps", () => {
  const values = readTemporalField(
    [{ value: "1970-01-01" }, { value: Date.UTC(1980, 0, 1) }],
    "value"
  );

  assert.deepEqual(values, [Date.UTC(1970, 0, 1), Date.UTC(1980, 0, 1)]);
  assert.equal(Object.isFrozen(values), true);
  assert.throws(
    () => readTemporalField([{ value: "not-a-date" }], "value"),
    /temporal string or finite timestamp/
  );
});

test("resolves automatic domains and positional ranges", () => {
  const bounds = { x: 70, y: 30, width: 540, height: 310 };

  assert.deepEqual(resolveScaleDomain("auto", [4, 1, 9]), [1, 9]);
  assert.deepEqual(resolveScaleRange("auto", "x", bounds), [70, 610]);
  assert.deepEqual(resolveScaleRange("auto", "y", bounds), [340, 30]);
  assert.deepEqual(resolveScaleDomain([0, 10], []), [0, 10]);
  assert.deepEqual(resolveScaleRange([5, 15], "x", undefined), [5, 15]);
});

test("maps linear values and centers a constant domain", () => {
  assert.deepEqual(mapLinearValues([0, 5, 10], [0, 10], [20, 100]), [
    20,
    60,
    100
  ]);
  assert.deepEqual(mapLinearValues([2, 2], [2, 2], [10, 20]), [15, 15]);
  assert.throws(
    () => mapLinearValues([NaN], [2, 2], [10, 20]),
    /finite numbers/
  );
});

test("validates the continuous scale vocabulary and bounds", () => {
  assert.equal(validatePositionChannel("x"), "x");
  assert.equal(validateFieldType("quantitative"), "quantitative");
  assert.equal(validateFieldType("temporal"), "temporal");
  assert.equal(validateScaleType("linear"), "linear");
  assert.equal(validateScaleType("time"), "time");
  assert.equal(validateScaleDomain("auto"), "auto");
  assert.equal(validateScaleRange("auto"), "auto");

  assert.throws(() => validatePositionChannel("color"), /Unknown/);
  assert.throws(() => validateFieldType("nominal"), /Unsupported/);
  assert.throws(() => validateScaleType("log"), /Unsupported/);
  assert.throws(() => validateScaleDomain([0]), /two finite numbers/);
  assert.throws(() => validateScaleRange([0, Infinity]), /two finite numbers/);
  assert.throws(
    () => resolveScaleDomain("auto", []),
    /infer an automatic scale domain/
  );
  assert.throws(
    () => resolveScaleRange("auto", "x", undefined),
    /requires graphical bounds/
  );
});

test("resolves nominal domains and tableau10 color ranges", () => {
  const values = readNominalField(
    [{ origin: "USA" }, { origin: "Europe" }, { origin: "USA" }],
    "origin"
  );
  const domain = resolveOrdinalDomain("auto", values);
  const range = resolveColorRange({ palette: "tableau10" });

  assert.deepEqual(domain, ["USA", "Europe"]);
  assert.deepEqual(range.slice(0, 3), ["#4c78a8", "#f58518", "#e45756"]);
  assert.deepEqual(mapOrdinalValues(values, domain, range), [
    "#4c78a8",
    "#f58518",
    "#4c78a8"
  ]);
});

test("validates nominal fields, ordinal domains, and color ranges", () => {
  assert.equal(validateNominalFieldType("nominal"), "nominal");
  assert.deepEqual(validateOrdinalDomain(["USA", "Europe"]), [
    "USA",
    "Europe"
  ]);
  assert.deepEqual(validateColorRange(["red", "blue"]), ["red", "blue"]);
  assert.throws(() => validateNominalFieldType("quantitative"), /Unsupported/);
  assert.throws(() => validateOrdinalDomain(["USA", "USA"]), /unique/);
  assert.throws(() => validateColorRange([]), /non-empty color strings/);
  assert.throws(
    () => validateColorRange({ palette: "unknown" }),
    /tableau10/
  );
  assert.throws(
    () => readNominalField([{ value: null }], "value"),
    /nominal value/
  );
});
