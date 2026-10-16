import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveComputedRows, normalizeComputedTransform } from "../../../../src/grammar/computed.js";

const path = (root, ...keys) => ({ op: "getPath", operand: { field: root }, path: keys });
const replace = (operand, search = "%", replacement = "") => ({ op: "replaceLiteral", operand, search, replacement });
const derive = (rows, expression) => deriveComputedRows(rows, normalizeComputedTransform({ as: "result", expression }));

test("nested scalar access preserves raw records, optional roots, literal dotted keys and root dependencies", () => {
  const rows = [{ item: { nested: { value: 2 }, "a.b": "literal" } }, {}, { item: null }, { item: { nested: null } }];
  const expression = path("item", "nested", "value");
  const before = structuredClone(rows);
  const original = chart().createData({ id: "raw", values: rows });
  const computed = original.createComputedData({ id: "values", as: "number", expression });
  assert.deepEqual(computed.semanticSpec.datasets[1].values.map(row => row.number), [2, null, null, null]);
  assert.deepEqual(computed.semanticSpec.datasets[0].values, before);
  assert.deepEqual(rows, before);
  assert.deepEqual(computed.semanticSpec.datasets[1].schema.fields.at(-1).lineage.inputs, [{ data: "raw", field: "item" }]);
  expression.path[0] = "changed";
  assert.deepEqual(computed.semanticSpec.datasets[1].transform[0].expression.path, ["nested", "value"]);
  assert.equal(original.semanticSpec.datasets.length, 1);
  assert.equal(derive([{ item: { "a.b": "literal" } }], path("item", "a.b"))[0].result, "literal");
  for (const value of [1, "text", false, null]) assert.equal(derive([{ item: { value } }], path("item", "value"))[0].result, value);
  assert.equal(derive([{ "item.value": 4 }], { field: "item.value" })[0].result, 4);
  assert.throws(() => derive([{ item: { value: 4 } }], { field: "item.value" }), /does not contain field/);
});

test("nested access rejects unsafe shapes and never invokes property getters", () => {
  const invalidPaths = [[], Array(1), Array(9).fill("key"), [0], [""], ["__proto__"], ["constructor"], ["prototype"]];
  for (const keys of invalidPaths) assert.throws(() => derive([{ item: {} }], { ...path("item", "x"), path: keys }), /getPath path/);
  for (const operand of [{ constant: "x" }, { op: "concat", operands: [{ constant: "x" }] }, { field: "item", extra: true }]) {
    assert.throws(() => derive([{ item: {} }], { op: "getPath", operand, path: ["x"] }), /literal field reference/);
  }
  assert.throws(() => derive([{ item: {} }], { ...path("item", "x"), extra: true }), /Unknown/);
  assert.throws(() => derive([{}], path("absent", "x")), /does not contain field/);
  for (const value of [[], 1, "record", false, new Date(), Object.create({ inherited: 4 })]) {
    assert.throws(() => derive([{ item: value }], path("item", "x")), /plain records/);
  }
  for (const value of [{}, [], Infinity, NaN]) assert.throws(() => derive([{ item: { value } }], path("item", "value")), /scalar value/);
  let calls = 0;
  const nested = Object.defineProperty({}, "value", { enumerable: true, get() { calls += 1; return 3; } });
  assert.throws(() => derive([{ item: nested }], path("item", "value")), /accessor/);
  const root = Object.defineProperty({}, "item", { enumerable: true, get() { calls += 1; return { value: 3 }; } });
  assert.throws(() => derive([root], path("item", "value")), /accessor/);
  assert.equal(calls, 0);
  assert.equal(derive([{ item: {} }], path("item", "toString"))[0].result, null);
  assert.throws(() => derive([{ item: {} }, {}], { op: "concat", operands: [{ field: "item" }, path("item", "x")] }), /does not contain field/);
});

test("literal replacement replaces first exact substring and treats Unicode, regex and dollar text literally", () => {
  const cases = [
    ["1.15%", "%", "", "1.15"], ["%a%b", "%", "!", "!a%b"],
    ["abc", "x", "y", "abc"], ["abc", "A", "z", "abc"],
    ["a.*b.*", ".*", "$&$1$$", "a$&$1$$b.*"], ["雪❄雪", "雪", "☀", "☀❄雪"],
    ["tail%", "%", "", "tail"], ["%head", "%", "", "head"]
  ];
  for (const [input, search, replacement, expected] of cases) {
    assert.equal(derive([{ input }], replace({ field: "input" }, search, replacement))[0].result, expected);
  }
  const expression = { op: "divide", left: { op: "toNumber", operand: replace({ field: "text" }) }, right: { constant: 100 } };
  assert.equal(derive([{ text: "1.15%" }], expression)[0].result, 0.0115);
});

test("literal replacement validates all branches, preserves laziness, limits and failure atomicity", () => {
  const base = chart().createData({ values: [{ text: "5%" }] });
  const snapshot = JSON.stringify(base);
  for (const expression of [replace({ field: "text" }, ""), replace({ field: "text" }, 2), replace({ field: "text" }, "%", null), { ...replace({ field: "text" }), flags: "g" }]) {
    assert.throws(() => base.createComputedData({ id: "invalid", as: "result", expression }));
  }
  for (const value of [null, undefined, 1, true, [], {}]) assert.throws(() => derive([{ input: value }], replace({ field: "input" })), /scalar|requires a string/);
  assert.equal(derive([{}], { op: "if", condition: { constant: false }, then: replace({ constant: 1 }), else: { constant: "safe" } })[0].result, "safe");
  assert.throws(() => derive([{}], { op: "if", condition: { constant: false }, then: replace({ field: "absent" }), else: { constant: "safe" } }), /does not contain field/);
  let expression = { constant: "text" };
  for (let n = 0; n < 16; n += 1) expression = replace(expression, "x", "y");
  assert.throws(() => derive([{}], expression), /depth 16/);
  assert.equal(JSON.stringify(base), snapshot);
});

test("new expressions replay through edits, persistence, filtered marks and faceted categories", () => {
  for (const factory of [chart]) {
    const base = factory().createCanvas({ width: 500, height: 400, margin: 100 }).createData({ id: "raw", values: [
      { item: { value: 1, group: "A" }, text: "10%" },
      { item: { value: 2, group: "B" }, text: "20%" },
      { text: "30%" }
    ] }).createComputedData({ id: "numbers", as: "x", expression: path("item", "value") })
      .createComputedData({ id: "groups", as: "group", expression: path("item", "group") })
      .createComputedData({ id: "strings", as: "stripped", expression: replace({ field: "text" }) })
      .createComputedData({ id: "numeric", as: "y", expression: { op: "toNumber", operand: { field: "stripped" } } })
      .filterData({ id: "defined", field: "x", noneOf: [null] })
      .createScatterPlot({ x: "x", y: "y", color: "group", guides: false }).createLegend({ title: false });
    assert.equal(base.graphicSpec.objects.scatterPlot.items.length, 2);
    assert.deepEqual(deserializeProgram(serializeProgram(base)).graphicSpec, base.graphicSpec);
    if (factory === chart) {
      const edited = base.editComputedData({ target: "strings", dependents: "recompute", expression: replace({ field: "text" }, "%", "0") });
      assert.deepEqual(edited.semanticSpec.datasets.find(d => d.id === edited.materializationConfigs.data.computed.numeric.current).values.map(row => row.y), [100, 200, 300]);
      assert.deepEqual(base.semanticSpec.datasets.find(d => d.id === "numeric").values.map(row => row.y), [10, 20, 30]);
      const faceted = base.facet({ field: "group", guides: { legend: false } });
      assert.equal(faceted.compositionSpec.children.length, 2);
    }
  }
});
