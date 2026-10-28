import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { normalizeComputedTransform, validateComputedTransform } from "../../../../src/grammar/computed.js";
import { inspectExpressionV2 } from "../../../../src/grammar/expressionAst.js";
import { resolveComputedEnvironment } from "../../../../src/materialization/computedInputs.js";

const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const parameterResource = (id, value, revision = 0) => ({
  kind: "parameter", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
  inputs: [], options: { type: typeof value, nullable: false }, result: { value }, provenance: { origin: "authored" }
});
function withParameter(program, id, value) {
  return program.editSemantic({ property: `resource[parameter:${id}]`, value: parameterResource(id, value) });
}

// Literal expected values cover the public materialization boundary; private
// validators are exercised separately for hostile stored snapshots.
test("computed v2 materializes scalar diagnostics, undefined cells and field lineage", () => {
  const rows = [{ x: 4, y: 2 }, { x: 3, y: 0 }];
  const source = chart().createData({ id: "source", values: rows });
  const program = source.createComputedData({ id: "ratio", as: "result", expression: expression(binary("divide", field("x"), field("y"))) });
  const dataset = program.semanticSpec.datasets.at(-1);
  assert.deepEqual(dataset.values, [{ x: 4, y: 2, result: 2 }, { x: 3, y: 0, result: undefined }]);
  assert.deepEqual(dataset.transform[0].parameterInputs, []);
  assert.deepEqual(dataset.rowKeys, source.semanticSpec.datasets[0].rowKeys);
  assert.deepEqual(dataset.schema.fields.at(-1).lineage.inputs, [{ data: "source", field: "x" }, { data: "source", field: "y" }]);
  assert.equal(dataset.schema.fields.at(-1).optional, true);
  const report = program.materializationConfigs.calculations.datasets.ratio;
  assert.equal(report.evaluatedRows, 2);
  assert.equal(report.missingRows, 1);
  assert.equal(report.counts.divideByZero, 1);
  assert.deepEqual(report.parameterInputs, []);
  assert.deepEqual(source.semanticSpec.datasets[0].values, rows);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.deepEqual(program.trace.children.at(-1).children.map(child => child.op), ["createDerivedData", "materializeComputedData"]);
});

test("computed v2 records all-branch parameter dependencies in first occurrence order", () => {
  const source = withParameter(withParameter(chart().createData({ id: "source", values: [{ x: 2 }] }), "first", 7), "second", 3);
  const tree = { type: "if", condition: literal(true), then: binary("add", parameter("second"), field("x")), else: binary("add", parameter("first"), parameter("second")) };
  const program = source.createComputedData({ id: "computed", as: "value", expression: expression(tree) });
  const dataset = program.semanticSpec.datasets.at(-1);
  assert.equal(dataset.values[0].value, 5);
  assert.deepEqual(dataset.transform[0].parameterInputs, [{ kind: "parameter", id: "second", revision: 0 }, { kind: "parameter", id: "first", revision: 0 }]);
  assert.deepEqual(dataset.schema.fields.at(-1).lineage.inputs, [{ data: "source", field: "x" }]);
  assert.deepEqual(program.materializationConfigs.calculations.datasets.computed.parameterInputs, dataset.transform[0].parameterInputs);
  assert.deepEqual(inspectExpressionV2(expression(tree)).parameters, ["second", "first"]);
  tree.then.left.id = "first";
  assert.equal(dataset.transform[0].expression.root.then.left.id, "second");
});

test("computed v2 distinguishes literal dotted names and optional nested field paths", () => {
  const source = chart().createData({ id: "source", values: [{ "a.b": 9, a: { b: 4 } }, { "a.b": 3 }] });
  const dotted = source.createComputedData({ id: "dotted", as: "v", expression: expression(field("a.b")) });
  const nested = source.createComputedData({ id: "nested", as: "v", expression: expression({ type: "fieldPath", root: "a", path: ["b"] }) });
  assert.deepEqual(dotted.semanticSpec.datasets.at(-1).values.map(row => row.v), [9, 3]);
  assert.deepEqual(nested.semanticSpec.datasets.at(-1).values.map(row => row.v), [4, undefined]);
  assert.deepEqual(nested.semanticSpec.datasets.at(-1).schema.fields.at(-1).lineage.inputs, [{ data: "source", field: "a" }]);
});

test("computed v2 preflights inactive references and typed fields on empty data", () => {
  const source = chart().createData({ id: "source", values: [], schema: { fields: [{ name: "x", storageType: "string" }] } });
  const snapshot = JSON.stringify(source);
  assert.throws(() => source.createComputedData({ id: "collision", as: "x", expression: expression(literal(1)) }), /already exists/);
  for (const root of [
    { type: "if", condition: literal(true), then: literal(1), else: field("missing") },
    { type: "if", condition: literal(true), then: literal(1), else: parameter("missing") },
    binary("add", field("x"), literal(1))
  ]) assert.throws(() => source.createComputedData({ id: "bad", as: "value", expression: expression(root) }));
  assert.equal(JSON.stringify(source), snapshot);
  const valid = source.createComputedData({ id: "empty", as: "value", expression: expression(literal(false)) });
  assert.deepEqual(valid.semanticSpec.datasets.at(-1).values, []);
  assert.equal(valid.materializationConfigs.calculations.datasets.empty.evaluatedRows, 0);
});

test("computed v2 rejects malformed stored vectors and stale references without evaluation", () => {
  const source = withParameter(chart().createData({ id: "source", values: [{ x: 1 }] }), "p", 2);
  const program = source.createComputedData({ id: "computed", as: "value", expression: expression(parameter("p")) });
  const transform = program.semanticSpec.datasets.at(-1).transform[0];
  for (const parameterInputs of [undefined, [], [transform.parameterInputs[0], transform.parameterInputs[0]], [{ kind: "parameter", id: "p", revision: -1 }], [{ kind: "parameter", id: "different", revision: 0 }], [{ kind: "data", id: "p", revision: 0 }]]) {
    assert.throws(() => validateComputedTransform({ ...transform, parameterInputs }));
  }
  const stale = { ...transform, parameterInputs: [{ kind: "parameter", id: "p", revision: 1 }] };
  assert.throws(() => resolveComputedEnvironment(program, source.semanticSpec.datasets[0], stale), /stale/);
  assert.throws(() => source.createDerivedData({ id: "forged", source: "source", transform: [transform] }), /does not accept parameterInputs/);
  assert.throws(() => source.createDerivedData({ id: "extra", source: "source", transform: [{ type: "computed", as: "v", expression: expression(literal(1)), extra: true }] }), /unknown properties/);
});

test("computed v2 structural validation never invokes AST or stored-reference accessors", () => {
  let calls = 0;
  const root = literal(1);
  Object.defineProperty(root, "value", { enumerable: true, get() { calls++; return 1; } });
  assert.throws(() => normalizeComputedTransform({ as: "v", expression: expression(root) }), /own data/);
  const reference = { kind: "parameter", id: "p" };
  Object.defineProperty(reference, "revision", { enumerable: true, get() { calls++; return 0; } });
  assert.throws(() => validateComputedTransform({ type: "computed", as: "v", expression: expression(parameter("p")), parameterInputs: [reference] }), /own data/);
  assert.equal(calls, 0);
});

test("computed v2 edits and source revisions preserve explicit replay bindings", () => {
  const source = withParameter(chart().createData({ id: "source", values: [{ x: 2 }, { x: 4 }] }), "p", 3);
  const program = source.createComputedData({ id: "computed", as: "value", expression: expression(binary("multiply", field("x"), parameter("p"))) });
  const changed = program.editComputedData({ target: "computed", expression: expression(binary("add", field("x"), parameter("p"))) });
  const first = changed.semanticSpec.datasets.find(dataset => dataset.id === changed.materializationConfigs.data.computed.computed.current);
  assert.deepEqual(first.values.map(row => row.value), [5, 7]);
  assert.deepEqual(first.transform[0].parameterInputs, [{ kind: "parameter", id: "p", revision: 0 }]);
  assert.deepEqual(program.semanticSpec.datasets.at(-1).values.map(row => row.value), [6, 12]);
  const revised = changed.reviseData({ source: "source", id: "updated", values: [{ x: 8 }] });
  const current = revised.semanticSpec.datasets.find(dataset => dataset.id === revised.materializationConfigs.data.computed.computed.current);
  assert.deepEqual(current.values.map(row => row.value), [11]);
  assert.deepEqual(current.transform[0].parameterInputs, [{ kind: "parameter", id: "p", revision: 0 }]);
  const migrated = revised.editComputedData({ target: "computed", expression: { constant: false } });
  const legacy = migrated.semanticSpec.datasets.find(dataset => dataset.id === migrated.materializationConfigs.data.computed.computed.current);
  assert.deepEqual(legacy.values.map(row => row.value), [false]);
  assert.equal(Object.hasOwn(legacy.transform[0], "parameterInputs"), false);
});
