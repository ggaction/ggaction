import test from "node:test";
import assert from "node:assert/strict";
import { normalizeParameterOptions, normalizeParameterEditOptions, normalizeParameterValue,
  validateParameterResource, parameterEnvironment } from "../../../src/grammar/parameter.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";

const resource = (id, value, type = typeof value, nullable = false) => ({
  kind: "parameter", id, revision: 0, algorithmVersion: "1", ownership: { mode: "authored" }, inputs: [],
  options: { type, nullable }, result: { value }, provenance: { origin: "authored" }
});

test("parameter scalar normalization preserves falsy values, negative zero, and explicit nullability", () => {
  for (const value of [0, -0, 3.5, "", "threshold", false, true]) {
    const options = { id: "threshold", value };
    const normalized = normalizeParameterOptions(options);
    assert.equal(normalized.type, typeof value);
    assert.equal(normalized.nullable, false);
    assert.ok(Object.is(normalized.value, value));
    assert.ok(Object.isFrozen(normalized));
    assert.ok(!Object.isFrozen(options));
    assert.deepEqual(options, { id: "threshold", value });
  }
  assert.deepEqual(normalizeParameterOptions({ id: "threshold", type: "number", nullable: true, value: null }),
    { id: "threshold", type: "number", nullable: true, value: null });
  assert.equal(normalizeParameterValue(null, { type: "string", nullable: true }), null);
});

test("parameter definitions reject absent, unsupported, nonfinite, or mismatched values", () => {
  const invalid = [
    {}, { value: 1 }, { id: "p" }, { id: "p", value: undefined },
    { id: "p", value: null }, { id: "p", value: null, nullable: true },
    { id: "p", value: null, type: "number" }, { id: "p", value: 1, type: "string" },
    { id: "p", value: 1, type: undefined }, { id: "p", value: 1, nullable: undefined },
    { id: "p", value: 1, nullable: 1 }, { id: "p", value: 1, extra: true },
    { id: "", value: 1 }, { id: "a.b", value: 1 },
    ...[NaN, Infinity, -Infinity, {}, [], new Date(0), 1n, () => 1, Symbol("p")].map(value => ({ id: "p", value }))
  ];
  for (const options of invalid) assert.throws(() => normalizeParameterOptions(options));
  assert.throws(() => normalizeParameterValue(1, { type: "number", nullable: false, extra: 1 }));
});

test("parameter strings share the expression limit and retain the complete accepted string", () => {
  const accepted = "x".repeat(1_048_576);
  assert.equal(normalizeParameterOptions({ id: "p", value: accepted }).value, accepted);
  assert.throws(() => normalizeParameterOptions({ id: "p", value: `${accepted}x` }),
    error => getErrorDetails(error)?.code === "resource-limit");
});

test("parameter options and nested definitions inspect descriptors before reading values", () => {
  let reads = 0;
  for (const key of ["id", "value", "type", "nullable", "unknown"]) {
    const options = { id: "p", value: 1 };
    Object.defineProperty(options, key, { enumerable: true, get() { reads++; return 1; } });
    assert.throws(() => normalizeParameterOptions(options), /own data properties/);
  }
  for (const key of ["hidden", Symbol("hidden")]) {
    const options = { id: "p", value: 1 };
    Object.defineProperty(options, key, { value: true });
    assert.throws(() => normalizeParameterOptions(options), /own data properties/);
  }
  const stored = resource("p", 1);
  Object.defineProperty(stored.options, "type", { enumerable: true, get() { reads++; return "number"; } });
  assert.throws(() => validateParameterResource(stored), /own data properties/);
  assert.equal(reads, 0);
});

test("parameter edits require explicit targets and scalar values without changing the definition", () => {
  assert.deepEqual(normalizeParameterEditOptions({ target: "p", value: false }), { target: "p", value: false });
  assert.deepEqual(normalizeParameterEditOptions({ target: "p", value: null }), { target: "p", value: null });
  for (const options of [{}, { target: "p" }, { target: "p", value: undefined }, { target: "p", value: {} },
    { target: "p", value: Infinity }, { target: "p", value: 1, type: "number" }, { value: 1 }]) {
    assert.throws(() => normalizeParameterEditOptions(options));
  }
});

test("parameter environments keep typed namespaces and special IDs as immutable own properties", () => {
  const inputs = [resource("__proto__", -0), resource("constructor", null, "number", true),
    { kind: "persistent-selection", id: "__proto__" }];
  const environment = parameterEnvironment(inputs);
  assert.equal(Object.getPrototypeOf(environment), null);
  assert.deepEqual(Object.keys(environment), ["__proto__", "constructor"]);
  assert.ok(Object.is(environment.__proto__.value, -0));
  assert.deepEqual(environment.constructor, { type: "number", value: null });
  assert.ok(Object.isFrozen(environment));
  assert.ok(Object.isFrozen(environment.__proto__));
  inputs[0].result.value = 8;
  assert.ok(Object.is(environment.__proto__.value, -0));
  assert.throws(() => parameterEnvironment([resource("p", 1), resource("p", 2)]),
    error => getErrorDetails(error)?.code === "duplicate-id");
});
