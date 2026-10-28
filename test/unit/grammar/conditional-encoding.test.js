import { getErrorDetails } from "../../../src/core/diagnostics.js";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeConditionalEncoding, evaluateConditionalEncoding, evaluatePredicateExpression } from "../../../src/grammar/conditionalEncoding.js";
const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const expression = root => ({ version: 2, registry: "standard@1", root });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const env = { fields: { score: { type: "number" } }, parameters: { threshold: { type: "number", value: 5 } } };
const branch = (root, value) => ({ when: expression(root), value });

test("ordered predicates choose the first match and required otherwise without dropping zero", () => {
  const definition = { conditions: [branch(binary("gte", field("score"), parameter("threshold")), { value: 0 }), branch(binary("gte", field("score"), literal(3)), { value: 0.5 })], otherwise: { value: 1 } };
  const output = evaluateConditionalEncoding(definition, [{ score: 6 }, { score: 5 }, { score: 4 }, { score: 2 }], env);
  assert.deepEqual(output.indices, [0, 0, 1, -1]);
  assert.equal(output.report.evaluatedPredicates, 6);
  const normalized = normalizeConditionalEncoding(definition, { environment: env });
  assert.deepEqual(normalized.fields, ["score"]); assert.deepEqual(normalized.parameters, ["threshold"]);
  assert.equal(normalized.definition.conditions[0].value.value, 0);
  definition.conditions[0].value.value = 1;
  assert.equal(normalized.definition.conditions[0].value.value, 0);
  assert.ok(Object.isFrozen(normalized.definition.conditions[0].value));
  assert.ok(Object.isFrozen(output.indices));
});

test("inactive branches are statically checked and their values are all normalized", () => {
  const base = { conditions: [branch(literal(true), { value: 0 })], otherwise: { value: 1 } };
  for (const root of [field("unknown"), parameter("unknown"), literal(1), literal(null), binary("add", literal("bad"), literal(1))]) {
    assert.throws(() => evaluateConditionalEncoding({ ...base, conditions: [...base.conditions, branch(root, { value: 0.2 })] }, [], env));
  }
  const paths = [];
  normalizeConditionalEncoding({ ...base, conditions: [...base.conditions, branch(literal(false), { value: 0.5 })] }, { normalizeValue(value, path) { paths.push(path); return value; } });
  assert.deepEqual(paths, [["conditions", 0, "value"], ["conditions", 1, "value"], ["otherwise"]]);
  assert.throws(() => normalizeConditionalEncoding(base, { normalizeValue(value) { if (value.value === 1) throw Error("inactive invalid"); return value; } }), /inactive invalid/);
});

test("later predicates run only for unmatched items and do not produce lazy-domain diagnostics", () => {
  const division = binary("gt", binary("divide", literal(1), literal(0)), literal(0));
  const definition = { conditions: [branch(literal(true), 0), branch(division, 1)], otherwise: 2 };
  const result = evaluateConditionalEncoding(definition, [{}, {}]);
  assert.deepEqual(result.indices, [0, 0]);
  assert.equal(result.report.evaluatedPredicates, 2);
  assert.equal(result.report.counts.divideByZero, 0);
});

test("stored selections are explicit identities with complete boolean membership", () => {
  const definition = { conditions: [{ when: { selection: "chosen" }, value: 0 }, branch(literal(true), 1)], otherwise: 2 };
  assert.deepEqual(evaluateConditionalEncoding(definition, [{}, {}, {}], {}, { chosen: [false, true, false] }).indices, [1, 0, 1]);
  assert.deepEqual(normalizeConditionalEncoding(definition).selections, ["chosen"]);
  assert.throws(() => evaluateConditionalEncoding(definition, [{}]), /Unknown conditional selection/);
  for (const membership of [[], [1], Array(1), [false, true]]) assert.throws(() => evaluateConditionalEncoding(definition, [{}], {}, { chosen: membership }));
});

test("conditional boundaries reject malformed structures, accessors, cycles and oversized work", () => {
  const definition = { conditions: [branch(literal(true), { value: 0 })], otherwise: { value: 1 } };
  for (const malformed of [{}, { conditions: [], otherwise: 1 }, { conditions: definition.conditions }, { ...definition, extra: true }, { ...definition, conditions: Array(1) }, { ...definition, conditions: Array(65).fill(definition.conditions[0]) }]) assert.throws(() => normalizeConditionalEncoding(malformed));
  let calls = 0;
  const getter = () => { calls++; return true; };
  for (const value of [Object.defineProperty({}, "value", { enumerable: true, get: getter }), { nested: Object.defineProperty({}, "value", { enumerable: true, get: getter }) }]) {
    assert.throws(() => normalizeConditionalEncoding({ ...definition, otherwise: value }), /accessors/);
  }
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => normalizeConditionalEncoding({ ...definition, otherwise: cyclic }), /cycles/);
  assert.equal(calls, 0);
  const many = { conditions: Array(64).fill(branch(literal(false), 0)), otherwise: 1 };
  assert.throws(() => evaluateConditionalEncoding(many, Array(156251).fill({})), error => getErrorDetails(error)?.code === "resource-limit");
});

test("predicate roots require actual booleans, while comparisons preserve null and missing behavior", () => {
  for (const value of [0, 1, "", "true", null]) assert.throws(() => evaluatePredicateExpression(expression(literal(value)), [{}]), /boolean/);
  assert.deepEqual(evaluatePredicateExpression(expression(binary("gt", field("score"), literal(1))), [{}, { score: null }, { score: 2 }], { fields: { score: { type: "number", optional: true } } }).values, [false, false, true]);
  assert.throws(() => evaluatePredicateExpression(expression(field("flag")), [{ flag: null }], { fields: { flag: { type: "boolean" } } }), /boolean/);
});
