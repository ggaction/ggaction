import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpressionV2 } from "../../../src/grammar/expressionEvaluate.js";
import { normalizeExpressionV2 } from "../../../src/grammar/expressionAst.js";
import { chart } from "../../../src/index.js";
import * as inspection from "../../../src/inspection.js";
import { summarizeArgs } from "../../../src/core/action.js";
const literal = value => ({ type: "literal", value });
const envelope = root => ({ version: 2, registry: "standard@1", root });
const evaluate = (root, rows = [{}], environment = {}) => evaluateExpressionV2(envelope(root), rows, environment);
const binary = (op, left, right) => ({ type: "binary", op, left, right });

test("normalization rejects malformed and executable input without invoking accessors", () => {
  const malformed = [null, [], new Date(), new Map(), new Uint8Array(2), () => 1, {}, { type: "unknown" }, { type: "literal" }, { ...literal(1), extra: 1 }, literal(undefined), literal(Infinity), literal(NaN), literal({}), literal([]), { type: "unary", op: "abs", operand: literal(1) }, binary("^", literal(1), literal(2))];
  for (const value of malformed) assert.throws(() => evaluate(value));
  for (const root of [Object.assign(literal(1), { [Symbol("key")]: 1 }), Object.defineProperty(literal(1), "hidden", { value: 1 }), Object.create({ type: "literal", value: 1 })]) assert.throws(() => evaluate(root));
  let calls = 0;
  const getter = () => { calls++; return 1; };
  for (const key of ["type", "value"]) {
    const root = literal(1); Object.defineProperty(root, key, { get: getter });
    assert.throws(() => evaluate(root), /accessors/);
  }
  const options = Object.defineProperty({}, "angleUnit", { enumerable: true, get: getter });
  assert.throws(() => evaluate({ type: "call", name: "sin", args: [literal(0)], options }), /accessors/);
  const args = [literal(0)]; Object.defineProperty(args, "0", { get: getter });
  assert.throws(() => evaluate({ type: "call", name: "sin", args, options: { angleUnit: "degrees" } }), /accessors/);
  assert.equal(calls, 0);
  const cycle = { type: "unary", op: "negate" }; cycle.operand = cycle;
  assert.throws(() => evaluate(cycle), /cycles/);
  assert.deepEqual(evaluate(Object.assign(Object.create(null), literal(1))).values, [1]);
  for (const expression of [{ version: 1, registry: "standard@1", root: literal(1) }, { version: 2, registry: "standard@2", root: literal(1) }, { version: 2, root: literal(1) }]) assert.throws(() => evaluateExpressionV2(expression, []));
});

test("all lazy branches have validated structure, references and known types", () => {
  const conditional = bad => ({ type: "if", condition: literal(true), then: literal(1), else: bad });
  for (const bad of [{ type: "field", name: "absent" }, { type: "parameter", id: "absent" }, binary("add", literal("1"), literal(2)), { type: "call", name: "abs", args: [literal("1")] }, { type: "call", name: "sin", args: [literal(0)] }]) {
    assert.throws(() => evaluate(conditional(bad), []));
  }
  assert.throws(() => evaluate(binary("add", conditional(literal("text")), literal(2))), /number/);
  for (const root of [{ type: "unary", op: "not", operand: literal(null) }, { type: "if", condition: literal(1), then: literal(1), else: literal(2) }, binary("and", literal(true), literal(null)), binary("lt", literal(1), literal("2"))]) assert.throws(() => evaluate(root));
  assert.throws(() => evaluate({ type: "call", name: "replace", args: [literal("abc"), { type: "field", name: "search" }, literal("x")] }, [], { fields: { search: { type: "string" } } }), /literal/);
});

test("field and parameter dependencies use explicit identities and own keys", () => {
  const fields = { "a.b": { type: "number" }, meta: { type: "object", optional: true }, optional: { type: "number", optional: true } };
  const parameters = { threshold: { type: "number", value: 4 } };
  const root = binary("add", { type: "field", name: "a.b" }, { type: "parameter", id: "threshold" });
  const input = envelope(root);
  const normalized = normalizeExpressionV2(input, { fields, parameters });
  assert.deepEqual(normalized.fields, ["a.b"]); assert.deepEqual(normalized.parameters, ["threshold"]);
  assert.equal(normalized.nodes, 3); assert.ok(Object.isFrozen(normalized.expression.root));
  assert.notEqual(normalized.expression.root, root);
  assert.deepEqual(evaluate(root, [{ "a.b": 3 }], { fields, parameters }).values, [7]);
  parameters.threshold.value = 100;
  assert.equal(normalized.environment.parameters.threshold.value, 4);
  assert.throws(() => evaluate(root, [{}], { fields, parameters }), /absent/);
  const path = { type: "fieldPath", root: "meta", path: ["deep", "value"] };
  assert.deepEqual(evaluate(path, [{ meta: { deep: { value: 8 } } }, { meta: {} }, {}], { fields }).values, [8, undefined, undefined]);
  assert.deepEqual(evaluate({ type: "field", name: "optional" }, [{}], { fields }).values, [undefined]);
  for (const keys of [[], ["constructor"], ["__proto__"], ["prototype"], [""], [0], Array(9).fill("x")]) assert.throws(() => evaluate({ ...path, path: keys }, [], { fields }));
  assert.throws(() => evaluate(path, [{ meta: { deep: [] } }], { fields }), /plain object/);
  assert.throws(() => evaluate({ type: "field", name: "meta" }, [], { fields }), /output/);
  assert.throws(() => evaluate({ type: "field", name: "a.b" }, [{ "a.b": "3" }], { fields }), /Field value/);
});

test("unknown field types are checked only in executed branches and outputs remain homogeneous", () => {
  const field = { type: "field", name: "x" };
  const environment = { fields: { x: { type: "unknown" }, choose: { type: "boolean" } } };
  const root = { type: "if", condition: { type: "field", name: "choose" }, then: literal(7), else: binary("add", field, literal(1)) };
  assert.deepEqual(evaluate(root, [{ choose: true, x: "bad" }, { choose: false, x: 2 }], environment).values, [7, 3]);
  assert.throws(() => evaluate(root, [{ choose: false, x: "bad" }], environment), /number/);
  assert.throws(() => evaluate(field, [{ x: 1 }, { x: "2" }], environment), /uniform/);
  for (const value of [[], {}, Infinity, () => 1, new Date()]) assert.throws(() => evaluate(field, [{ x: value }], environment));
  assert.throws(() => evaluate(binary("lt", field, literal(3)), [{ x: "a" }], environment), /matching/);
  assert.throws(() => evaluate({ type: "unary", op: "not", operand: field }, [{ x: 1 }], environment), /boolean/);
  assert.deepEqual(evaluate(field, [{ x: null }, { x: undefined }, { x: 1 }], environment).values, [null, undefined, 1]);
});

test("schema, parameter and row descriptors are validated without executing code", () => {
  let calls = 0;
  const getter = () => { calls++; return 1; };
  const accessor = Object.defineProperty({}, "x", { get: getter, enumerable: true });
  for (const environment of [null, { extra: 1 }, { fields: accessor }, { fields: { x: { type: "bad" } } }, { fields: { x: { type: "number", optional: "yes" } } }, { parameters: { x: { type: "array", value: [] } } }, { parameters: { x: { type: "number", value: "1" } } }, { parameters: { x: Object.defineProperty({ type: "number" }, "value", { get: getter, enumerable: true }) } }]) assert.throws(() => evaluate(literal(1), [], environment));
  assert.throws(() => evaluate(literal(1), [accessor]), /accessors/);
  assert.throws(() => evaluate(literal(1), {}), /array/);
  assert.throws(() => evaluate(literal(1), new Array(1)), /dense/);
  assert.equal(calls, 0);
});

test("action summaries and computed creation or editing never execute AST getters", () => {
  let calls = 0;
  const getter = () => { calls++; return 5; };
  const bad = Object.defineProperty({}, "constant", { get: getter, enumerable: true });
  assert.deepEqual(summarizeArgs({ expression: bad }), { expression: { constantType: "accessor" } });
  const source = chart().createData({ id: "source", values: [{ x: 1 }] });
  const previous = source.semanticSpec;
  assert.throws(() => source.createComputedData({ id: "out", as: "y", expression: bad }), /accessors/);
  const program = source.createComputedData({ id: "out", as: "y", expression: { constant: 1 } });
  assert.throws(() => program.editComputedData({ target: "out", expression: bad }), /accessors/);
  const target = Object.defineProperty({}, "target", { get: getter, enumerable: true });
  assert.throws(() => program.editComputedData(target), /accessors/);
  assert.throws(() => source.createDerivedData({ id: "bad", source: "source", transform: [{ type: "computed", as: "y", expression: bad }] }), /accessors/);
  assert.throws(() => program.editDerivedData({ target: "out", definition: { type: "computed", as: "y", expression: bad } }), /accessors/);
  const definition = Object.defineProperty({ as: "y", expression: { constant: 2 } }, "type", { get: getter, enumerable: true });
  assert.throws(() => program.editDerivedData({ target: "out", definition }), /accessors/);
  assert.throws(() => source.createDerivedData({ id: "bad", source: "source", transform: [definition] }), /accessors/);
  assert.throws(() => program.editSemantic({ property: "dataset[out].transform", value: [definition] }), /accessors/);
  assert.equal(calls, 0); assert.equal(source.semanticSpec, previous);
  const operands = [{ constant: 1 }, { constant: 2 }]; Object.defineProperty(operands, "0", { get: getter });
  assert.throws(() => source.createComputedData({ id: "computed", as: "y", expression: { op: "coalesce", operands } }), /accessors/);
  assert.equal(calls, 0);
});

test("summaries handle deep plain data and avoid constructor getters or prototype mutation", () => {
  let calls = 0;
  class Reference { get constructorName() { calls++; return "bad"; } }
  const object = new Reference(); Object.defineProperty(object, "constructor", { get() { calls++; return Reference; } });
  assert.deepEqual(summarizeArgs({ object }), { objectType: "object" });
  const input = JSON.parse('{"__proto__":{"x":1}}');
  const summary = summarizeArgs(input);
  assert.equal(Object.getPrototypeOf(summary), Object.prototype);
  assert.equal(Object.hasOwn(summary, "__proto__"), true);
  assert.equal(calls, 0);
  let deep = { value: 1 }; for (let i = 0; i < 10000; i++) deep = { value: deep };
  assert.doesNotThrow(() => summarizeArgs(deep));
});

test("private v2 core does not expose authoring or registry lookup prematurely", () => {
  assert.equal(inspection.getExpressionFunctions, undefined);
  const program = chart().createData({ values: [{ x: 1 }] });
  assert.throws(() => program.createComputedData({ id: "computed", as: "result", expression: envelope(literal(1)) }));
  assert.deepEqual(program.createComputedData({ id: "computed", as: "result", expression: { op: "eq", left: { constant: null }, right: { constant: null } } }).semanticSpec.datasets.at(-1).values.map(row => row.result), [true]);
});

test("arrays reject hidden, extra, sparse or custom prototype AST elements", () => {
  const fixtures = [Object.assign([literal(1)], { extra: 1 }), new Array(1), Object.setPrototypeOf([literal(1)], null)];
  for (const args of fixtures) assert.throws(() => evaluate({ type: "call", name: "abs", args }));
  assert.throws(() => evaluate({ type: "call", name: "abs", args: {} }), /array/);
  assert.throws(() => evaluate({ type: "call", name: "toNumber", args: [literal("0x10")] }), /decimal/);
  const path = ["value"]; Object.defineProperty(path, "extra", { value: 3 });
  assert.throws(() => evaluate({ type: "fieldPath", root: "meta", path }, [], { fields: { meta: { type: "object" } } }), /own data/);
});


test("shared argument DAGs do not expand before computed occurrence validation", () => {
  let expression = { constant: 1 };
  for (let depth = 0; depth < 40; depth++) expression = { op: "add", left: expression, right: expression };
  const summary = summarizeArgs({ expression });
  assert.equal(summary.expression.left, summary.expression.right);
  const source = chart().createData({ id: "source", values: [{ x: 1 }] });
  assert.throws(() => source.createComputedData({ id: "computed", as: "y", expression }), /depth 16|128 nodes/);
  assert.equal(source.semanticSpec.datasets.length, 1);
});
