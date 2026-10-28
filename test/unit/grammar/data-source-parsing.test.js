import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDataSource, parseDataSource } from "../../../src/grammar/dataSource.js";
import { parseDataDateValue, parseTimeValue } from "../../../src/grammar/parseTime.js";

const csv = (text, options = {}) => parseDataSource({ kind: "inline", format: "csv", text, ...options });
const json = (values, options = {}) => parseDataSource({ kind: "inline", format: "json", text: JSON.stringify(values), ...options });

test("CSV preserves quoted delimiters, escaped quotes, line endings, BOM, and empty strings", () => {
  const result = csv('\uFEFFname,note,empty\r\n"a,b","line1\r\nline2 ""quoted""",\r\n');
  assert.deepEqual(result.values, [{ name: "a,b", note: 'line1\r\nline2 "quoted"', empty: "" }]);
  assert.ok(Object.isFrozen(result.values[0]));
  assert.deepEqual(csv('name;value\na;"x;y"', { delimiter: ";" }).values, [{ name: "a", value: "x;y" }]);
});

test("CSV rejects malformed quotes, duplicate headers, missing cells, and blank records", () => {
  for (const text of ['a\n"unterminated', 'a\nun"quoted', 'a\n"closed"tail', "a,a\n1,2", "a,b\n1", "a,b\n1,2,3", "a,b\n\n", ",b\n1,2", "__proto__\n1"]) {
    assert.throws(() => csv(text), TypeError, text);
  }
  for (const delimiter of ["", "ab", '"', "\n", "\r"]) assert.throws(() => csv("a", { delimiter }), TypeError);
});

test("empty CSV and header-only CSV retain their distinct schema information", () => {
  assert.deepEqual(csv("").values, []);
  assert.equal(csv("").schema.completeness, "unknown");
  const result = csv("x,flag\n", { parse: { x: { type: "number" }, flag: { type: "boolean" } } });
  assert.deepEqual(result.values, []);
  assert.deepEqual(result.schema.fields.map(field => [field.name, field.storageType]), [["x", "number"], ["flag", "boolean"]]);
});

test("explicit conversion retains zero, false, signed zero, and nullable typed empty cells", () => {
  const result = csv("x,flag,label,missing\n-0,false,,\n1e2,true,x,2", {
    parse: { x: { type: "number" }, flag: { type: "boolean" }, label: { type: "string" }, missing: { type: "number", nullable: true } }
  });
  assert.ok(Object.is(result.values[0].x, -0));
  assert.deepEqual(result.values.map(row => [row.flag, row.label, row.missing]), [[false, "", null], [true, "x", 2]]);
  assert.equal(result.values[1].x, 100);
  assert.deepEqual(csv("x\n0").values, [{ x: "0" }]);
  assert.equal(json([{ x: null }], { parse: { x: { type: "number", nullable: true } } }).schema.fields[0].storageType, "number");
});

test("invalid conversion never drops a row or silently coerces input", () => {
  for (const value of ["NaN", "Infinity", "1e999", "0x10", " 2", "2 ", ""]) {
    assert.throws(() => csv(`x\n"${value}"`, { parse: { x: { type: "number" } } }), TypeError);
  }
  for (const value of ["TRUE", "1", "yes", ""]) assert.throws(() => csv(`x\n"${value}"`, { parse: { x: { type: "boolean" } } }), TypeError);
  assert.throws(() => json([{ x: 1 }], { parse: { x: { type: "string" } } }), TypeError);
  assert.throws(() => json([{ x: null }], { parse: { x: { type: "number" } } }), TypeError);
  assert.throws(() => json([{ x: 1 }, {}], { parse: { x: { type: "number" } } }), /absent at row 1/);
  assert.throws(() => csv("x\n1", { parse: { y: { type: "number" } } }), /absent/);
});

test("JSON preserves literal dotted keys and nested values independently", () => {
  const input = [{ "a.b": 1, a: { b: 2 }, list: [false, null, 0] }];
  const result = json(input);
  assert.deepEqual(result.values, input);
  assert.notEqual(result.values[0].a, input[0].a);
  assert.ok(Object.isFrozen(result.values[0].list));
  assert.throws(() => parseDataSource({ kind: "inline", text: '{"x":1}', format: "json" }), TypeError);
  assert.throws(() => parseDataSource({ kind: "inline", text: "[", format: "json" }), /malformed JSON/);
});

test("JSON and inline rows reject prototype keys, executable values, and cycles before getters run", () => {
  for (const text of ['[{"__proto__":1}]', '[{"a":{"constructor":1}}]', '[{"prototype":1}]']) {
    assert.throws(() => parseDataSource({ kind: "inline", text, format: "json" }), /reserved/);
  }
  let reads = 0;
  const row = { get x() { reads += 1; return 1; } };
  assert.throws(() => parseDataSource({ kind: "inline", values: [row] }), /accessors/);
  const source = { kind: "inline", values: [{ x: 1 }], parse: { x: { get type() { reads += 1; return "number"; } } } };
  assert.throws(() => parseDataSource(source), /accessors/);
  const cyclic = {}; cyclic.x = cyclic;
  for (const value of [cyclic, new Date(), { x: NaN }, { x: undefined }, { x: () => 1 }, { x: [,,] }]) {
    assert.throws(() => parseDataSource({ kind: "inline", values: [value] }));
  }
  assert.equal(reads, 0);
  let deep = 1;
  for (let index = 0; index < 66; index += 1) deep = { nested: deep };
  assert.throws(() => parseDataSource({ kind: "inline", values: [{ x: deep }] }), /maximum depth/);
});

test("source validation rejects ambiguous formats and descriptor payloads", () => {
  for (const source of [
    { kind: "inline", values: [], text: "[]" }, { kind: "inline", text: "[]" },
    { kind: "named", format: "json" }, { kind: "url", format: "json", url: "" },
    { kind: "inline", values: [], parse: { x: { type: "number", timeZone: "UTC" } } },
    { kind: "inline", values: [], parse: { x: { type: "number", nullable: 1 } } },
    { kind: "inline", values: [], parse: { x: { type: "number", nullable: undefined } } }
  ]) assert.throws(() => normalizeDataSource(source), TypeError);
  let reads = 0;
  const badSchema = { fields: [{ name: "x", get storageType() { reads += 1; return "number"; } }] };
  assert.throws(() => normalizeDataSource({ kind: "inline", values: [], schema: badSchema }), /accessors/);
  assert.equal(reads, 0);
});

test("explicit schemas validate parsed values and preserve declarations for zero rows", () => {
  const schema = { fields: [{ name: "x", storageType: "number" }] };
  assert.equal(csv("x\n1", { parse: { x: { type: "number" } }, schema }).schema.origin, "declared");
  assert.equal(json([], { schema }).schema.fields[0].storageType, "number");
  assert.throws(() => csv("x\n1", { schema }), /number values/);
  assert.throws(() => json([{ y: 1 }], { schema }), /undeclared field/);
});

test("data dates require explicit timezone and reject invalid Gregorian dates", () => {
  const options = { timeZone: "UTC" };
  assert.equal(parseDataDateValue("2024-02-29", options), 1709164800000);
  assert.equal(parseDataDateValue(2024, options), 2024);
  assert.equal(parseDataDateValue("29/02/2024", { ...options, format: "%d/%m/%Y" }), 1709164800000);
  for (const value of ["2023-02-29", "2024-02-30", "2024-13-01", null, Infinity]) assert.throws(() => parseDataDateValue(value, options));
  assert.throws(() => parseDataDateValue("2024-01-01", {}), /explicit/);
  assert.throws(() => parseDataDateValue("2024-01-01", { timeZone: "+01:00" }), /explicit/);
  assert.throws(() => parseDataDateValue("2024-01-01", { timeZone: "UTC", format: "auto" }), /explicit/);
  assert.equal(parseTimeValue(2024), Date.UTC(2024, 0, 1));
});

test("date parsing shares civil-time folds, rejects gaps, and honors explicit ISO offsets", () => {
  const options = { timeZone: "America/New_York", format: "iso" };
  assert.equal(parseDataDateValue("2024-11-03T01:30:00", options), Date.UTC(2024, 10, 3, 5, 30));
  assert.throws(() => parseDataDateValue("2024-03-10T02:30:00", options), /does not exist/);
  assert.equal(parseDataDateValue("2024-03-10T02:30:00-05:00", options), Date.UTC(2024, 2, 10, 7, 30));
  assert.equal(parseDataDateValue("2024-03-10T07:30:00.123Z", options), Date.UTC(2024, 2, 10, 7, 30, 0, 123));
  assert.throws(() => parseDataDateValue("2011-12-30", { timeZone: "Pacific/Apia" }), /does not exist/);
  for (const value of ["2023-02-29T00:00:00Z", "2024-01-01T24:00:00Z", "2024-01-01T00:00:00+24:00", "not a date"]) assert.throws(() => parseDataDateValue(value, options));
  assert.equal(csv("when\n2024-02-29", { parse: { when: { type: "date", timeZone: "UTC" } } }).values[0].when, 1709164800000);
});
