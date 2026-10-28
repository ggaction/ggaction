import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { chart as basicChart, prepareDataUpdate as prepareBasic } from "../../../src/basic.js";
import { deserializeProgram, serializeGraphic, serializeProgram } from "../../../src/persistence.js";

const csv = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
const parameterURL = { version: 2, registry: "standard@1", root: {
  type: "call", name: "concat", args: [{ type: "literal", value: "https://example.test/" },
    { type: "parameter", id: "region" }, { type: "literal", value: ".csv" }]
} };

test("Full and Basic public preparation commit immutable rows with source-free restore", async () => {
  for (const [create, prepare] of [[chart, prepareDataUpdate], [basicChart, prepareBasic]]) {
    const before = create();
    const prepared = await prepare(before, { kind: "create", id: "rows", keyField: "id",
      source: { kind: "inline", values: [{ id: "a", x: -0 }, { id: "b", x: 3 }] } }, { requestToken: "rows" });
    const next = before.applyDataUpdate({ prepared, requestToken: "rows" });
    assert.equal(before.semanticSpec.datasets.length, 0);
    assert.equal(next.semanticSpec.datasets.length, 1);
    assert.equal(next.semanticSpec.resources[0].kind, "data-source");
    assert.equal(next.semanticSpec.datasets[0].sourceReceipt.provenance.hashKind, "encoded-rows");
    const restored = deserializeProgram(serializeProgram(next));
    assert.ok(Object.is(restored.semanticSpec.datasets[0].values[0].x, -0));
    assert.deepEqual(restored.semanticSpec.datasets[0].rowKeys, next.semanticSpec.datasets[0].rowKeys);
    const graphic = serializeGraphic(next);
    assert.equal(graphic.includes("sourceReceipt"), false);
    assert.equal(graphic.includes("requestToken"), false);
    assert.equal(next.trace.children[0].op, "applyDataUpdate");
    assert.ok(next.trace.children[0].children.some(child => child.op === "createData"));
  }
});

test("actual public data commits keep retained source text out of every trace level", async () => {
  for (const [create, prepare] of [[chart, prepareDataUpdate], [basicChart, prepareBasic]]) {
    const before = create(), sentinel = "source-value-".repeat(10_000);
    const prepared = await prepare(before, { kind: "create", id: "rows",
      source: { kind: "inline", format: "csv", text: `value\n${sentinel}` } }, { requestToken: "rows" });
    const next = before.applyDataUpdate({ prepared, requestToken: "rows" });
    assert.equal(next.semanticSpec.datasets[0].sourceReceipt.original.text, `value\n${sentinel}`);
    const trace = JSON.stringify(next.trace);
    assert.equal(trace.includes(sentinel), false);
    assert.ok(trace.length < 10_000, `Trace grew to ${trace.length} bytes for one source.`);
    assert.deepEqual(deserializeProgram(serializeProgram(next)).semanticSpec.datasets[0].values, next.semanticSpec.datasets[0].values);
  }
});

test("public parameter update preserves historic receipts and restores current URL bindings offline", async () => {
  let program = chart().createParameter({ id: "region", value: "north" });
  const create = await prepareDataUpdate(program, { kind: "create", id: "rows", keyField: "id",
    source: { kind: "url", format: "csv", url: parameterURL, parse: { x: { type: "number" } } } },
  { requestToken: "initial", load: async () => csv("id,x\na,2") });
  program = program.applyDataUpdate({ prepared: create, requestToken: "initial" });
  const previous = program, snapshot = serializeProgram(previous);
  const change = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "south", load: async ({ url }) => {
      assert.equal(url, "https://example.test/south.csv");
      return csv("id,x\na,7");
    }
  });
  program = program.applyDataUpdate({ prepared: change, requestToken: "south" });
  assert.equal(serializeProgram(previous), snapshot);
  const restored = deserializeProgram(serializeProgram(program));
  const binding = restored.semanticSpec.resources.find(resource => resource.kind === "data-source");
  assert.equal(binding.revision, 1);
  assert.deepEqual(binding.inputs, [{ kind: "parameter", id: "region", revision: 1 }]);
  const original = restored.semanticSpec.datasets.find(dataset => dataset.id === "rows");
  const current = restored.semanticSpec.datasets.find(dataset => dataset.id === binding.result.data.id);
  assert.equal(original.sourceReceipt.resolvedURL, "https://example.test/north.csv");
  assert.equal(current.sourceReceipt.resolvedURL, "https://example.test/south.csv");
  assert.equal(current.values[0].x, 7);
  assert.deepEqual(current.rowKeys, original.rowKeys);
  assert.throws(() => restored.applyDataUpdate({ prepared: change, requestToken: "south" }), /stale/);
});

test("public apply rejects copied handles, wrong receiver, wrong token and extra dispatch options atomically", async () => {
  const program = chart(), before = serializeProgram(program);
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows", source: { kind: "inline", values: [] } }, { requestToken: "active" });
  for (const args of [
    { prepared: JSON.parse(JSON.stringify(prepared)), requestToken: "active" },
    { prepared, requestToken: "old" }, { prepared, requestToken: "active", target: { child: "left" } }
  ]) assert.throws(() => program.applyDataUpdate(args));
  assert.throws(() => chart().applyDataUpdate({ prepared, requestToken: "active" }), /stale/);
  assert.equal(serializeProgram(program), before);
  assert.equal(program.applyDataUpdate({ prepared, requestToken: "active" }).semanticSpec.datasets.length, 1);
});

test("Basic rejects prepared edit requests even when the Full preparer built the handle", async () => {
  const program = basicChart().createParameter({ id: "region", value: "north" });
  await assert.rejects(prepareBasic(program, { kind: "parameter", target: "region", value: "south" }, { requestToken: "edit" }), /Basic/);
  const prepared = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" }, { requestToken: "edit" });
  assert.throws(() => program.applyDataUpdate({ prepared, requestToken: "edit" }), /Basic/);
  assert.equal(program.semanticSpec.resources[0].result.value, "north");
});

test("explicit named refresh preserves generated row mapping, binding identity and new schema", async () => {
  let program = chart();
  const initial = await prepareDataUpdate(program, { kind: "create", id: "rows",
    source: { kind: "named", name: "measurements", format: "csv", parse: { x: { type: "number" } } } },
  { requestToken: "initial", resolveNamed: async () => csv("id,x\na,1\nb,2") });
  program = program.applyDataUpdate({ prepared: initial, requestToken: "initial" });
  const old = program, oldData = old.semanticSpec.datasets[0], snapshot = serializeProgram(old);
  const refresh = await prepareDataUpdate(program, { kind: "revise", target: "rows", id: "fresh", rowMap: [1, null] }, {
    requestToken: "refresh", resolveNamed: async input => {
      assert.deepEqual(input, { name: "measurements" });
      return csv("id,x,extra\nb,20,new\nc,30,new");
    }
  });
  program = program.applyDataUpdate({ prepared: refresh, requestToken: "refresh" });
  const restored = deserializeProgram(serializeProgram(program));
  const fresh = restored.semanticSpec.datasets.find(dataset => dataset.id === "fresh");
  const binding = restored.semanticSpec.resources.find(resource => resource.kind === "data-source");
  assert.equal(binding.id, "rows");
  assert.equal(binding.revision, 1);
  assert.equal(binding.result.data.id, "fresh");
  assert.equal(fresh.rowKeys[0], oldData.rowKeys[1]);
  assert.equal(oldData.rowKeys.includes(fresh.rowKeys[1]), false);
  assert.ok(fresh.schema.fields.some(field => field.name === "extra"));
  assert.deepEqual(fresh.values, [{ id: "b", x: 20, extra: "new" }, { id: "c", x: 30, extra: "new" }]);
  assert.equal(serializeProgram(old), snapshot);
  assert.equal(program.trace.children.at(-1).children[0].op, "reviseData");
});

test("refresh row-map errors are atomic before and after the explicit host load", async () => {
  let program = chart();
  const initial = await prepareDataUpdate(program, { kind: "create", id: "rows", source: { kind: "named", name: "table", format: "csv" } },
    { requestToken: "initial", resolveNamed: async () => csv("x\n1\n2") });
  program = program.applyDataUpdate({ prepared: initial, requestToken: "initial" });
  const snapshot = serializeProgram(program);
  let calls = 0;
  const host = { requestToken: "refresh", resolveNamed: async () => { calls++; return csv("x\n3\n4"); } };
  await assert.rejects(prepareDataUpdate(program, { kind: "revise", target: "rows", id: "fresh", rowMap: [0, 0] }, host), /at most once/);
  assert.equal(calls, 0);
  await assert.rejects(prepareDataUpdate(program, { kind: "revise", target: "rows", id: "fresh", rowMap: [0] }, host), /dense array/);
  assert.equal(calls, 1);
  assert.equal(serializeProgram(program), snapshot);
});

test("URL parameters require preparation for changes while exact no-ops remain synchronous", async () => {
  let program = chart().createParameter({ id: "region", value: "north" });
  const initial = await prepareDataUpdate(program, { kind: "create", id: "rows",
    source: { kind: "url", url: parameterURL, format: "csv" } },
  { requestToken: "initial", load: async () => csv("x\n1") });
  program = program.applyDataUpdate({ prepared: initial, requestToken: "initial" });
  const snapshot = serializeProgram(program), semantic = program.semanticSpec;
  assert.throws(() => program.editParameter({ target: "region", value: "south" }), /prepared data update/);
  assert.equal(serializeProgram(program), snapshot);
  assert.equal(program.editParameter({ target: "region", value: "north" }).semanticSpec, semantic);
  const noOp = await prepareDataUpdate(program, { kind: "parameter", target: "region", value: "north" }, { requestToken: "same" });
  const next = program.applyDataUpdate({ prepared: noOp, requestToken: "same" });
  assert.equal(next.semanticSpec, semantic);
  assert.equal(next.semanticSpec.resources.find(resource => resource.kind === "data-source").revision, 0);
  assert.equal(next.trace.children.at(-1).children[0].op, "editParameter");
});

test("duplicate live source creation is rejected before loading and recreated parameters cannot reuse an old handle", async () => {
  let program = chart().createParameter({ id: "region", value: "north" });
  const request = { kind: "create", id: "rows", source: { kind: "url", url: parameterURL, format: "csv" } };
  const prepared = await prepareDataUpdate(program, request, { requestToken: "active", load: async () => csv("x\n1") });
  const recreated = program.removeParameter({ id: "region" }).createParameter({ id: "region", value: "north" });
  assert.deepEqual(recreated.semanticSpec, program.semanticSpec);
  assert.throws(() => recreated.applyDataUpdate({ prepared, requestToken: "active" }), /stale/);
  program = program.applyDataUpdate({ prepared, requestToken: "active" });
  let calls = 0;
  await assert.rejects(prepareDataUpdate(program, request, {
    requestToken: "duplicate", load: async () => { calls++; return csv("x\n2"); }
  }), /already exists/);
  assert.equal(calls, 0);
});
