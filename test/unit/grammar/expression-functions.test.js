import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpressionV2 } from "../../../src/grammar/expressionEvaluate.js";
import { EXPRESSION_FUNCTIONS } from "../../../src/grammar/expressionFunctions.js";
const literal = value => ({ type: "literal", value });
const call = (name, values, options) => ({ type: "call", name, args: values.map(literal), ...(options === undefined ? {} : { options }) });
const evaluate = (root, rows = [{}], environment = {}) => evaluateExpressionV2({ version: 2, registry: "standard@1", root }, rows, environment);

const cases = [
  ["abs", [-3], 3], ["min", [4, -2, 7], -2], ["max", [4, -2, 7], 7],
  ["pow", [2, 3], 8], ["sqrt", [9], 3], ["log", [1], 0], ["exp", [0], 1],
  ["round", [1.5], 2], ["floor", [-1.1], -2], ["ceil", [-1.1], -1],
  ["toNumber", [" -1.25e2 "], -125], ["toNumber", [8], 8],
  ["sin", [90], 1, { angleUnit: "degrees" }], ["cos", [0], 1, { angleUnit: "radians" }],
  ["tan", [0], 0, { angleUnit: "degrees" }], ["atan2", [1, 0], 90, { angleUnit: "degrees" }],
  ["lower", ["ABCÄ"], "abcä"], ["upper", ["Straße"], "STRASSE"], ["length", ["A😀é"], 4],
  ["substring", ["A😀B", 1, 2], "😀"], ["replace", ["aa-aa", "aa", "$&"], "$&-aa"],
  ["replace", ["abc", "x", "y"], "abc"], ["concat", ["a", "😀", "b"], "a😀b"],
  ["isNull", [null], true], ["isMissing", [null], false], ["isFinite", ["1"], false],
  ["isFinite", [1], true], ["coalesce", [null, 7], 7], ["coalesce", [null, null], undefined]
];
for (const [name, values, expected, options] of cases) test(`expression ${name}: ${JSON.stringify(values)}`, () => {
  assert.deepEqual(evaluate(call(name, values, options)).values, [expected]);
});

test("numeric functions preserve signed zero and finite tangent near its pole", () => {
  assert.ok(Object.is(evaluate(call("round", [-0.5])).values[0], -0));
  assert.ok(evaluate(call("tan", [90], { angleUnit: "degrees" })).values[0] > 1e15);
  assert.equal(evaluate(call("atan2", [0, -1], { angleUnit: "radians" })).values[0], Math.PI);
  for (const x of [0, 0.1, 0.4, 0.8, 1, 2]) {
    const s = evaluate(call("sin", [x], { angleUnit: "radians" })).values[0];
    const c = evaluate(call("cos", [x], { angleUnit: "radians" })).values[0];
    assert.ok(Math.abs(s * s + c * c - 1) < 1e-14);
  }
});

test("numeric failures count executed operations without retaining cell values", () => {
  for (const [name, values, kind] of [["sqrt", [-1], "domain"], ["log", [0], "domain"], ["pow", [-2, 0.5], "domain"], ["exp", [1000], "nonFinite"], ["pow", [0, -1], "nonFinite"], ["toNumber", ["1e999"], "nonFinite"]]) {
    const result = evaluate(call(name, values));
    assert.deepEqual(result.values, [undefined]);
    assert.equal(result.report.counts[kind], 1);
    assert.equal(result.report.missingRows, 1);
    assert.deepEqual(Object.keys(result.report), ["algorithm", "registry", "evaluatedRows", "missingRows", "counts"]);
  }
  for (const name of ["sqrt", "log", "exp", "toNumber"]) {
    const result = evaluate(call(name, [null]));
    assert.deepEqual(result.values, [undefined]);
    assert.ok(Object.values(result.report.counts).every(count => count === 0));
  }
});

test("array operations distinguish holes, bounds and invalid selected cells", () => {
  const environment = { fields: { list: { type: "array" } } };
  const root = { type: "call", name: "at", args: [{ type: "field", name: "list" }, literal(1)] };
  assert.deepEqual(evaluate(root, [{ list: [4, 8] }, { list: new Array(2) }], environment).values, [8, undefined]);
  const bounds = evaluate(root, [{ list: [] }], environment);
  assert.equal(bounds.report.counts.arrayBounds, 1);
  for (const list of [[1, {}], [1, []]]) assert.throws(() => evaluate(root, [{ list }], environment), /scalar/);
  assert.throws(() => evaluate({ ...root, args: [root.args[0], literal(-1)] }, [{ list: [3] }], environment), /index/);
  assert.equal(evaluate({ ...root, name: "arrayLength", args: [root.args[0]] }, [{ list: [1, 2, 3] }], environment).values[0], 3);
  const accessor = [1, 2]; let calls = 0;
  Object.defineProperty(accessor, "1", { get() { calls++; return 9; } });
  assert.throws(() => evaluate(root, [{ list: accessor }], environment), /accessors/);
  assert.equal(calls, 0);
});

test("registry descriptors are immutable, closed and cover all thirty functions", () => {
  assert.equal(EXPRESSION_FUNCTIONS.length, 30);
  assert.equal(new Set(EXPRESSION_FUNCTIONS.map(item => item.name)).size, 30);
  assert.ok(Object.isFrozen(EXPRESSION_FUNCTIONS));
  for (const descriptor of EXPRESSION_FUNCTIONS) {
    assert.ok(Object.isFrozen(descriptor)); assert.ok(Object.isFrozen(descriptor.inputs));
    assert.throws(() => evaluate(call(descriptor.name, [])), /arity/);
    assert.throws(() => evaluate(call(descriptor.name, Array(65).fill(1))), /arity/);
  }
  assert.throws(() => evaluate(call("constructor", [])), /Unknown expression function/);
  for (const values of [["x", -1, 1], ["x", 0, 2], ["x", 1, 0], ["x", 0.5, 1]]) assert.throws(() => evaluate(call("substring", values)), /index|range/);
  assert.throws(() => evaluate(call("replace", ["abc", "", "d"])), /literal search/);
  assert.throws(() => evaluate(call("concat", ["x", 4])), /string/);
  assert.throws(() => evaluate(call("abs", [1], {})), /options/);
});
