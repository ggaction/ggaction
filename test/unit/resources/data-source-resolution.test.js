import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { createDataSourceRequest, prepareDataSource, validatePreparedDataSource } from "../../../src/resources/resolveData.js";

const identity = prepared => ({ requestToken: prepared.request.requestToken, inputHash: prepared.request.inputHash });
const response = text => ({ text, mimeType: "text/csv; charset=utf-8", encoding: "utf-8" });
const source = { kind: "url", url: "values.csv", format: "csv", parse: { x: { type: "number" } } };
const options = { baseURL: "https://example.test/data/", requestToken: "request-1" };

test("host resolver receives an explicit absolute URL and retained bytes have exact hash", async () => {
  const text = "\uFEFFx,label\r\n1,한글\r\n";
  let calls = 0;
  const prepared = await prepareDataSource(source, { ...options, load: async input => {
    calls += 1; assert.deepEqual(input, { url: "https://example.test/data/values.csv" });
    return { bytes: new TextEncoder().encode(text), mimeType: "text/csv", encoding: "utf-8" };
  } });
  assert.equal(calls, 1);
  assert.equal(prepared.original.text, text);
  assert.equal(prepared.provenance.contentHash, createHash("sha256").update(text).digest("hex"));
  assert.equal(prepared.provenance.byteLength, Buffer.byteLength(text));
  assert.deepEqual(prepared.values, [{ x: 1, label: "한글" }]);
  assert.equal(validatePreparedDataSource(prepared, identity(prepared)), prepared);
  assert.ok(Object.isFrozen(prepared.request.source.parse.x));
});

test("named resources require their exact host name and never choose a default", async () => {
  const prepared = await prepareDataSource({ kind: "named", name: "measurements", format: "json" }, {
    requestToken: "named-1", resolveNamed: async input => {
      assert.deepEqual(input, { name: "measurements" });
      return { text: '[{"x":2}]', mimeType: "application/dataset+json", encoding: "utf-8" };
    }
  });
  assert.deepEqual(prepared.values, [{ x: 2 }]);
  await assert.rejects(prepareDataSource({ kind: "named", name: "missing", format: "json" }, { requestToken: "n" }), /resolveNamed/);
  await assert.rejects(prepareDataSource(source, options), /load callback/);
  assert.throws(() => createDataSourceRequest(source, { requestToken: "r" }), /baseURL/);
});

test("inline rows distinguish encoded provenance and preserve signed zero and immutability", async () => {
  const values = [{ x: -0, nested: { value: 1 } }];
  const prepared = await prepareDataSource({ kind: "inline", values }, { requestToken: "rows-1" });
  values[0].nested.value = 8;
  assert.equal(prepared.original.kind, "rows");
  assert.equal(prepared.provenance.hashKind, "encoded-rows");
  assert.equal(prepared.provenance.mimeType, undefined);
  assert.ok(Object.is(prepared.values[0].x, -0));
  assert.equal(prepared.values[0].nested.value, 1);
  const zero = await prepareDataSource({ kind: "inline", values: [{ x: 0, nested: { value: 1 } }] }, { requestToken: "rows-1" });
  assert.notEqual(prepared.provenance.contentHash, zero.provenance.contentHash);
  assert.equal(validatePreparedDataSource(prepared, identity(prepared)), prepared);
});

test("inline text and external text follow identical parsing and content hashing", async () => {
  const text = "x\n2";
  const inline = await prepareDataSource({ kind: "inline", text, format: "csv", parse: source.parse }, { requestToken: "inline" });
  const external = await prepareDataSource(source, { ...options, load: async () => response(text) });
  assert.deepEqual(inline.values, external.values);
  assert.deepEqual(inline.provenance, external.provenance);
  assert.equal(validatePreparedDataSource(inline, identity(inline)), inline);
});

test("MIME, encoding, payload ambiguity, and invalid UTF-8 fail closed", async () => {
  const invalid = [
    { text: "x\n1", mimeType: "application/json", encoding: "utf-8" },
    { text: "x\n1", mimeType: "text/csv", encoding: "latin1" },
    { text: "x\n1", mimeType: "text/csv; charset=latin1", encoding: "utf-8" },
    { ...response("x\n1"), bytes: new Uint8Array([120]) },
    { bytes: new Uint8Array([0xc3, 0x28]), mimeType: "text/csv", encoding: "utf-8" },
    { bytes: [120], mimeType: "text/csv", encoding: "utf-8" },
    response("x\n\ud800")
  ];
  for (const value of invalid) await assert.rejects(prepareDataSource(source, { ...options, load: async () => value }));
});

test("URL expressions bind dependencies from inactive branches and reject incorrect revision vectors", async () => {
  const expression = { version: 2, registry: "standard@1", root: { type: "if", condition: { type: "literal", value: true },
    then: { type: "parameter", id: "primary" }, else: { type: "parameter", id: "fallback" } } };
  const dynamic = { ...source, url: expression };
  const env = { primary: { type: "string", value: "first.csv" }, fallback: { type: "string", value: "second.csv" } };
  const refs = [{ kind: "parameter", id: "primary", revision: 2 }, { kind: "parameter", id: "fallback", revision: 0 }];
  const request = createDataSourceRequest(dynamic, { ...options, parameters: env, parameterInputs: refs });
  assert.equal(request.resolvedURL, "https://example.test/data/first.csv");
  assert.deepEqual(request.parameterInputs, refs);
  const changed = createDataSourceRequest(dynamic, { ...options, parameters: { ...env, fallback: { type: "string", value: "third.csv" } }, parameterInputs: refs });
  assert.notEqual(request.inputHash, changed.inputHash);
  for (const parameterInputs of [refs.slice(0, 1), [...refs].reverse(), [refs[0], refs[0]]]) {
    assert.throws(() => createDataSourceRequest(dynamic, { ...options, parameters: env, parameterInputs }), /parameter inputs/);
  }
  assert.throws(() => createDataSourceRequest({ ...source, url: { version: 2, registry: "standard@1", root: { type: "literal", value: 1 } } }, options), /nonempty string/);
});

test("prepared data rejects changed revisions, removed/recreated request tokens, and tampering", async () => {
  const prepared = await prepareDataSource(source, { ...options, load: async () => response("x\n1") });
  assert.throws(() => validatePreparedDataSource(prepared, { ...identity(prepared), requestToken: "request-2" }), /stale/);
  assert.throws(() => validatePreparedDataSource(prepared, { ...identity(prepared), inputHash: "changed" }), /stale/);
  for (const tampered of [
    { ...prepared, values: [{ x: 2 }] }, { ...prepared, original: { kind: "text", text: "x\n2" } },
    { ...prepared, provenance: { ...prepared.provenance, contentHash: "forged" } },
    { ...prepared, request: { ...prepared.request, resolvedURL: "https://example.test/other.csv" } }
  ]) assert.throws(() => validatePreparedDataSource(tampered, identity(prepared)));
});

test("preparation snapshots caller inputs before host work and forwards cancellation", async () => {
  const controller = new AbortController();
  let release, calls = 0;
  const mutable = { ...source, parse: { x: { type: "number" } } };
  const pending = prepareDataSource(mutable, { ...options, signal: controller.signal, load: input => {
    calls += 1; assert.equal(input.signal, controller.signal);
    return new Promise(resolve => { release = resolve; });
  } });
  mutable.parse.x.type = "string";
  controller.abort(); release(response("x\n1"));
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(prepareDataSource(source, { ...options, signal: controller.signal, load: () => { calls += 1; } }), { name: "AbortError" });
  assert.equal(calls, 1);
  let finish;
  const fresh = { ...source, parse: { x: { type: "number" } } };
  const ready = prepareDataSource(fresh, { ...options, load: () => new Promise(resolve => { finish = resolve; }) });
  fresh.parse.x.type = "string"; finish(response("x\n1"));
  assert.deepEqual((await ready).values, [{ x: 1 }]);
});

test("host response accessors are rejected without being invoked", async () => {
  let reads = 0;
  await assert.rejects(prepareDataSource(source, { ...options, load: async () => ({
    get text() { reads += 1; return "x\n1"; }, mimeType: "text/csv", encoding: "utf-8"
  }) }), /accessors/);
  assert.equal(reads, 0);
});

test("oversized source descriptors fail before request hashing or host loading", async () => {
  const large = "x".repeat(10_000_001);
  let calls = 0;
  for (const input of [
    { kind: "inline", format: "csv", text: large },
    { kind: "url", format: "csv", url: large },
    { kind: "named", format: "json", name: large }
  ]) {
    await assert.rejects(prepareDataSource(input, { requestToken: "bounded", load: () => { calls++; }, resolveNamed: () => { calls++; } }), error => getErrorDetails(error)?.code === "resource-limit");
  }
  assert.throws(() => createDataSourceRequest(source, { ...options, baseURL: large }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.throws(() => createDataSourceRequest(source, { ...options, requestToken: large }), error => getErrorDetails(error)?.code === "resource-limit");
  assert.equal(calls, 0);
});
