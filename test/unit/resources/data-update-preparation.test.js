import assert from "node:assert/strict";
import test from "node:test";
import { closedAction } from "../../../src/core/action.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { createEmptySemanticSpec } from "../../../src/core/specs.js";
import { createDataSourceRequest, dataSourceRequestHash } from "../../../src/grammar/dataSourceRequest.js";
import { prepareDataUpdate, readPreparedDataUpdate } from "../../../src/resources/dataUpdate.js";

const response = text => ({ text, mimeType: "text/csv", encoding: "utf-8" });
const csv = { kind: "url", format: "csv", url: "rows.csv", parse: { x: { type: "number" } } };
const host = { requestToken: "current", baseURL: "https://example.test/data/" };
const parameter = (id, value, revision = 0) => ({ kind: "parameter", id, revision, algorithmVersion: "1",
  ownership: { mode: "authored" }, inputs: [], options: { type: typeof value, nullable: false },
  result: { value }, provenance: { origin: "authored" } });
const base = resources => new ChartProgram({ semanticSpec: { ...createEmptySemanticSpec(), resources: resources ?? [] } });

function inspect(program, prepared, requestToken = "current") {
  let payload;
  const apply = closedAction({ op: "applyDataUpdate", description: "Inspect a prepared update." },
    ["prepared", "requestToken"], function (args) {
      payload = readPreparedDataUpdate(this, args.prepared, args.requestToken);
      return this;
    });
  const result = apply.call(program, { prepared, requestToken });
  return { payload, result };
}

test("create preparation keeps rows, key identity and parser proof outside the opaque handle", async () => {
  const program = base();
  const values = [{ id: "a", x: -0 }];
  const prepared = await prepareDataUpdate(program, {
    kind: "create", id: "rows", keyField: "id", source: { kind: "inline", values }
  }, { requestToken: "current" });
  values[0].id = "changed";
  assert.deepEqual(prepared, { kind: "data-update", request: { kind: "create", id: "rows", sourceKind: "inline" } });
  assert.ok(Object.isFrozen(prepared) && Object.isFrozen(prepared.request));
  const { payload } = inspect(program, prepared);
  assert.equal(payload.prepared.values[0].id, "a");
  assert.ok(Object.is(payload.prepared.values[0].x, -0));
  assert.deepEqual(payload.identity.keySpec, { mode: "field", field: "id" });
  assert.equal(payload.identity.rowKeys.length, 1);
  assert.ok(Object.isFrozen(payload) && Object.isFrozen(payload.request.source));
  assert.deepEqual(program.semanticSpec.datasets, []);
  assert.deepEqual(program.trace.children, []);
});

test("large original text and URL literals are absent from handles and trace summaries", async () => {
  const program = base();
  const text = `value\n${"a".repeat(100_000)}`;
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows",
    source: { kind: "inline", format: "csv", text } }, { requestToken: "current" });
  const { payload, result } = inspect(program, prepared);
  assert.equal(payload.prepared.original.text, text);
  const summary = JSON.stringify(result.trace);
  assert.ok(summary.length < 500);
  assert.equal(summary.includes(text), false);
  assert.equal(summary.includes("original"), false);
  const url = `https://example.test/${"a".repeat(100_000)}.csv`;
  const remote = await prepareDataUpdate(program, { kind: "create", id: "remote", source: { ...csv, url } }, {
    requestToken: "current", load: async () => response("x\n1")
  });
  assert.equal(JSON.stringify(remote).includes(url), false);
  assert.equal(inspect(program, remote).payload.prepared.request.resolvedURL, url);
});

test("host callbacks see only resolved URL and signal while request inputs are snapshotted", async () => {
  const program = base();
  const controller = new AbortController();
  const request = { kind: "create", id: "rows", source: { ...csv, parse: { x: { type: "number" } } } };
  let release;
  const pending = prepareDataUpdate(program, request, { ...host, signal: controller.signal, load: input => {
    assert.deepEqual(input, { url: "https://example.test/data/rows.csv", signal: controller.signal });
    assert.ok(Object.isFrozen(input));
    return new Promise(resolve => { release = resolve; });
  } });
  request.id = "changed";
  request.source.parse.x.type = "string";
  release(response("x\n3"));
  const prepared = await pending;
  assert.equal(prepared.request.id, "rows");
  assert.deepEqual(inspect(program, prepared).payload.prepared.values, [{ x: 3 }]);
});

test("URL preparation binds every branch to exact typed parameter revisions", async () => {
  const program = base([parameter("main", "main.csv", 2), parameter("fallback", "fallback.csv", 4)]);
  const source = { ...csv, url: { version: 2, registry: "standard@1", root: {
    type: "if", condition: { type: "literal", value: true },
    then: { type: "parameter", id: "main" }, else: { type: "parameter", id: "fallback" }
  } } };
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows", source }, {
    ...host, load: async ({ url }) => { assert.equal(url, "https://example.test/data/main.csv"); return response("x\n2"); }
  });
  const request = inspect(program, prepared).payload.prepared.request;
  assert.deepEqual(request.parameterInputs, [
    { kind: "parameter", id: "main", revision: 2 }, { kind: "parameter", id: "fallback", revision: 4 }
  ]);
  assert.equal(request.parameters.fallback.value, "fallback.csv");
  let calls = 0;
  await assert.rejects(prepareDataUpdate(base(), { kind: "create", id: "rows", source }, {
    ...host, load: () => { calls++; return response("x\n2"); }
  }));
  assert.equal(calls, 0);
});

test("authentic updates reject cloned handles, wrong tokens and a structurally identical new base", async () => {
  const program = base();
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows", source: { kind: "inline", values: [] } }, host);
  for (const forged of [{ ...prepared }, JSON.parse(JSON.stringify(prepared)), null, "handle"]) {
    assert.throws(() => inspect(program, forged), /authentic/);
  }
  assert.throws(() => inspect(program, prepared, "old"), /stale/);
  assert.throws(() => inspect(program._clone({}), prepared), /stale/);
  assert.throws(() => readPreparedDataUpdate(program, prepared, "current"), /active wrapped invocation/);
  assert.equal(inspect(program, prepared).payload.base, program);
  assert.deepEqual(program.trace.children, []);
});

test("out of order completion requires the host current token even for identical requests", async () => {
  const program = base();
  const request = { kind: "create", id: "rows", source: csv };
  let releaseOld, releaseNew;
  const old = prepareDataUpdate(program, request, { ...host, requestToken: "old", load: () => new Promise(resolve => { releaseOld = resolve; }) });
  const current = prepareDataUpdate(program, request, { ...host, requestToken: "new", load: () => new Promise(resolve => { releaseNew = resolve; }) });
  releaseNew(response("x\n2"));
  const fresh = await current;
  releaseOld(response("x\n1"));
  const stale = await old;
  assert.equal(inspect(program, fresh, "new").payload.prepared.values[0].x, 2);
  assert.throws(() => inspect(program, stale, "new"), /stale/);
  assert.deepEqual(program.semanticSpec.datasets, []);
});

test("abort is checked before load, after load and again when applying a completed handle", async () => {
  const program = base(), request = { kind: "create", id: "rows", source: csv };
  const already = new AbortController(); already.abort();
  let calls = 0;
  await assert.rejects(prepareDataUpdate(program, request, { ...host, signal: already.signal, load: () => { calls++; } }), { name: "AbortError" });
  assert.equal(calls, 0);
  const pendingController = new AbortController();
  let release;
  const pending = prepareDataUpdate(program, request, { ...host, signal: pendingController.signal,
    load: () => new Promise(resolve => { release = resolve; }) });
  pendingController.abort(); release(response("x\n1"));
  await assert.rejects(pending, { name: "AbortError" });
  const completed = new AbortController();
  const prepared = await prepareDataUpdate(program, request, { ...host, signal: completed.signal, load: async () => response("x\n1") });
  completed.abort();
  assert.throws(() => inspect(program, prepared), { name: "AbortError" });
  assert.deepEqual(program.trace.children, []);
});

test("invalid request, source policy, IDs and host descriptors fail before any callback", async () => {
  const program = base();
  let calls = 0, getters = 0;
  const validHost = { ...host, load: async () => { calls++; return response("x\n1"); } };
  for (const request of [
    { kind: "create", source: csv }, { kind: "create", id: "rows", source: csv, keys: [] },
    { kind: "create", id: "rows", source: csv, keyField: "id", keyFields: ["id"] },
    { kind: "create", id: "rows", source: csv, keyFields: ["id", "id"] },
    { kind: "create", id: "rows", source: csv, keyField: undefined },
    { kind: "revise", target: "rows", id: "next" }, { kind: "parameter", target: "p", value: 1 },
    { kind: "unknown" }, { get kind() { getters++; return "create"; } }
  ]) await assert.rejects(prepareDataUpdate(program, request, validHost));
  const validRequest = { kind: "create", id: "rows", source: csv };
  for (const invalidHost of [{}, { requestToken: "" }, { ...host, extra: true }, { ...host, load: 2 },
    { ...host, resolveNamed: null }, { ...host, baseURL: "relative/" }, { ...host, signal: {} },
    { get requestToken() { getters++; return "current"; } }]) {
    await assert.rejects(prepareDataUpdate(program, validRequest, invalidHost));
  }
  await assert.rejects(prepareDataUpdate({}, validRequest, validHost), /ChartProgram/);
  await assert.rejects(prepareDataUpdate(base([{ kind: "data-source", id: "rows" }]), validRequest, validHost));
  assert.equal(calls, 0); assert.equal(getters, 0);
});

test("signal own accessors cannot masquerade as cancellation state", async () => {
  const controller = new AbortController();
  let calls = 0;
  Object.defineProperty(controller.signal, "aborted", { get() { calls++; return true; } });
  const program = base();
  const prepared = await prepareDataUpdate(program, { kind: "create", id: "rows", source: { kind: "inline", values: [] } },
    { requestToken: "current", signal: controller.signal });
  inspect(program, prepared);
  assert.equal(calls, 0);
  controller.abort();
  assert.throws(() => inspect(program, prepared), { name: "AbortError" });
});

test("named and URL sources require explicit callbacks and isolate loader rejection", async () => {
  const program = base();
  const named = { kind: "create", id: "rows", source: { kind: "named", name: "table", format: "csv" } };
  await assert.rejects(prepareDataUpdate(program, named, host), /resolveNamed callback/);
  await assert.rejects(prepareDataUpdate(program, { kind: "create", id: "rows", source: csv }, host), /load callback/);
  const prepared = await prepareDataUpdate(program, named, { ...host, resolveNamed: async input => {
    assert.deepEqual(input, { name: "table" });
    return response("x\n1");
  } });
  assert.equal(inspect(program, prepared).payload.prepared.values[0].x, "1");
  const failure = new Error("Host unavailable");
  await assert.rejects(prepareDataUpdate(program, named, { ...host, resolveNamed: async () => { throw failure; } }),
    error => error === failure);
  assert.deepEqual(program.trace.children, []);
  assert.deepEqual(program.semanticSpec.datasets, []);
});

test("request hashes include canonical base URL and exact parameters but exclude tokens", () => {
  const first = createDataSourceRequest(csv, { ...host, baseURL: "https://EXAMPLE.test:443/data/./" });
  const second = createDataSourceRequest(csv, { ...host, requestToken: "other" });
  assert.equal(first.baseURL, "https://example.test/data/");
  assert.equal(first.inputHash, second.inputHash);
  assert.equal(first.inputHash, dataSourceRequestHash(first));
  assert.notEqual(first.inputHash, dataSourceRequestHash({ ...first, baseURL: "https://example.test/else/" }));
  assert.throws(() => createDataSourceRequest({ kind: "inline", values: [] }, { ...host, baseURL: "relative/" }), /absolute/);
});
