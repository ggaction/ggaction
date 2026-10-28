import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getEventListeners } from "node:events";
import { prepareImageAsset } from "../../../src/resources/resolveAssets.js";
import { contentBytesDigest, contentDigest } from "../../../src/core/contentDigest.js";

const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128, 17]);
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const request = (changes = {}) => ({ uri: "fixture:image", mimeType: "image/png", expectedHash: digest(png), ...changes });
const host = (changes = {}) => ({ load: async () => ({ bytes: png, mimeType: "image/png" }), decode: async () => ({ width: 200, height: 100, originClean: true }), ...changes });
const code = expected => error => error.assetCode === expected;
const pending = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("hashes arbitrary bytes and UTF-8 independently against SHA256", () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 129, 8193]) {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 17 + 253) % 256);
    assert.equal(contentBytesDigest(bytes), digest(bytes));
  }
  assert.equal(contentDigest("한글🙂"), digest(Buffer.from("한글🙂")));
  assert.throws(() => contentBytesDigest([1]), TypeError);
  let calls = 0;
  const bytes = new Uint8Array(png);
  Object.defineProperty(bytes, "length", { get() { calls++; return 0; } });
  Object.defineProperty(bytes, Symbol.iterator, { get() { calls++; return undefined; } });
  assert.equal(contentBytesDigest(bytes), digest(png));
  assert.equal(calls, 0);
  assert.throws(() => contentBytesDigest(new Uint8Array(new SharedArrayBuffer(10))), TypeError);
});

test("retains immutable offline bytes and attribution without decoder objects", async () => {
  const bytes = new Uint8Array(png);
  const asset = await prepareImageAsset(request({ license: "CC0", attribution: "fixture" }), host({
    load: async options => { assert.ok(Object.isFrozen(options)); return { bytes, mimeType: "image/png" }; },
    decode: async options => { options.bytes.fill(0); bytes.fill(0); return { width: 200, height: 100, originClean: true }; }
  }));
  assert.deepEqual(Buffer.from(asset.payload.data, "base64"), Buffer.from(png));
  assert.equal(asset.contentHash, digest(png));
  assert.equal(asset.byteLength, png.length);
  assert.equal(asset.license, "CC0");
  assert.equal(asset.attribution, "fixture");
  assert.ok(Object.isFrozen(asset)); assert.ok(Object.isFrozen(asset.payload));
  assert.equal(JSON.parse(JSON.stringify(asset)).width, 200);
});

test("validates all request descriptors before host work", async () => {
  let calls = 0;
  const h = host({ load: () => { calls++; } });
  for (const input of [request({ expectedHash: "bad" }), request({ uri: " " }), request({ mimeType: "text/html" }),
    request({ maxBytes: null }), request({ maxBytes: 0 }), request({ maxBytes: Infinity }), request({ maxBytes: 16 * 1024 * 1024 + 1 }),
    request({ extra: true }), request({ license: 1 })]) await assert.rejects(prepareImageAsset(input, h));
  await assert.rejects(prepareImageAsset({ ...request(), get attribution() { calls++; return "bad"; } }, h), /accessors/);
  await assert.rejects(prepareImageAsset(request(), { ...h, get decode() { calls++; return () => {}; } }), /accessors/);
  await assert.rejects(prepareImageAsset(request(), host({ signal: { aborted: false } })), TypeError);
  await assert.rejects(prepareImageAsset(request(), host({ decode: undefined })), /callbacks/);
  assert.equal(calls, 0);
});

test("rejects byte, MIME, and hash failures before decoding", async () => {
  let decodes = 0;
  const h = changes => host({ decode: () => { decodes++; }, ...changes });
  await assert.rejects(prepareImageAsset(request(), h({ load: async () => ({ bytes: new Uint8Array(), mimeType: "image/png" }) })), code("byte-limit"));
  await assert.rejects(prepareImageAsset(request({ maxBytes: 8 }), h({})), code("byte-limit"));
  await assert.rejects(prepareImageAsset(request(), h({ load: async () => ({ bytes: [1], mimeType: "image/png" }) })), TypeError);
  await assert.rejects(prepareImageAsset(request(), h({ load: async () => ({ bytes: png, mimeType: "image/jpeg" }) })), code("mime-mismatch"));
  await assert.rejects(prepareImageAsset(request(), h({ load: async () => ({ bytes: new Uint8Array(12), mimeType: "image/png" }) })), code("mime-mismatch"));
  await assert.rejects(prepareImageAsset(request({ expectedHash: "0".repeat(64) }), h({})), code("hash-mismatch"));
  assert.equal(decodes, 0);
});

test("checks JPEG and WebP signatures before using the explicit decoder", async () => {
  for (const [mimeType, bytes] of [["image/jpeg", Uint8Array.of(255, 216, 255, 0)], ["image/webp", Uint8Array.of(82,73,70,70,0,0,0,0,87,69,66,80)]]) {
    const asset = await prepareImageAsset(request({ mimeType, expectedHash: digest(bytes) }), host({ load: async () => ({ bytes, mimeType }) }));
    assert.equal(asset.mimeType, mimeType);
  }
});

test("distinguishes load, CORS, decode, dimension and export errors", async () => {
  const failure = new Error("network");
  await assert.rejects(prepareImageAsset(request(), host({ load: () => { throw failure; } })), error => error.assetCode === "load-error" && error.cause === failure);
  await assert.rejects(prepareImageAsset(request(), host({ load: () => { const e = new Error("cors"); e.name = "SecurityError"; throw e; } })), code("cors"));
  await assert.rejects(prepareImageAsset(request(), host({ decode: () => { throw new Error("decode"); } })), code("decode-error"));
  for (const width of [0, -1, 1.5, Infinity, 64 * 1024 * 1024]) {
    await assert.rejects(prepareImageAsset(request(), host({ decode: async () => ({ width, height: 2, originClean: true }) })), code("dimension-limit"));
  }
  await assert.rejects(prepareImageAsset(request(), host({ decode: async () => ({ width: 1, height: 1, originClean: false }) })), code("cors"));
});

test("a pre-aborted request never invokes either callback", async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(prepareImageAsset(request(), host({ signal: controller.signal, load: () => { calls++; }, decode: () => { calls++; } })), code("aborted"));
  assert.equal(calls, 0);
});

test("abort rejects promptly while a load is pending and ignores late results", async () => {
  const controller = new AbortController(), load = pending(), started = pending(); let decodes = 0;
  const result = prepareImageAsset(request(), host({ signal: controller.signal,
    load: () => { started.resolve(); return load.promise; }, decode: () => { decodes++; } }));
  await started.promise; controller.abort();
  await assert.rejects(result, code("aborted"));
  load.resolve({ bytes: png, mimeType: "image/png" }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(decodes, 0);
});

test("abort during decode discards its late result", async () => {
  const controller = new AbortController(), decode = pending(), started = pending();
  const result = prepareImageAsset(request(), host({ signal: controller.signal,
    decode: () => { started.resolve(); return decode.promise; } }));
  await started.promise; controller.abort(); await assert.rejects(result, code("aborted"));
  decode.resolve({ width: 200, height: 100, originClean: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("detaches all abort listeners after successful preparation and host failure", async () => {
  const controller = new AbortController();
  await prepareImageAsset(request(), host({ signal: controller.signal }));
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  await assert.rejects(prepareImageAsset(request(), host({ signal: controller.signal, load: () => Promise.reject(new Error("offline")) })));
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("retains payloads across base64 chunks and snapshots the request before loading", async () => {
  const bytes = new Uint8Array(17001); bytes.set(png); bytes[17000] = 253;
  const input = request({ expectedHash: digest(bytes) }), loading = pending(), started = pending();
  const controller = new AbortController();
  const result = prepareImageAsset(input, host({ signal: controller.signal, load: () => { started.resolve(); return loading.promise; } }));
  await started.promise; input.expectedHash = "0".repeat(64); input.mimeType = "image/jpeg";
  loading.resolve({ bytes, mimeType: "image/png" });
  const asset = await result;
  assert.deepEqual(Buffer.from(asset.payload.data, "base64"), Buffer.from(bytes));
  assert.equal(asset.contentHash, digest(bytes));
});
