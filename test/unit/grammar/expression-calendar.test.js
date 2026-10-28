import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { evaluateExpressionV2 } from "../../../src/grammar/expressionEvaluate.js";
const expression = (name, value, options) => ({ version: 2, registry: "standard@1", root: { type: "call", name, args: [{ type: "literal", value }], options } });
const evaluate = (name, value, options) => evaluateExpressionV2(expression(name, value, options), [{}]);

test("explicit parsers reject rollover and timezone-free ISO values", () => {
  for (const [text, format] of [["2024-02-29", "%Y-%m-%d"], ["29/02/2024", "%d/%m/%Y"], ["02/29/2024", "%m/%d/%Y"], ["2024-02-29T01:00:00+01:00", "iso-offset"]]) {
    assert.deepEqual(evaluate("parseTime", text, { format }).values, [1709164800000]);
  }
  for (const text of ["2023-02-29T00:00:00Z", "2024-13-01T00:00:00Z", "2024-02-00T00:00:00Z", "2024-02-29T24:00:00Z", "2024-02-29T00:60:00Z", "2024-02-29T00:00:60Z", "2024-02-29T00:00:00+25:00", "2024-02-29T00:00:00+00:60", "2024-02-29T00:00:00", "2024-02-29", "-000000-01-01T00:00:00Z", "+999999-01-01T00:00:00Z"]) {
    const result = evaluate("parseTime", text, { format: "iso-offset" });
    assert.deepEqual(result.values, [undefined]); assert.equal(result.report.counts.dateRange, 1);
  }
  assert.equal(evaluate("parseTime", "2023-02-29", { format: "%Y-%m-%d" }).report.counts.dateRange, 1);
  assert.equal(evaluate("parseTime", "0000-01-01T00:00:00.123Z", { format: "iso-offset" }).values[0], -62167219199877);
});

test("date parts use astronomical Gregorian fields and TimeClip truncation", () => {
  const value = 1712319967890.9; // 2024-04-05T12:26:07.890Z
  const expected = { year: 2024, quarter: 2, month: 4, day: 5, weekday: 5, hour: 12, minute: 26, second: 7, millisecond: 890 };
  for (const [part, output] of Object.entries(expected)) assert.equal(evaluate("datePart", value, { part, timeZone: "UTC" }).values[0], output);
  assert.equal(evaluate("datePart", -62167219200000, { part: "year", timeZone: "UTC" }).values[0], 0);
  assert.equal(evaluate("datePart", -1.9, { part: "millisecond", timeZone: "UTC" }).values[0], 999);
  assert.equal(evaluate("datePart", 9e15, { part: "year", timeZone: "UTC" }).report.counts.dateRange, 1);
});

test("calendar floors share earliest-fold and first-valid-gap boundary policy", () => {
  const fixtures = [
    ["2024-11-03T06:45:00Z", "hour", "America/New_York", "2024-11-03T05:00:00Z"],
    ["2024-03-10T16:00:00Z", "day", "America/New_York", "2024-03-10T05:00:00Z"],
    ["2018-11-04T12:00:00Z", "day", "America/Sao_Paulo", "2018-11-04T03:00:00Z"],
    ["2024-04-05T12:26:07Z", "quarter", "UTC", "2024-04-01T00:00:00Z"],
    ["2024-04-05T12:26:07Z", "week", "UTC", "2024-04-01T00:00:00Z"],
    ["2024-04-05T12:26:07Z", "week", "Europe/Copenhagen", "2024-03-31T22:00:00Z"]
  ];
  for (const [text, unit, timeZone, expected] of fixtures) {
    const options = { unit, timeZone, ...(unit === "week" ? { weekStartsOn: 1 } : {}) };
    const first = evaluate("timeFloor", Date.parse(text), options).values[0];
    assert.equal(first, Date.parse(expected));
    assert.equal(evaluate("timeFloor", first, options).values[0], first);
  }
  assert.equal(evaluate("timeFloor", -8640000000000000, { unit: "year", timeZone: "UTC" }).report.counts.dateRange, 1);
});

test("calendar output is independent of the host timezone in fresh processes", () => {
  const module = new URL("../../../src/grammar/expressionEvaluate.js", import.meta.url).href;
  const input = expression("parseTime", "2024-02-29", { format: "%Y-%m-%d" });
  for (const TZ of ["UTC", "America/Los_Angeles", "Asia/Seoul"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import {evaluateExpressionV2} from ${JSON.stringify(module)}; console.log(JSON.stringify(evaluateExpressionV2(${JSON.stringify(input)},[{}]).values));`], { encoding: "utf8", env: { ...process.env, TZ } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "[1709164800000]");
  }
});

test("calendar and angular options are closed and explicit even on empty data", () => {
  for (const [name, options] of [["sin", undefined], ["sin", { angleUnit: "turns" }], ["parseTime", { format: "auto" }], ["datePart", { part: "year" }], ["datePart", { part: "year", timeZone: "No/Zone" }], ["datePart", { part: "bad", timeZone: "UTC" }], ["timeFloor", { unit: "week", timeZone: "UTC" }], ["timeFloor", { unit: "week", timeZone: "UTC", weekStartsOn: 7 }], ["timeFloor", { unit: "day", timeZone: "UTC", weekStartsOn: 1 }]]) {
    assert.throws(() => evaluateExpressionV2(expression(name, 0, options), []));
  }
});
