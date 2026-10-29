import test from "node:test";
import assert from "node:assert/strict";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { normalizeSelectionSelector, selectExpressionItemKeys, validateSelectionExpression } from "../../../src/grammar/selectionExpression.js";

const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const items = rows => rows.map((fields, index) => ({ key: String(index), fields, channels: {}, properties: {} }));
const selected = (rows, root, parameters) => selectExpressionItemKeys(items(rows), { where: expression(root) }, parameters);

test("selection expressions use explicit final-item fields with independent boolean and missing literals", () => {
  assert.deepEqual(selected([{ x: 1 }, { x: 2 }, { x: 3 }], binary("gt", field("x"), literal(1))), ["1", "2"]);
  assert.deepEqual(selected([{ x: "a" }, { x: "b" }, { x: "c" }], binary("lt", field("x"), literal("c"))), ["0", "1"]);
  const guard = { type: "if", condition: { type: "call", name: "isMissing", args: [field("x")] }, then: literal(false), else: binary("gt", field("x"), parameter("low")) };
  assert.deepEqual(selected([{}, { x: 2 }, { x: 4 }], guard, { low: { type: "number", value: 2 } }), ["2"]);
  assert.deepEqual(selectExpressionItemKeys(items([{ x: 1 }]), { field: "x", op: "eq", value: 1 }), ["0"]);
});

test("all branches and referenced parameter types are checked even for empty selections", () => {
  const root = { type: "if", condition: literal(true), then: literal(true), else: binary("gt", field("x"), parameter("low")) };
  assert.deepEqual(selected([], root, { low: { type: "number", value: 2 } }), []);
  assert.throws(() => selected([], root), /parameter/i);
  assert.throws(() => selected([{ x: 1 }], root, { low: { type: "string", value: "2" } }));
  assert.throws(() => selected([{ y: 1 }], root, { low: { type: "number", value: 2 } }), /not uniquely defined/);
  assert.throws(() => selected([], literal(2)), /boolean/);
  const inspected = validateSelectionExpression(expression(root), { low: { type: "number", value: 2 } });
  assert.deepEqual(inspected.parameters, ["low"]);
});

test("expression selection owns its AST snapshot and rejects mixed selector modes and malformed item identities", () => {
  const input = { where: expression(binary("eq", field("x"), literal(1))) };
  const normalized = normalizeSelectionSelector(input);
  input.where.root.right.value = 3;
  assert.equal(normalized.where.root.right.value, 1);
  assert.equal(Object.isFrozen(normalized.where.root), true);
  for (const bad of [null, [], { where: normalized.where, field: "x" }, { where: normalized.where, rows: { data: "d", indices: [] } }, { where: normalized.where, grain: "series" }]) assert.throws(() => normalizeSelectionSelector(bad));
  for (const bad of [[{ key: "", fields: {} }], [{ key: "x", fields: {} }, { key: "x", fields: {} }], [{ key: "x", fields: null }], [undefined], Array(1)]) {
    assert.throws(() => selectExpressionItemKeys(bad, { where: expression(literal(true)) }));
  }
});

test("selection expression rejects accessors without execution and charges work before copying rows", () => {
  let reads = 0;
  const accessor = { get x() { reads++; return 1; } };
  assert.throws(() => selected([accessor], binary("eq", field("x"), literal(1))), /own data/);
  const root = expression(binary("eq", field("x"), literal(1)));
  assert.throws(() => normalizeSelectionSelector({ get where() { reads++; return root; } }), /accessors/);
  Object.defineProperty(Object.prototype, "where", { configurable: true, get() { reads++; throw new Error("inherited access"); } });
  try { assert.deepEqual(normalizeSelectionSelector({ items: [] }).items, []); }
  finally { delete Object.prototype.where; }
  let tree = literal(true);
  for (let i = 0; i < 11; i++) tree = binary("and", tree, tree);
  const large = Array(3000).fill({ key: "ignored", fields: accessor });
  assert.throws(() => selectExpressionItemKeys(large, { where: expression(tree) }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.equal(reads, 0);
});
