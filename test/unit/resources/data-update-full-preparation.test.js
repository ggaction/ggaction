import assert from "node:assert/strict";
import test from "node:test";
import { closedAction } from "../../../src/core/action.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { createSourceIdentity } from "../../../src/core/itemIdentity.js";
import { createEmptySemanticSpec } from "../../../src/core/specs.js";
import { createDataSourceReceipt, createDataSourceResource, normalizeDataSourceOptions } from "../../../src/materialization/dataSourceState.js";
import { prepareDataUpdate, readPreparedDataUpdate } from "../../../src/resources/dataUpdate.js";
import { prepareDataUpdate as prepareFull } from "../../../src/resources/dataUpdateFull.js";
import { prepareDataSource } from "../../../src/resources/resolveData.js";

const response = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
const parameter = { kind: "parameter", id: "region", revision: 0, algorithmVersion: "1",
  ownership: { mode: "authored" }, inputs: [], options: { type: "string", nullable: false },
  result: { value: "north" }, provenance: { origin: "authored" } };
const source = suffix => ({ kind: "url", format: "csv", parse: { x: { type: "number" } },
  url: { version: 2, registry: "standard@1", root: { type: "call", name: "concat", args: [
    { type: "parameter", id: "region" }, { type: "literal", value: `-${suffix}.csv` }
  ] } } });

async function liveProgram(ids = ["left", "right"], keyed = true, sourceFor = source) {
  const datasets = [], resources = [parameter];
  for (const id of ids) {
    const options = normalizeDataSourceOptions(sourceFor(id), { baseURL: "https://example.test/data/", ...(keyed ? { keyField: "id" } : {}) });
    const prepared = await prepareDataSource(options.source, { baseURL: options.baseURL, requestToken: "initial",
      parameters: { region: { type: "string", value: "north" } }, parameterInputs: [{ kind: "parameter", id: "region", revision: 0 }],
      load: async () => response("id,x\na,1\nb,2") });
    const dataset = { id, values: prepared.values, schema: prepared.schema,
      ...createSourceIdentity(prepared.values, options, { logicalId: `logical-${id}`, allocationId: `allocation-${id}` }),
      sourceReceipt: createDataSourceReceipt(prepared, { sourceId: id }) };
    datasets.push(dataset);
    resources.push(createDataSourceResource({ id, options, prepared, dataset }));
  }
  return new ChartProgram({ semanticSpec: { ...createEmptySemanticSpec(), datasets, resources } });
}

function inspect(program, prepared, token) {
  let payload;
  closedAction({ op: "applyDataUpdate", description: "Inspect a prepared Full update." }, ["prepared", "requestToken"], function (args) {
    payload = readPreparedDataUpdate(this, args.prepared, args.requestToken);
    return this;
  }).call(program, { prepared, requestToken: token });
  return payload;
}

test("Full parameter preparation loads each source once with future refs and stable result order", async () => {
  const program = await liveProgram();
  const pending = new Map(), seen = [];
  const ready = prepareFull(program, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "changed", baseURL: "https://ignored.test/", load: ({ url }) => {
      seen.push(url); return new Promise(resolve => pending.set(url, resolve));
    }
  });
  assert.deepEqual(seen, ["https://example.test/data/south-left.csv", "https://example.test/data/south-right.csv"]);
  pending.get(seen[1])(response("id,x\nb,20"));
  pending.get(seen[0])(response("id,x\na,10"));
  const handle = await ready;
  assert.deepEqual(handle.request, { kind: "parameter", target: "region" });
  const payload = inspect(program, handle, "changed");
  assert.equal(payload.request.value, "south");
  assert.deepEqual(payload.plan.sources.map(entry => entry.old), ["left", "right"]);
  assert.deepEqual(payload.plan.sources.map(entry => entry.prepared.values[0].x), [10, 20]);
  for (const entry of payload.plan.sources) {
    assert.deepEqual(entry.prepared.request.parameterInputs, [{ kind: "parameter", id: "region", revision: 1 }]);
    assert.equal(entry.prepared.request.parameters.region.value, "south");
    assert.equal(entry.identity.revision, 1);
    assert.notEqual(entry.id, entry.old);
  }
  assert.deepEqual(program.semanticSpec.resources[0].result, { value: "north" });
  assert.deepEqual(program.trace.children, []);
});

test("same parameter values preserve no-op plans and require no loader", async () => {
  const program = await liveProgram();
  const handle = await prepareFull(program, { kind: "parameter", target: "region", value: "north" }, { requestToken: "same" });
  const payload = inspect(program, handle, "same");
  assert.equal(payload.plan.noOp, true);
  assert.deepEqual(payload.plan.sources, []);
  assert.deepEqual(payload.plan.revisionPlan.revisions, []);
  assert.equal(payload.plan.parameter.value, "north");
});

test("explicit refresh keeps source base URL and allocates row identity once after payload", async () => {
  const program = await liveProgram(["rows"], false);
  const rowMap = [1, null];
  const handle = await prepareFull(program, { kind: "revise", target: "rows", id: "next", rowMap }, {
    requestToken: "refresh", baseURL: "https://ignored.test/", load: async ({ url }) => {
      assert.equal(url, "https://example.test/data/north-rows.csv");
      rowMap[0] = 0;
      return response("id,x\nb,3\nc,4");
    }
  });
  const payload = inspect(program, handle, "refresh"), entry = payload.plan.sources[0];
  assert.deepEqual(handle.request, { kind: "revise", target: "rows", id: "next" });
  assert.equal(entry.id, "next");
  assert.equal(entry.identity.rowKeys[0], program.semanticSpec.datasets[0].rowKeys[1]);
  assert.notEqual(entry.identity.rowKeys[1], program.semanticSpec.datasets[0].rowKeys[0]);
  assert.equal(inspect(program, handle, "refresh").plan.sources[0].identity, entry.identity);
});

test("all-source preflight rejects stale current proof and invalid edits before loading", async () => {
  const program = await liveProgram();
  const resources = program.semanticSpec.resources.map(resource => resource.id !== "right" ? resource : {
    ...resource, result: { ...resource.result, inputHash: "0".repeat(64) }
  });
  let calls = 0;
  const host = { requestToken: "current", load: async () => { calls++; return response("id,x\na,3"); } };
  await assert.rejects(prepareFull(program._clone({ semanticSpec: { ...program.semanticSpec, resources } }),
    { kind: "parameter", target: "region", value: "south" }, host), /hash is stale/);
  for (const request of [
    { kind: "parameter", target: "region", value: 12 }, { kind: "parameter", target: "region", value: undefined },
    { kind: "parameter", target: "missing", value: "south" }, { kind: "parameter", target: "region", value: "south", extra: true },
    { kind: "revise", target: "left", id: "right" }, { kind: "revise", target: "missing", id: "next" },
    { kind: "revise", target: "left", id: "next", rowMap: [0] },
    { kind: "revise", target: "left", id: "next", rowMap: [-1] },
    { kind: "other" }
  ]) await assert.rejects(prepareFull(program, request, host));
  assert.equal(calls, 0);
});

test("all future URLs are resolved before any host callback starts", async () => {
  const program = await liveProgram(["left", "right"], true, id => id === "left" ? source(id) : {
    ...source(id), url: { version: 2, registry: "standard@1", root: { type: "if",
      condition: { type: "binary", op: "eq", left: { type: "parameter", id: "region" }, right: { type: "literal", value: "north" } },
      then: { type: "literal", value: "right.csv" }, else: { type: "literal", value: null }
    } }
  });
  let calls = 0;
  await assert.rejects(prepareFull(program, { kind: "parameter", target: "region", value: "south" }, {
    requestToken: "future", load: () => { calls++; return response("id,x\na,3"); }
  }), /nonempty string/);
  assert.equal(calls, 0);
});

test("Full prepare create delegates the same authentic creation boundary", async () => {
  const program = new ChartProgram();
  const handle = await prepareFull(program, { kind: "create", id: "rows", source: { kind: "inline", values: [] } }, { requestToken: "create" });
  assert.equal(inspect(program, handle, "create").request.kind, "create");
  await assert.rejects(prepareDataUpdate(program, { kind: "parameter", target: "region", value: "south" }, { requestToken: "create" }), /Basic/);
});
