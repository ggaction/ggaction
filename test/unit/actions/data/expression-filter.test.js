import { execFileSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
const field = name => ({ type: "field", name });
const parameter = id => ({ type: "parameter", id });
const literal = value => ({ type: "literal", value });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const expression = root => ({ version: 2, registry: "standard@1", root });
const predicate = expression(binary("gte", field("x"), parameter("cutoff")));
const get = (program, id) => program.semanticSpec.datasets.find(item => item.id === id);
const current = (program, family, id) => get(program, program.materializationConfigs.data[family][id].current);
function base() { return chart().createCanvas({ width: 360, height: 280, margin: 60 }).createData({ id: "raw", values: [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }, { id: "c", x: 3, y: 8 }], keyField: "id" }).createParameter({ id: "cutoff", value: 2 }); }
function filtered() { return base().filterData({ id: "selected", where: predicate }); }

test("parameter filters retain row order, identity, schema and exact input revisions", () => {
  const original = filtered(), saved = serializeProgram(original);
  assert.deepEqual(get(original, "selected").values.map(row => row.id), ["b", "c"]);
  const changed = original.editParameter({ target: "cutoff", value: 3 });
  const output = current(changed, "filter", "selected");
  assert.deepEqual(output.values, [{ id: "c", x: 3, y: 8 }]);
  assert.deepEqual(output.rowKeys, get(original, "selected").rowKeys.slice(1));
  assert.equal(output.logicalId, get(original, "selected").logicalId);
  assert.deepEqual(output.transform[0].parameterInputs, [{ kind: "parameter", id: "cutoff", revision: 1 }]);
  assert.deepEqual(output.schema.fields, get(original, "selected").schema.fields);
  assert.equal(serializeProgram(original), saved);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(changed))), serializeProgram(changed));
});

test("parameter filter closure rematerializes summaries, scales, guides and marks", () => {
  const original = filtered().createSummaryData({ id: "totals", source: "selected", groupBy: ["id"], aggregates: [{ op: "sum", field: "y", as: "total" }] }).createBarPlot({ id: "bars", data: "totals", x: "id", y: "total" });
  const changed = original.editParameter({ target: "cutoff", value: 3 });
  assert.deepEqual(current(changed, "summary", "totals").values, [{ id: "c", total: 8 }]);
  assert.equal(changed.graphicSpec.objects.bars.items.length, 1);
  assert.deepEqual(changed.resolvedScales.x.domain, ["c"]);
  assert.notDeepEqual(changed.graphicSpec, original.graphicSpec);
});

test("empty inferred domains fail atomically and explicit policies govern empty materialization", () => {
  const plain = filtered().createScatterPlot({ id: "points", x: "x", y: "y" });
  const saved = serializeProgram(plain);
  assert.throws(() => plain.editParameter({ target: "cutoff", value: 100 }), /domain/i);
  assert.equal(serializeProgram(plain), saved);
  for (const scale of [{ emptyDomain: "preserve" }, { domain: [0, 10] }]) {
    const original = filtered().createScatterPlot({ id: "points", x: { field: "x", scale }, y: { field: "y", scale } });
    const empty = original.editParameter({ target: "cutoff", value: 100 });
    assert.deepEqual(current(empty, "filter", "selected").values, []);
    assert.equal(empty.graphicSpec.objects.points.items.length, 0);
    assert.deepEqual(empty.resolvedScales.x.domain, original.resolvedScales.x.domain);
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(empty)));
    assert.equal(empty.editParameter({ target: "cutoff", value: 2 }).graphicSpec.objects.points.items.length, 2);
  }
});

test("all predicate branches validate even for empty input and inactive parameter references stay live", () => {
  const original = base();
  for (const root of [literal(0), binary("and", literal(false), field("absent")), binary("or", literal(true), parameter("absent"))]) assert.throws(() => original.filterData({ id: "bad", where: expression(root) }));
  const fixed = original.filterData({ id: "fixed", where: expression(binary("or", literal(true), binary("gt", parameter("cutoff"), literal(0)))) });
  assert.throws(() => fixed.removeParameter({ id: "cutoff" }), /referenced/);
  const changed = fixed.editParameter({ target: "cutoff", value: -1 });
  assert.deepEqual(current(changed, "filter", "fixed").values, get(fixed, "fixed").values);
  assert.equal(current(changed, "filter", "fixed").transform[0].parameterInputs[0].revision, 1);
});

test("filter edits switch between expression and legacy modes and release detached dependencies", () => {
  const original = filtered();
  const all = original.editFilteredData({ target: "selected", where: expression(literal(true)) });
  assert.equal(current(all, "filter", "selected").values.length, 3);
  assert.doesNotThrow(() => all.removeParameter({ id: "cutoff" }));
  const legacy = original.editFilteredData({ target: "selected", field: "id", oneOf: ["a"] });
  assert.deepEqual(current(legacy, "filter", "selected").values.map(row => row.id), ["a"]);
  assert.deepEqual(current(legacy.editFilteredData({ target: "selected", where: predicate }), "filter", "selected").values.map(row => row.id), ["b", "c"]);
  for (const patch of [{ where: predicate, field: "x" }, { where: predicate, nulls: "include" }, { where: predicate, range: { min: 0 } }, { nulls: "include" }]) assert.throws(() => original.editFilteredData({ target: "selected", ...patch }));
});

test("authoring cannot forge exact references and restore rejects malformed or stale filter bindings", () => {
  const original = filtered();
  assert.throws(() => base().createDerivedData({ id: "bad", source: "raw", transform: [{ type: "filter", where: predicate, parameterInputs: [] }] }), /authoring/);
  const payload = JSON.parse(serializeProgram(original));
  // Mutations target the decoded semantic tree and are re-encoded with the codec.
  const state = decodeValue(payload.payload);
  const dataset = state.semanticSpec.datasets.find(item => item.id === "selected");
  dataset.transform[0].parameterInputs[0].revision = 99;
  payload.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(payload)), /stale|revision/);
});

test("shared parameter roots form one filter/computed lookup diamond and raw revisions replay predicates", () => {
  const original = filtered()
    .createComputedData({ id: "weights", source: "raw", as: "scaled", expression: expression(binary("multiply", field("y"), parameter("cutoff"))) })
    .createLookupData({ id: "joined", source: "selected", field: "id", lookup: { data: "weights", key: "id", fields: ["scaled"] } });
  const revised = original.editParameter({ target: "cutoff", value: 3 });
  assert.deepEqual(current(revised, "lookup", "joined").values.map(row => [row.id, row.scaled]), [["c", 24]]);
  const operations = node => [node.op, ...(node.children ?? []).flatMap(operations)];
  const ops = operations(revised.trace.children.at(-1));
  assert.equal(ops.filter(op => op === "materializeFilteredData").length, 1);
  assert.equal(ops.filter(op => op === "materializeComputedData").length, 1);
  assert.equal(ops.filter(op => op === "materializeLookupData").length, 1);
  const replaced = revised.reviseData({ source: "raw", id: "next", values: [{ id: "d", x: 4, y: 10 }] });
  assert.deepEqual(current(replaced, "lookup", "joined").values.map(row => [row.id, row.scaled]), [["d", 30]]);
});

test("nullable predicates reject candidate edits atomically and zero-rows still validate references", () => {
  const original = chart().createData({ values: [{ x: 1 }] }).createParameter({ id: "keep", value: true, nullable: true })
    .filterData({ id: "selected", where: expression(parameter("keep")) });
  const saved = serializeProgram(original), trace = original.trace;
  assert.throws(() => original.editParameter({ target: "keep", value: null }), /boolean/);
  assert.equal(serializeProgram(original), saved); assert.equal(original.trace, trace);
  const empty = chart().createData({ values: [], schema: { fields: [{ name: "x", storageType: "number" }] } });
  assert.throws(() => empty.filterData({ id: "bad", where: expression(binary("or", literal(true), parameter("missing"))) }));
});


test("a fresh process restores a parameter filter and revises it without evaluating during restoration", () => {
  const url = new URL("../../../../src/persistence.js", import.meta.url).href;
  const code = `import { deserializeProgram, serializeProgram } from ${JSON.stringify(url)};
import { readFileSync } from "node:fs";
const original = deserializeProgram(readFileSync(0, "utf8"));
const revised = original.editParameter({ target: "cutoff", value: 3 });
process.stdout.write(serializeProgram(revised));`;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", code], { input: serializeProgram(filtered()), encoding: "utf8" });
  const restored = deserializeProgram(output);
  assert.deepEqual(current(restored, "filter", "selected").values.map(row => row.id), ["c"]);
});
