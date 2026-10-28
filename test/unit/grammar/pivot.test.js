import assert from "node:assert/strict";
import test from "node:test";

import { derivePivotRows, normalizePivotTransform, validatePivotTransform } from "../../../src/grammar/pivot.js";
import { pivotRows, pivotExpectations } from "../../oracles/pivot.js";

const columns = [{ value: "x", as: "x" }, { value: "y", as: "y" }];
const options = { field: "key", value: "value", groupBy: "group", columns };
const transform = patch => normalizePivotTransform({ ...options, ...patch });
const derive = (rows, patch) => derivePivotRows(rows, transform(patch));

test("pivot normalizes defaults, infers first-seen string columns and owns inputs", () => {
  const input = { field: "key", value: "value", groupBy: ["group"] };
  const normalized = normalizePivotTransform(input, pivotRows);
  assert.deepEqual(normalized, { type: "pivot", field: "key", value: "value", groupBy: ["group"], columns, op: "none", fill: null });
  input.groupBy.push("other");
  assert.deepEqual(normalized.groupBy, ["group"]);
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.columns[0]));
  assert.equal(validatePivotTransform(normalized), normalized);
  assert.deepEqual(normalizePivotTransform({ field: "key", value: "value", columns }).groupBy, []);
  assert.deepEqual(normalizePivotTransform(normalized), normalized);
});

test("pivot matches independent aggregate literals and preserves first group appearance", () => {
  for (const [op, expected] of Object.entries(pivotExpectations)) {
    const input = op === "count" ? { ...options, op } : { ...options, op, value: "value" };
    if (op === "count") delete input.value;
    const actual = derivePivotRows(pivotRows, normalizePivotTransform(input));
    assert.deepEqual(actual, expected, op);
    assert.ok(Object.isFrozen(actual));
    assert.ok(actual.every(Object.isFrozen));
  }
  assert.equal(derive(pivotRows, { op: "sum" }).reduce((sum, row) => sum + row.x + row.y, 0), 15);
});

test("pivot keeps missing cells distinct from observed null and zero", () => {
  const rows = [{ group: "A", key: "x", value: null }, { group: "B", key: "x", value: 0 }];
  assert.deepEqual(derive(rows, { fill: 9 }), [{ group: "A", x: null, y: 9 }, { group: "B", x: 0, y: 9 }]);
  assert.deepEqual(derive([], { op: "sum" }), []);
  assert.deepEqual(derivePivotRows([], normalizePivotTransform({ field: "key", columns, op: "count" })), []);
  assert.throws(() => derive(pivotRows), /duplicate cells/);
  assert.throws(() => derive([{ group: "A", key: "x", value: 1 }, { group: "A", key: "x", value: 1 }]), /duplicate cells/);
});

test("pivot distinguishes typed column and group values without string coercion", () => {
  const keys = [0, "0", false, null];
  const aliases = ["number", "string", "boolean", "null"];
  const definition = { field: "key", value: "value", groupBy: ["group"], columns: keys.map((value, i) => ({ value, as: aliases[i] })) };
  const rows = keys.map((group, index) => ({ group, key: keys[index], value: index }));
  assert.deepEqual(derivePivotRows(rows, normalizePivotTransform(definition)), [
    { group: 0, number: 0, string: null, boolean: null, null: null },
    { group: "0", number: null, string: 1, boolean: null, null: null },
    { group: false, number: null, string: null, boolean: 2, null: null },
    { group: null, number: null, string: null, boolean: null, null: 3 }
  ]);
  assert.deepEqual(derivePivotRows([{ key: -0, value: 7 }], normalizePivotTransform({ ...definition, groupBy: [], columns: [{ value: 0, as: "zero" }] })), [{ zero: 7 }]);
  const tuples = [{ a: "x\u0000string:y", b: "z", key: "x", value: 1 }, { a: "x", b: "y\u0000string:z", key: "x", value: 2 }];
  assert.equal(derivePivotRows(tuples, normalizePivotTransform({ ...options, groupBy: ["a", "b"] })).length, 2);
});

test("pivot safely owns special output names and never mutates rows or column declarations", () => {
  const input = { field: "key", value: "value", columns: [{ value: "x", as: "__proto__" }, { value: "y", as: "constructor" }] };
  const rows = [{ key: "x", value: 3 }];
  const beforeRows = structuredClone(rows), beforeInput = structuredClone(input);
  const normalized = normalizePivotTransform(input);
  const actual = derivePivotRows(rows, normalized);
  assert.deepEqual(Object.keys(actual[0]), ["__proto__", "constructor"]);
  assert.equal(actual[0].__proto__, 3);
  assert.equal(Object.getPrototypeOf(actual[0]), Object.prototype);
  assert.equal(actual[0].constructor, null);
  assert.deepEqual(rows, beforeRows);
  assert.deepEqual(input, beforeInput);
  input.columns[0].as = "changed";
  assert.equal(normalized.columns[0].as, "__proto__");
});

test("pivot uses stable finite aggregate arithmetic and rejects unrepresentable results", () => {
  const rows = values => values.map(value => ({ group: "A", key: "x", value }));
  assert.equal(derive(rows([1e308, 1e308]), { op: "mean" })[0].x, 1e308);
  assert.equal(derive(rows([1e308, -1e308]), { op: "sum" })[0].x, 0);
  assert.equal(derive(rows([1e308, -1e308]), { op: "mean" })[0].x, 0);
  assert.throws(() => derive(rows([1e308, 1e308]), { op: "sum" }), /finite|representable/);
});

test("pivot rejects invalid definitions before deriving even empty input", () => {
  const cases = [
    [{ other: true }, /Unknown/], [{ type: "other" }, /type/], [{ field: "" }, /non-empty/],
    [{ op: "median" }, /operation/], [{ op: null }, /operation/], [{ value: "" }, /non-empty/],
    [{ op: "count" }, /does not accept/], [{ fill: undefined, value: undefined }, /value field/],
    [{ fill: NaN }, /finite/], [{ fill: "0" }, /finite/], [{ columns: [] }, /empty/],
    [{ columns: null }, /array/], [{ groupBy: ["group", "group"] }, /unique/],
    [{ groupBy: [""] }, /non-empty/], [{ groupBy: null }, /array/],
    [{ columns: [{ value: "x", as: "group" }] }, /collides/],
    [{ columns: [{ value: "x", as: "a" }, { value: "x", as: "b" }] }, /unique/],
    [{ columns: [{ value: "x", as: "a" }, { value: "y", as: "a" }] }, /collides/],
    [{ columns: [{ value: 0, as: "a" }, { value: -0, as: "b" }] }, /unique/],
    [{ columns: [{ value: {}, as: "x" }] }, /scalar|finite numbers/],
    [{ columns: [{ value: "x", as: "" }] }, /non-empty/],
    [{ columns: [{ value: "x", as: "x", extra: 0 }] }, /Unknown/],
    [{ columns: [null] }, /plain object/]
  ];
  for (const [patch, error] of cases) assert.throws(() => derive([], patch), error);
  assert.throws(() => normalizePivotTransform(), /field/);
  assert.throws(() => normalizePivotTransform(null), /plain object/);
  assert.throws(() => validatePivotTransform({ ...transform(), type: "other" }), /type/);
  assert.throws(() => validatePivotTransform({ ...transform(), other: 1 }), /Unknown/);
  assert.throws(() => validatePivotTransform({ ...transform(), fill: undefined }), /finite/);
});

test("pivot requires explicit columns where output field inference is ambiguous", () => {
  const inferred = { field: "key", value: "value" };
  for (const rows of [[], [{ key: 1 }], [{ key: null }], [{ key: "" }]]) {
    assert.throws(() => normalizePivotTransform(inferred, rows), /explicit columns/);
  }
  assert.throws(() => normalizePivotTransform({ ...inferred, groupBy: "x" }, [{ key: "x" }]), /collides/);
  assert.throws(() => normalizePivotTransform(inferred, [{}]), /does not contain/);
  assert.throws(() => normalizePivotTransform(inferred), /ordinary array/);
});

test("pivot validates every requested row and never reads accessors", () => {
  for (const rows of [null, {}, [null], [new Date()], new Array(1)]) assert.throws(() => derive(rows), /array|plain object|dense/);
  for (const row of [{ key: "x", value: 1 }, { group: "A", value: 1 }, { group: "A", key: "x" }]) {
    assert.throws(() => derive([row]), /does not contain/);
  }
  for (const value of [undefined, Infinity, NaN, "1", {}, true]) {
    assert.throws(() => derive([{ group: "A", key: "x", value }]), /finite/);
  }
  assert.throws(() => derive([{ group: {}, key: "x", value: 1 }]), /finite numbers/);
  assert.throws(() => derive([{ group: "A", key: {}, value: 1 }]), /finite numbers/);
  assert.throws(() => derive([{ group: "A", key: "z", value: 1 }]), /outside/);
  let calls = 0;
  const getter = { enumerable: true, get() { calls++; throw new Error("executed"); } };
  const row = Object.defineProperty({ group: "A", key: "x" }, "value", getter);
  assert.throws(() => derive([row]), /accessors/);
  assert.throws(() => normalizePivotTransform(Object.defineProperty({}, "field", getter)), /accessors/);
  assert.throws(() => transform({ columns: [Object.defineProperty({ as: "x" }, "value", getter)] }), /accessors/);
  assert.throws(() => derive(Object.defineProperty([], "0", getter)), /accessors/);
  assert.throws(() => normalizePivotTransform({ field: "key", value: "value" }, [row]), /accessors/);
  assert.equal(calls, 0);
});

test("pivot checks column, row and work limits before unbounded allocation", () => {
  const manyColumns = Array.from({ length: 65 }, (_, i) => ({ value: String(i), as: String(i) }));
  assert.throws(() => transform({ columns: manyColumns }), /64/);
  assert.throws(() => normalizePivotTransform({ field: "key", value: "value" }, manyColumns.map(({ value }) => ({ key: value }))), /64/);
  assert.equal(transform({ columns: manyColumns.slice(0, 64) }).columns.length, 64);
  const rows = Array.from({ length: 10001 }, (_, group) => ({ group, key: "x", value: 1 }));
  assert.equal(derive(rows.slice(0, 10000)).length, 10000);
  assert.throws(() => derive(rows), /10000/);
  assert.throws(() => derive(new Array(2000001)), /input work/);
  assert.throws(() => normalizePivotTransform({ field: "key", value: "value" }, new Array(5000001)), /input work/);
  assert.throws(() => transform({ groupBy: new Array(10000001) }), /grouping work/);
});

test("pivot bounds cumulative grouping and output work before creating wide output rows", () => {
  const groupBy = Array.from({ length: 1000 }, (_, index) => `field${index}`);
  const group = Object.fromEntries(groupBy.map(field => [field, "A"]));
  // Input work alone is 5,025,000; distinct groups cross the combined 10M limit.
  const rows = Array.from({ length: 5000 }, (_, index) => ({ ...group, field0: index, key: "x", value: 1 }));
  const before = rows[0];
  assert.throws(() => derive(rows, { groupBy }), /output work/);
  assert.equal(rows[0], before);
  assert.equal(Object.hasOwn(rows[0], "x"), false);
});
