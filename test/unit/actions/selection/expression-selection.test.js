import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chart, hconcat } from "../../../../src/index.js";
import { getMarkItems } from "../../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";
import { registerSelectionExpressionResolver, validateSelectionExpressionConsumers } from "../../../../src/materialization/selection/expression.js";

const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const literal = value => ({ type: "literal", value });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const threshold = expression(binary("gte", field("x"), parameter("threshold")));
const rows = [{ id: "a", x: 1, y: 1, group: "A" }, { id: "b", x: 2, y: 2, group: "A" }, { id: "c", x: 3, y: 3, group: "B" }];
const base = () => chart().createCanvas({ margin: 40 }).createData({ id: "rows", values: rows, keyField: "id" })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false }).createParameter({ id: "threshold", value: 2 });
const state = (p, id = "picked") => p.semanticSpec.resources.find(r => r.kind === "persistent-selection" && r.id === id);
const ids = (p, id = "picked") => { const resolved = resolveStoredSelection(p, id); const keys = new Set(resolved.keys); return resolved.items.filter(item => keys.has(item.key)).map(item => item.fields.id); };

test("parameter-backed selection revisions refresh highlights, named labels, conditionals and immutable state", () => {
  const p = base().selectMarks({ id: "picked", where: threshold })
    .highlightMarks({ selection: "picked", color: "red", bringToFront: false })
    .createMarkLabels({ id: "labels", source: "points", field: "id", selection: "picked" })
    .encodeOpacity({ target: "points", conditions: [{ when: { selection: "picked" }, value: { value: 0.4 } }], otherwise: { value: 1 } });
  const before = serializeProgram(p);
  assert.deepEqual(ids(p), ["b", "c"]);
  assert.deepEqual(state(p).inputs, [{ kind: "parameter", id: "threshold", revision: 0 }]);
  const q = p.editParameter({ target: "threshold", value: 3 });
  assert.deepEqual(ids(q), ["c"]);
  assert.equal(state(q).revision, 1);
  assert.deepEqual(state(q).inputs, [{ kind: "parameter", id: "threshold", revision: 1 }]);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => [item.fields.id, item.properties.fill, item.properties.opacity]), [["a", "#4c78a8", 1], ["b", "#4c78a8", 1], ["c", "red", 0.4]]);
  assert.deepEqual(getMarkItems(q, { target: "labels" }).map(item => item.fields.id), ["c"]);
  assert.deepEqual(ids(deserializeProgram(serializeProgram(q)).editParameter({ target: "threshold", value: 1 })), ["a", "b", "c"]);
  assert.equal(serializeProgram(p), before);
  assert.throws(() => p.removeParameter({ id: "threshold" }), /referenced/);
});

test("selection input order includes inactive branches and set updates intentionally snapshot resolved keys", () => {
  const where = expression({ type: "if", condition: literal(true), then: binary("gte", field("x"), parameter("high")), else: binary("and", binary("gt", field("x"), parameter("threshold")), binary("lt", field("x"), parameter("high"))) });
  const p = base().createParameter({ id: "high", value: 3 }).selectMarks({ id: "picked", where });
  assert.deepEqual(state(p).inputs.map(r => r.id), ["high", "threshold"]);
  const q = p.editParameter({ target: "threshold", value: 8 });
  assert.deepEqual(ids(q), ["c"]); assert.equal(state(q).revision, 1);
  const fixed = q.editMarkSelection({ selection: "picked", mode: "add", where: expression(binary("eq", field("x"), literal(1))) });
  assert.equal(state(fixed).options.mode, "item-keys"); assert.deepEqual(state(fixed).inputs, []);
  assert.deepEqual(ids(fixed.editParameter({ target: "high", value: 1 })), ["a", "c"]);
  assert.deepEqual(ids(fixed.editMarkSelection({ selection: "picked", where: threshold })), []);
});

test("expression fields are final-item values rather than any contributing row of an aggregate", () => {
  const p = chart().createCanvas().createData({ id: "rows", values: [...rows, { id: "d", x: 4, y: 4, group: "B" }] })
    .createParameter({ id: "threshold", value: 2 }).createBarPlot({ id: "bars", data: "rows", x: "group", y: { field: "y", aggregate: "sum" }, guides: false });
  assert.throws(() => p.selectMarks({ target: "bars", where: threshold }), /not uniquely defined/);
  const q = p.selectMarks({ id: "picked", target: "bars", where: expression(binary("eq", field("group"), literal("A"))) });
  assert.equal(resolveStoredSelection(q, "picked").keys.length, 1);
  assert.deepEqual(resolveStoredSelection(q, "picked").items.find(i => i.fields.group === "A").rows.map(r => r.index), [0, 1]);
});

test("inactive invalid branches, undeclared inline AST and parameter type errors reject atomically", () => {
  const p = base(), before = serializeProgram(p);
  for (const bad of [expression(literal(1)), expression(binary("gt", field("absent"), literal(1))), expression({ type: "if", condition: literal(true), then: literal(true), else: binary("gt", field("x"), parameter("missing")) })]) {
    assert.throws(() => p.selectMarks({ id: "bad", where: bad })); assert.equal(serializeProgram(p), before);
  }
  assert.throws(() => p.selectMarks({ where: threshold, field: "x", op: "eq", value: 1 }));
  assert.throws(() => p.filterMarks({ where: threshold }));
  assert.throws(() => p.createMarkLabels({ id: "labels", source: "points", field: "id", select: { where: threshold } }));
  const wrong = p.createParameter({ id: "word", value: "2" });
  assert.throws(() => wrong.selectMarks({ where: expression(binary("gte", field("x"), parameter("word"))) }));
});

test("expression selections retain parameter closure through explicit child scope and facet replacement", () => {
  const p = base().selectMarks({ id: "picked", where: threshold }).highlightMarks({ selection: "picked", color: "red", bringToFront: false });
  const composite = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const edited = composite.editParameter({ target: { childPath: ["left"], id: "threshold" }, value: 3 });
  assert.deepEqual(ids(edited.children.left), ["c"]); assert.equal(edited.children.right, p);
  const facet = p.facet({ id: "panels", field: "group" }).editParameter({ target: "threshold", value: 3 });
  assert.deepEqual(Object.values(facet.children).flatMap(child => ids(child)).sort(), ["c"]);
  assert.deepEqual(Object.values(deserializeProgram(serializeProgram(facet)).children).flatMap(child => ids(child)).sort(), ["c"]);
});

test("fresh process restore uses exact expression resource inputs and rejects tampered bindings", () => {
  const p = base().selectMarks({ id: "picked", where: threshold }), saved = serializeProgram(p);
  const script = `import {deserializeProgram} from './src/persistence.js'; import {resolveStoredSelection} from './src/materialization/selection/state.js'; const p=deserializeProgram(${JSON.stringify(saved)}).editParameter({target:'threshold',value:3}); console.log(resolveStoredSelection(p,'picked').keys.length);`;
  assert.equal(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }).trim(), "1");
  const snapshot = JSON.parse(saved);
  for (const mutate of [r => r.inputs = [], r => r.inputs[0].revision++, r => r.options.predicate.where.root.right.id = "unknown"]) {
    const changed = structuredClone(snapshot);
    const value = decodeValue(changed.payload);
    mutate(value.semanticSpec.resources.find(r => r.kind === "persistent-selection"));
    changed.payload = encodeValue(value);
    assert.throws(() => deserializeProgram(JSON.stringify(changed)));
  }
});

test("parameter edits validate unconsumed predicates and reject evaluation errors before returning a new program", () => {
  const p = base().createParameter({ id: "enabled", value: true, nullable: true })
    .selectMarks({ id: "picked", where: expression(parameter("enabled")) });
  const before = serializeProgram(p), trace = p.trace;
  assert.throws(() => p.editParameter({ target: "enabled", value: null }), /boolean/);
  assert.equal(serializeProgram(p), before); assert.equal(p.trace, trace);
  assert.deepEqual(ids(p.editParameter({ target: "enabled", value: false })), []);
});

test("one parameter revises computed fields and selections once before labels and conditional geometry", () => {
  const p = chart().createCanvas().createData({ id: "rows", values: rows, keyField: "id" })
    .createParameter({ id: "threshold", value: 2 })
    .createComputedData({ id: "shifted", source: "rows", as: "shiftedX", expression: expression(binary("subtract", field("x"), parameter("threshold"))) })
    .createScatterPlot({ id: "points", data: "shifted", x: "x", y: "shiftedX", guides: false })
    .selectMarks({ id: "picked", where: expression(binary("and", binary("gte", field("shiftedX"), literal(0)), binary("gte", field("x"), parameter("threshold")))) })
    .createMarkLabels({ id: "labels", source: "points", field: "id", selection: "picked" })
    .encodeOpacity({ target: "points", conditions: [{ when: { selection: "picked" }, value: { value: 0.5 } }], otherwise: { value: 1 } });
  const q = p.editParameter({ target: "threshold", value: 3 });
  assert.deepEqual(ids(q), ["c"]);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(i => [i.fields.shiftedX, i.properties.opacity]), [[-2, 1], [-1, 1], [0, 0.5]]);
  assert.deepEqual(getMarkItems(q, { target: "labels" }).map(i => i.fields.id), ["c"]);
  assert.equal(state(q).revision, 1);
  const ops = node => [node.op, ...(node.children ?? []).flatMap(ops)];
  assert.equal(ops(q.trace.children.at(-1)).filter(op => op === "materializeComputedData").length, 1);
});

test("inline highlight AST is stored as a named selection and unhighlighted edits preserve ordering", () => {
  const p = base().highlightMarks({ id: "picked", select: { where: threshold }, color: "red" });
  const q = p.editParameter({ target: "threshold", value: 3 });
  assert.deepEqual(ids(q), ["c"]);
  assert.deepEqual(getMarkItems(q, { target: "points" }).map(i => i.fields.id), ["a", "b", "c"]);
  assert.deepEqual(getMarkItems(q, { target: "points" }).filter(i => i.properties.fill === "red").map(i => i.fields.id), ["c"]);
});

test("selection parameter validation installs one class-specific resolver and never crosses a constructor boundary", () => {
  class Owner {}
  class Other {}
  const calls = [], p = { constructor: Owner, materializationConfigs: { selections: { picked: { resource: { id: "r" } }, unrelated: { resource: { id: "other" } } } } };
  for (const args of [[null, () => {}], [() => {}, () => {}], [Owner, null]]) assert.throws(() => registerSelectionExpressionResolver(...args));
  registerSelectionExpressionResolver(Owner, (program, id) => calls.push([program, id]));
  assert.throws(() => registerSelectionExpressionResolver(Owner, () => {}), /already registered/);
  validateSelectionExpressionConsumers(p, ["r"]);
  assert.deepEqual(calls, [[p, "picked"]]);
  assert.throws(() => validateSelectionExpressionConsumers({ ...p, constructor: Other }, ["r"]), /Full selection owner/);
  validateSelectionExpressionConsumers({ constructor: Other, materializationConfigs: {} }, []);
});

test("removing an expression selection releases its parameter dependency and preserves another selection", () => {
  const p = base().selectMarks({ id: "picked", where: threshold })
    .selectMarks({ id: "all", where: expression(literal(true)) });
  const q = p.removeMarkSelection({ selection: "picked" }).removeParameter({ id: "threshold" });
  assert.equal(state(q), undefined);
  assert.deepEqual(ids(q, "all"), ["a", "b", "c"]);
  assert.deepEqual(ids(p), ["b", "c"]);
});
