import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpressionV2 } from "../../../src/grammar/expressionEvaluate.js";
import { normalizeExpressionV2 } from "../../../src/grammar/expressionAst.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
const literal = value => ({ type: "literal", value });
const envelope = root => ({ version: 2, registry: "standard@1", root });
const unary = operand => ({ type: "unary", op: "negate", operand });
const resourceLimit = error => getErrorDetails(error)?.code === "resource-limit";
function tree(depth) {
  if (depth === 0) return literal(1);
  const shared = tree(depth - 1);
  return { type: "binary", op: "add", left: shared, right: shared };
}

test("depth and occurrence budgets count shared references and inactive branches", () => {
  let root = literal(1); for (let i = 0; i < 63; i++) root = unary(root);
  assert.equal(normalizeExpressionV2(envelope(root)).nodes, 64);
  assert.throws(() => normalizeExpressionV2(envelope(unary(root))), resourceLimit);
  const exact = unary(tree(11));
  assert.equal(normalizeExpressionV2(envelope(exact)).nodes, 4096);
  assert.throws(() => normalizeExpressionV2(envelope(unary(exact))), resourceLimit);
  const lazy = { type: "if", condition: literal(true), then: literal(1), else: root };
  assert.throws(() => normalizeExpressionV2(envelope(lazy)), resourceLimit);
});

test("row work uses total normalized nodes before any evaluation", () => {
  const root = unary(tree(11));
  assert.throws(() => evaluateExpressionV2(envelope(root), Array(2442).fill({})), resourceLimit);
  assert.deepEqual(evaluateExpressionV2(envelope(root), []).values, []);
  const rows = Array(2441).fill({});
  const result = evaluateExpressionV2(envelope(root), rows);
  assert.equal(result.values.length, 2441); assert.equal(result.values[0], -2048);
});

test("string size applies to literal input and generated output before returning rows", () => {
  const value = "x".repeat(1048576);
  assert.equal(evaluateExpressionV2(envelope(literal(value)), [{}]).values[0].length, 1048576);
  assert.throws(() => evaluateExpressionV2(envelope(literal(value + "x")), []), resourceLimit);
  const call = { type: "call", name: "concat", args: [literal(value), literal("x")] };
  assert.throws(() => evaluateExpressionV2(envelope(call), [{}]), resourceLimit);
  const upper = { type: "call", name: "upper", args: [literal("ß".repeat(524289))] };
  assert.throws(() => evaluateExpressionV2(envelope(upper), [{}]), resourceLimit);
  const replace = { type: "call", name: "replace", args: [literal(value), literal("x"), literal("xx")] };
  assert.throws(() => evaluateExpressionV2(envelope(replace), [{}]), resourceLimit);
});

test("array and total work budgets are bounded and rejected atomically", () => {
  const expression = envelope({ type: "call", name: "arrayLength", args: [{ type: "field", name: "list" }] });
  const environment = { fields: { list: { type: "array" } } };
  const list = Array(100000).fill(1);
  assert.deepEqual(evaluateExpressionV2(expression, [{ list }], environment).values, [100000]);
  assert.throws(() => evaluateExpressionV2(expression, [{ list: Array(100001) }], environment), resourceLimit);
  assert.throws(() => evaluateExpressionV2(expression, Array(101).fill({ list }), environment), resourceLimit);
  const text = envelope({ type: "call", name: "lower", args: [literal("X".repeat(1000000))] });
  assert.throws(() => evaluateExpressionV2(text, Array(11).fill({})), resourceLimit);
  assert.equal(list.length, 100000);
});

test("string work counts each processed input and output once including lazy result leaves", () => {
  const value = "x".repeat(1000000);
  const lower = envelope({ type: "call", name: "lower", args: [literal(value)] });
  assert.equal(evaluateExpressionV2(lower, Array(5).fill({})).values.length, 5);
  assert.throws(() => evaluateExpressionV2(lower, Array(6).fill({})), resourceLimit);
  const conditional = envelope({ type: "if", condition: literal(true), then: literal(value), else: literal("") });
  assert.equal(evaluateExpressionV2(conditional, Array(10).fill({})).values.length, 10);
  assert.throws(() => evaluateExpressionV2(conditional, Array(11).fill({})), resourceLimit);
});
