import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getEventListeners } from "node:events";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { prepareFontAsset, prepareFontMeasurements } from "../../../src/resources/resolveFonts.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const sha = value => createHash("sha256").update(value).digest("hex");
const request = (changes = {}) => ({ uri: "fixture:font", mimeType: "font/ttf", expectedHash: sha(bytes),
  family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture-metrics@1", ...changes });
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
const host = (changes = {}) => ({ load: async () => ({ bytes, mimeType: "font/ttf" }), decode: async value => identity(value), ...changes });
const metricResult = (asset, widths) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths });
const code = value => error => error.assetCode === value;
const pending = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("pins a real font's bytes and measures its declared advances through the exact native font", async () => {
  assert.equal(sha(bytes), "cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878");
  let fontKey;
  try {
    const asset = await prepareFontAsset(request({ license: "MIT", attribution: "Original geometric fixture" }), host({
      decode: async value => {
        assert.equal(sha(value.bytes), value.contentHash);
        fontKey = GlobalFonts.register(Buffer.from(value.bytes), value.family);
        assert.ok(fontKey, "The pinned TTF must decode successfully.");
        return identity(value);
      }
    }));
    const profile = await prepareFontMeasurements(asset, [{ text: "AB", fontSize: 20 }, { text: "", fontSize: 20 },
      { text: "A\u0301", fontSize: 20 }], { measure: async value => {
      assert.equal(value.asset, asset); assert.ok(Object.isFrozen(value.queries[0]));
      const context = createCanvas(1, 1).getContext("2d");
      return metricResult(asset, value.queries.map(query => {
        context.font = `${asset.style} ${asset.weight} ${query.fontSize}px "${asset.family}"`;
        return context.measureText(query.text).width;
      }));
    } });
    assert.deepEqual(profile.measurements.map(value => value.width), [28, 0, 12]);
    assert.deepEqual(profile.fontIdentity, identity(asset));
    assert.equal(profile.measurements[0].fontFamily, asset.family);
    assert.equal(asset.payload.data, Buffer.from(bytes).toString("base64"));
    assert.equal(asset.byteLength, bytes.length); assert.equal(asset.license, "MIT");
    assert.ok(Object.isFrozen(asset.payload)); assert.ok(Object.isFrozen(profile.measurements[0]));
  } finally { if (fontKey) assert.equal(GlobalFonts.remove(fontKey), true); }
});

test("retains separate immutable bytes after the host mutates its decoder copy", async () => {
  const source = new Uint8Array(bytes);
  const asset = await prepareFontAsset(request(), host({
    load: async () => ({ bytes: source, mimeType: "font/ttf" }),
    decode: async value => { value.bytes.fill(0); source.fill(0); return identity(value); }
  }));
  assert.equal(asset.payload.data, Buffer.from(bytes).toString("base64"));
  assert.equal(asset.contentHash, sha(bytes));
});

test("requires explicit valid font identity and provider before host work", async () => {
  let calls = 0;
  for (const change of [{ family: "" }, { family: 1 }, { metricsProviderVersion: " " }, { style: "oblique" },
    { weight: 450 }, { weight: 0 }, { weight: 1000 }, { weight: NaN }, { weight: "400" }, { mimeType: "application/font-woff" }]) {
    await assert.rejects(prepareFontAsset(request(change), host({ load: () => { calls++; } })));
  }
  await assert.rejects(prepareFontAsset(request(), host({ decode: null })), /callbacks/);
  await assert.rejects(prepareFontAsset({ ...request(), get family() { calls++; return "bad"; } }, host()), /accessors/);
  assert.equal(calls, 0);
});

test("checks all supported MIME signatures and separates signature checks from complete host decoding", async () => {
  for (const [mimeType, signature] of [["font/ttf", [0,1,0,0]], ["font/otf", [79,84,84,79]],
    ["font/woff", [119,79,70,70]], ["font/woff2", [119,79,70,50]]]) {
    const value = Uint8Array.from(signature);
    const asset = await prepareFontAsset(request({ mimeType, expectedHash: sha(value), style: "italic", weight: 700 }), host({
      load: async () => ({ bytes: value, mimeType })
    }));
    assert.equal(asset.mimeType, mimeType);
    await assert.rejects(prepareFontAsset(request({ mimeType }), host({ load: async () => ({ bytes: new Uint8Array(4), mimeType }) })), code("mime-mismatch"));
  }
  await assert.rejects(prepareFontAsset(request(), host({ decode: () => { throw new Error("Invalid tables"); } })), code("decode-error"));
});

test("rejects a different decoded font identity even after valid bytes were received", async () => {
  for (const change of [{ contentHash: "0".repeat(64) }, { family: "Fallback" }, { style: "italic" },
    { weight: 700 }, { metricsProviderVersion: "other@1" }]) {
    await assert.rejects(prepareFontAsset(request(), host({ decode: async value => ({ ...identity(value), ...change }) })), code("font-identity-mismatch"));
  }
});

test("validates measurement inputs without invoking the provider", async () => {
  const asset = await prepareFontAsset(request(), host()); let calls = 0;
  const provider = { measure: () => { calls++; } };
  for (const input of [[], Array(10001).fill({ text: "A", fontSize: 12 }), [{ text: 1, fontSize: 12 }],
    [{ text: "A", fontSize: 0 }], [{ text: "A", fontSize: Infinity }], [{ text: "A", fontSize: 12, extra: true }],
    [{ text: "A".repeat(1048577), fontSize: 12 }]]) await assert.rejects(prepareFontMeasurements(asset, input, provider));
  await assert.rejects(prepareFontMeasurements({ ...asset }, [{ text: "A", fontSize: 12 }], provider), /prepared/);
  await assert.rejects(prepareFontMeasurements(asset, [{ text: "A", fontSize: 12 }], { measure: null }), /callback/);
  await assert.rejects(prepareFontMeasurements(asset, [{ get text() { calls++; return "A"; }, fontSize: 12 }], provider), /accessors/);
  assert.equal(calls, 0);
});

test("rejects fallback measurements, incomplete widths and unsafe results", async () => {
  const asset = await prepareFontAsset(request(), host()), queries = [{ text: "A", fontSize: 12 }];
  for (const result of [{ ...metricResult(asset, [12]), contentHash: "0".repeat(64) },
    { ...metricResult(asset, [12]), metricsProviderVersion: "fallback@1" }]) {
    await assert.rejects(prepareFontMeasurements(asset, queries, { measure: async () => result }), code("font-identity-mismatch"));
  }
  for (const widths of [[], [1, 2], [-1], [NaN], [Infinity]]) {
    await assert.rejects(prepareFontMeasurements(asset, queries, { measure: async () => metricResult(asset, widths) }), code("invalid-metrics"));
  }
  await assert.rejects(prepareFontMeasurements(asset, queries, { measure: async () => metricResult(asset, [ , ]) }), /dense/);
  let getters = 0;
  await assert.rejects(prepareFontMeasurements(asset, queries, { measure: async () => ({
    ...metricResult(asset, []), get widths() { getters++; return [1]; }
  }) }), /accessors/);
  assert.equal(getters, 0);
});

test("snapshots measurement queries and widths without retaining mutable provider state", async () => {
  const asset = await prepareFontAsset(request(), host()), queries = [{ text: "A", fontSize: 20 }];
  const started = pending(), measured = pending(), widths = [12], controller = new AbortController();
  const profile = prepareFontMeasurements(asset, queries, { signal: controller.signal,
    measure: async value => { started.resolve(); assert.ok(Object.isFrozen(value)); return measured.promise; } });
  await started.promise; queries[0].text = "B"; queries[0].fontSize = 40;
  measured.resolve(metricResult(asset, widths)); const result = await profile; widths[0] = 99;
  assert.equal(result.measurements[0].text, "A"); assert.equal(result.measurements[0].fontSize, 20);
  assert.equal(result.measurements[0].width, 12); assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("pre-aborted font load and measurements invoke zero callbacks", async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(prepareFontAsset(request(), host({ signal: controller.signal, load: () => { calls++; } })), code("aborted"));
  const asset = await prepareFontAsset(request(), host());
  await assert.rejects(prepareFontMeasurements(asset, [{ text: "A", fontSize: 12 }],
    { signal: controller.signal, measure: () => { calls++; } }), code("aborted"));
  assert.equal(calls, 0);
});

test("abort discards late font load, decode and measurement results and removes listeners", async () => {
  for (const stage of ["load", "decode", "measure"]) {
    const controller = new AbortController(), started = pending(), work = pending();
    let supplied;
    const callback = value => { supplied = value; started.resolve(); return work.promise; };
    const asset = stage === "measure" ? await prepareFontAsset(request(), host()) : undefined;
    const result = stage === "measure"
      ? prepareFontMeasurements(asset, [{ text: "A", fontSize: 12 }], { measure: callback, signal: controller.signal })
      : prepareFontAsset(request(), host({ [stage]: callback, signal: controller.signal }));
    await started.promise; controller.abort(); await assert.rejects(result, code("aborted"));
    work.resolve(stage === "load" ? { bytes, mimeType: "font/ttf" } : stage === "decode" ? identity(supplied) : metricResult(asset, [12]));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  }
});

test("reports provider failure and invalid signals without running getters or changing identity", async () => {
  const asset = await prepareFontAsset(request(), host()), before = JSON.stringify(asset);
  const controller = new AbortController(), failure = new Error("Metric unavailable");
  await assert.rejects(prepareFontMeasurements(asset, [{ text: "A", fontSize: 12 }], {
    signal: controller.signal, measure: () => { throw failure; }
  }), error => error.assetCode === "measure-error" && error.cause === failure && error.name === "FontAssetError");
  await assert.rejects(prepareFontAsset(request(), host({ signal: { aborted: false } })), TypeError);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  assert.equal(JSON.stringify(asset), before);
});
