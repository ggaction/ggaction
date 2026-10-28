import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/diagnostics.js";
import { action } from "../../../../src/extension.js";

const rows = [{ group: "A", key: "x", value: 1 }, { group: "A", key: "x", value: 2 },
  { group: "A", key: "y", value: null }, { group: "B", key: "y", value: 4 }];
const data = (p, id) => p.semanticSpec.datasets.find(d => d.id === id);
const current = (p, id, family = "pivot") => data(p, p.materializationConfigs.data[family][id].current);
const pivot = () => chart().createData({ id: "raw", values: rows })
  .createPivotData({ id: "wide", groupBy: "group", field: "key", value: "value", op: "sum" });

test("shortest pivot preserves a single cell and typed keys keep separate output roles", () => {
  const simple = chart().createData({ values: [{ key: "amount", value: 2 }] })
    .createPivotData({ id: "wide", field: "key", value: "value" });
  assert.deepEqual(data(simple, "wide").values, [{ amount: 2 }]);
  const p = chart().createData({ values: [{ key: 1, value: 2 }, { key: "1", value: 3 }, { key: null, value: null }] })
    .createPivotData({ id: "wide", field: "key", value: "value", columns: [
      { value: 1, as: "numeric" }, { value: "1", as: "string" }, { value: null, as: "missing" }
    ], fill: 0 });
  assert.deepEqual(data(p, "wide").values, [{ numeric: 2, string: 3, missing: null }]);
  assert.deepEqual(data(p, "wide").schema.fields.map(f => f.lineage.role), ["column:number:1", "column:string:1:1", "column:null"]);
});

test("pivot infers columns once and exposes explicit create/materialize trace with exact lineage", () => {
  const source = chart().createData({ id: "raw", values: rows }), before = serializeProgram(source);
  const p = source.createPivotData({ id: "wide", groupBy: "group", field: "key", value: "value", op: "sum" });
  const result = data(p, "wide");
  assert.deepEqual(result.values, [{ group: "A", x: 3, y: 0 }, { group: "B", x: null, y: 4 }]);
  assert.deepEqual(result.transform, [{ type: "pivot", field: "key", value: "value", groupBy: ["group"],
    columns: [{ value: "x", as: "x" }, { value: "y", as: "y" }], op: "sum", fill: null }]);
  assert.deepEqual(p.trace.children.at(-1).children.map(n => n.op), ["createDerivedData", "materializePivotData"]);
  assert.deepEqual(result.lineage.rowRefs.map(i => result.lineage.entries[i].map(r => data(p, "raw").rowKeys.indexOf(r.rowKey))), [[0, 1, 2], [3]]);
  assert.deepEqual(result.schema.fields.find(f => f.name === "x").lineage, {
    inputs: ["group", "key", "value"].map(field => ({ data: "raw", field })), owner: "wide", role: "column:string:1:x"
  });
  assert.equal(serializeProgram(source), before);
  assert.deepEqual(rows, data(p, "raw").values);
});

test("pivot count, empty schema and observed null preserve distinct semantics", () => {
  const empty = chart().createData({ id: "empty", values: [], schema: { fields: [
    { name: "group", storageType: "string" }, { name: "key", storageType: "string" }, { name: "value", storageType: "number" }
  ] } }).createPivotData({ id: "wide", groupBy: "group", field: "key", value: "value", columns: [{ value: "x", as: "amount" }] });
  assert.deepEqual(data(empty, "wide").values, []);
  assert.deepEqual(data(empty, "wide").schema.fields.map(f => [f.name, f.storageType, f.nullable]), [["group", "string", false], ["amount", "number", true]]);
  const counted = pivot().editPivotData({ target: "wide", op: "count", fill: 0 });
  assert.deepEqual(current(counted, "wide").values, [{ group: "A", x: 2, y: 1 }, { group: "B", x: 0, y: 1 }]);
  assert.equal(Object.hasOwn(current(counted, "wide").transform[0], "value"), false);
  assert.deepEqual(current(counted, "wide").schema.fields.at(-1).lineage.inputs.map(r => r.field), ["group", "key"]);
  assert.throws(() => counted.editPivotData({ target: "wide", op: "mean" }), /value field/);
  const mean = counted.editPivotData({ target: "wide", op: "mean", value: "value" });
  assert.deepEqual(current(mean, "wide").values, [{ group: "A", x: 1.5, y: null }, { group: "B", x: 0, y: 4 }]);
  assert.equal(current(mean, "wide").schema.fields.at(-1).storageType, "number");
});

test("pivot validates public and generic options atomically, including explicit source and duplicates", () => {
  const source = chart().createData({ id: "raw", values: rows }), before = serializeProgram(source);
  assert.throws(() => source.createPivotData(), /id/);
  for (const patch of [{}, { op: "none" }, { op: "count", value: "value" }, { op: "sum", field: "absent" },
    { op: "sum", extra: true }, { op: "sum", id: "raw" }, { op: "sum", fill: Infinity }]) {
    assert.throws(() => source.createPivotData({ id: "wide", field: "key", value: "value", groupBy: "group", ...patch }));
    assert.equal(serializeProgram(source), before);
  }
  const p = source.createData({ id: "other", values: [{ other: true }] }).createPivotData({
    id: "wide", source: "raw", field: "key", value: "value", groupBy: "group", op: "sum"
  });
  assert.equal(data(p, "wide").source, "raw");
  const definition = data(p, "wide").transform[0];
  const generic = source.createDerivedData({ id: "generic", source: "raw", transform: [definition] }).materializePivotData({ id: "generic" });
  assert.deepEqual(data(generic, "generic").values, data(p, "wide").values);
  assert.throws(() => generic.materializePivotData({ id: "generic" }), /already materialized/);
  assert.throws(() => source.createDerivedData({ id: "bad", source: "raw", transform: [{ ...definition, columns: undefined }] }), /array/);
  assert.throws(() => source.createPivotData({ id: "bad", field: "absent", op: "count", columns: [{ value: "x", as: "x" }] }),
    error => getErrorDetails(error).code === "missing-resource");
});

test("nested pivot creation leaves ownership to its aggregate caller", () => {
  const create = action({ op: "createPivotLayer", description: "Create a pivot inside a caller-owned aggregate." }, function() {
    return this.createPivotData({ id: "wide", field: "key", groupBy: "group", value: "value", op: "sum" });
  });
  const p = create.call(chart().createData({ id: "raw", values: rows }));
  assert.deepEqual(data(p, "wide").values, [{ group: "A", x: 3, y: 0 }, { group: "B", x: null, y: 4 }]);
  assert.equal(p.materializationConfigs.data?.pivot, undefined);
});

test("pivot is Full-only and Basic rejects even a valid generic transform", () => {
  const p = basicChart().createData({ id: "raw", values: rows }), before = JSON.stringify(p);
  assert.equal(p.createPivotData, undefined);
  assert.equal(p.editPivotData, undefined);
  assert.equal(p.materializePivotData, undefined);
  assert.throws(() => p.createDerivedData({ id: "wide", source: "raw", transform: data(pivot(), "wide").transform }), /Unsupported dataset transform "pivot"/);
  assert.equal(JSON.stringify(p), before);
});

test("pivot source revision keeps columns and logical identity and rejects new categories atomically", () => {
  const p = pivot(), before = serializeProgram(p), old = data(p, "wide");
  const revised = p.reviseData({ source: "raw", id: "next", values: rows.map(r => ({ ...r, value: r.value === null ? null : r.value * 2 })) });
  const result = current(revised, "wide");
  assert.deepEqual(result.values, [{ group: "A", x: 6, y: 0 }, { group: "B", x: null, y: 8 }]);
  assert.deepEqual(result.transform, old.transform);
  assert.equal(result.logicalId, old.logicalId);
  assert.equal(result.revision, old.revision + 1);
  assert.deepEqual(result.rowKeys, old.rowKeys);
  assert.throws(() => p.reviseData({ source: "raw", id: "next", values: [...rows, { group: "C", key: "z", value: 1 }] }), /outside the declared/);
  assert.throws(() => p.removeData({ id: "raw" }), /referenc|depend|use/);
  assert.equal(serializeProgram(p), before);
});

test("pivot aliases follow typed column roles through encodings and reject removed consumers", () => {
  const p = pivot().createCanvas().createPointMark({ id: "points", data: "wide" })
    .encodeX({ target: "points", field: "group", fieldType: "nominal" }).encodeY({ target: "points", field: "y" })
    .selectMarks({ id: "largest", target: "points", field: "y", op: "max" })
    .highlightMarks({ selection: "largest", target: "points", fill: "#ff0000" });
  const changed = p.editPivotData({ target: "wide", columns: [{ value: "x", as: "first" }, { value: "y", as: "second" }] });
  assert.equal(changed.semanticSpec.layers[0].encoding.y.field, "second");
  assert.deepEqual(current(changed, "wide").values, [{ group: "A", first: 3, second: 0 }, { group: "B", first: null, second: 4 }]);
  assert.equal(changed.graphicSpec.objects.points.items[1].properties.fill, "#ff0000");
  assert.throws(() => p.editPivotData({ target: "wide", columns: [{ value: "x", as: "first" }] }), /outside the declared|Cannot remove referenced/);
  assert.equal(p.semanticSpec.layers[0].encoding.y.field, "y");
  const absent = chart().createCanvas().createData({ values: [{ group: "A", key: "x", value: 1 }] })
    .createPivotData({ id: "wide", field: "key", value: "value", groupBy: "group", fill: 0,
      columns: [{ value: "x", as: "x" }, { value: "absent", as: "empty" }] })
    .createPointMark({ id: "points" }).encodeX({ field: "group", fieldType: "nominal" }).encodeY({ field: "empty" });
  assert.throws(() => absent.editPivotData({ target: "wide", columns: [{ value: "x", as: "x" }] }), /Cannot remove referenced/);
});

test("pivot edit requires dependent recomputation and lookup diamonds materialize once in order", () => {
  const p = pivot().createComputedData({ id: "left", source: "raw", as: "copy", expression: { field: "value" } })
    .createLookupData({ id: "joined", field: "group", lookup: { data: "wide", key: "group", fields: ["y"], as: ["total"] } });
  assert.throws(() => p.editPivotData({ target: "wide", op: "count" }), /recompute/);
  const edited = p.editPivotData({ target: "wide", op: "count", dependents: "recompute" });
  assert.deepEqual(current(edited, "joined", "lookup").values.map(r => r.total), [1, 1, 1, 1]);
  const next = p.reviseData({ source: "raw", id: "newRaw", values: rows.map(r => ({ ...r, value: r.value === null ? null : r.value + 1 })) });
  assert.deepEqual(current(next, "joined", "lookup").values.map(r => r.total), [0, 0, 0, 5]);
  const calls = [];
  const visit = node => { if (node.op.startsWith("materialize")) calls.push(node.op); node.children.forEach(visit); };
  visit(next.trace.children.at(-1));
  assert.equal(calls.filter(op => op === "materializePivotData").length, 1);
  assert.equal(calls.filter(op => op === "materializeLookupData").length, 1);
  assert.ok(calls.indexOf("materializePivotData") < calls.indexOf("materializeLookupData"));
});

test("pivot persists validated columns and remains editable after restoration", () => {
  const p = pivot(), restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.semanticSpec, p.semanticSpec);
  assert.deepEqual(current(restored.editPivotData({ target: "wide", op: "max" }), "wide").values,
    [{ group: "A", x: 2, y: null }, { group: "B", x: null, y: 4 }]);
  for (const mutate of [d => d.transform[0].columns.push({ value: "x", as: "duplicate" }),
    d => d.transform[0].value = "missing", d => d.schema.fields.at(-1).lineage.inputs.pop(),
    d => d.lineage.entries[0][0].revision++]) {
    const semanticSpec = structuredClone(p.semanticSpec); mutate(semanticSpec.datasets.find(d => d.id === "wide"));
    assert.throws(() => serializeProgram(p._clone({ semanticSpec })));
  }
});
