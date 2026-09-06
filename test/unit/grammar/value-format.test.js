import assert from "node:assert/strict";
import test from "node:test";

import {
  formatValue,
  validateValueFormat
} from "../../../src/grammar/valueFormat.js";

test("formats fixed, percent, scientific, and UTC values through one vocabulary", () => {
  assert.equal(formatValue(12.345, { format: ".2f", valueType: "quantitative" }), "12.35");
  assert.equal(formatValue(0.125, { format: ".1%", valueType: "quantitative" }), "12.5%");
  assert.equal(formatValue(1234, { format: ".2e", valueType: "quantitative" }), "1.23e+3");
  assert.equal(formatValue("2024-03-05T00:00:00Z", {
    format: "%Y-%m-%d",
    valueType: "temporal"
  }), "2024-03-05");
});

test("validates precision and value-family compatibility before formatting", () => {
  assert.equal(validateValueFormat(".12f"), ".12f");
  assert.throws(() => validateValueFormat({ decimals: 2 }), /supported format string/);
  assert.deepEqual(
    validateValueFormat({ decimals: 2 }, "Axis format", { allowDecimalsObject: true }),
    { decimals: 2 }
  );
  assert.equal(formatValue(1.234, {
    format: { decimals: 2 },
    valueType: "quantitative",
    allowDecimalsObject: true
  }), "1.23");
  assert.throws(() => validateValueFormat(".13f"), /at most 12/);
  assert.throws(
    () => formatValue(1, { format: "%Y", valueType: "quantitative" }),
    /cannot use a UTC format/
  );
  assert.throws(
    () => formatValue(1, { format: ".1f", valueType: "temporal" }),
    /require a supported UTC format/
  );
});
