import test from "node:test";
import assert from "node:assert/strict";
import { joinGeometryRows, normalizeGeoJoinOptions } from "../../../src/grammar/geo/join.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const options = { geometryKey: ["properties", "code"], dataKey: "code" };
const features = codes => codes.map(code => ({ properties: { code }, geometry: null }));

test("geographic join preserves feature order, typed keys, null geometry and unmatched rows", () => {
  const left = features(["B", 1, "1", true, ["A", 2], ["A:2"], "absent", null]);
  const right = [{ code: 1, value: 12 }, { code: "B", value: 4 }, { code: true }, { code: "1" },
    { code: ["A:2"] }, { code: ["A", 2] }, { code: "extra" }, { code: null }, {}];
  const before = structuredClone({ left, right, options });
  const result = joinGeometryRows(left, right, options);
  assert.deepEqual(result.rowMap, [1, 0, 3, 2, 5, 4, null, null]);
  assert.deepEqual(result.diagnostics, { geometryCount: 8, dataCount: 9, duplicateGeometryCount: 0,
    duplicateDataCount: 0, matchedCount: 6, unmatchedGeometry: [6, 7], unmatchedData: [6, 7, 8], coverage: 0.75 });
  assert.deepEqual({ left, right, options }, before);
  assert(Object.isFrozen(result.rowMap)); assert(Object.isFrozen(result.diagnostics.unmatchedData));
});

test("one-to-one join reports duplicate counts on both inputs without a partial result", () => {
  const left = features(["A", "A", "A", 0, -0]), rows = [{ code: false }, { code: false }];
  assert.throws(() => joinGeometryRows(left, rows, options), error => {
    assert.deepEqual(getErrorDetails(error), { code: "ambiguous-identity", diagnostics: {
      geometryCount: 5, dataCount: 2, duplicateGeometryCount: 3, duplicateDataCount: 1 } });
    return true;
  });
  assert.deepEqual(joinGeometryRows(features([null, null, undefined]), [{ code: null }, {}], options).rowMap, [null, null, null]);
});

test("empty join inputs have explicit zero coverage and retain all unmatched indices", () => {
  assert.deepEqual(joinGeometryRows([], [], options).diagnostics, { geometryCount: 0, dataCount: 0,
    duplicateGeometryCount: 0, duplicateDataCount: 0, matchedCount: 0, unmatchedGeometry: [], unmatchedData: [], coverage: 0 });
  assert.deepEqual(joinGeometryRows([], [{ code: "A" }], options).diagnostics.unmatchedData, [0]);
  assert.deepEqual(joinGeometryRows(features(["A"]), [], options).rowMap, [null]);
});

test("key matching uses exact own paths, finite scalar types and bounded tuples", () => {
  const date = new Date("2024-01-01T00:00:00Z");
  assert.deepEqual(joinGeometryRows(features([1n, date, "", false]),
    [{ code: "" }, { code: new Date(date) }, { code: 1n }, { code: false }], options).rowMap, [2, 1, 0, 3]);
  const own = Object.defineProperty({}, "__proto__", { value: "X", enumerable: true });
  assert.deepEqual(joinGeometryRows([own], [own], { geometryKey: "__proto__", dataKey: "__proto__" }).rowMap, [0]);
  assert.deepEqual(joinGeometryRows([{}], [{}], { geometryKey: "toString", dataKey: "toString" }).rowMap, [null]);
  for (const value of [Infinity, NaN, {}, [], Array(65).fill(1), new Date(NaN)]) {
    assert.throws(() => joinGeometryRows(features([value]), [], options));
  }
  assert.throws(() => joinGeometryRows([{ properties: 1 }], [], options), /plain object/);
});

test("join validates descriptors before reading any key and never invokes getters", () => {
  let calls = 0;
  const hostile = Object.defineProperty({}, "code", { enumerable: true, get() { calls++; return "A"; } });
  assert.throws(() => joinGeometryRows([{ properties: hostile }], [], options), /accessors/);
  assert.throws(() => joinGeometryRows([], [hostile], options), /accessors/);
  const hostileOptions = Object.defineProperty({}, "geometryKey", { enumerable: true, get() { calls++; return "id"; } });
  assert.throws(() => normalizeGeoJoinOptions(hostileOptions), /accessors/);
  assert.equal(calls, 0);
  assert.throws(() => joinGeometryRows(Array(1), [], options), /dense/);
  assert.throws(() => joinGeometryRows([], [null], options), /plain object/);
});

test("join rejects unsupported paths and budgets excessive key work before producing rows", () => {
  const input = { geometryKey: ["id"], dataKey: "code" }, normalized = normalizeGeoJoinOptions(input);
  input.geometryKey[0] = "changed";
  assert.deepEqual(normalized, { method: "geo-join", geometryKey: ["id"], dataKey: ["code"] });
  for (const geometryKey of [undefined, "", [], [""], Array(129).fill("x"), [1], Array(1)]) {
    assert.throws(() => normalizeGeoJoinOptions({ geometryKey, dataKey: "code" }));
  }
  assert.throws(() => normalizeGeoJoinOptions({ ...options, fuzzy: true }), /Unknown/);
  assert.throws(() => joinGeometryRows(features(["X".repeat(10_000_001)]), [], options), error => getErrorDetails(error).code === "resource-limit");
  assert.throws(() => joinGeometryRows(Array(100_001).fill({}), [], options), error => getErrorDetails(error).code === "resource-limit");
});
