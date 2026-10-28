import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { collectResourceReferences } from "../../../src/core/resourceReferences.js";

const bytes = new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
const expectedHash = createHash("sha256").update(bytes).digest("hex");
const family = "ggaction Metric Fixture";
const identity = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
const request = (changes = {}) => ({ kind: "create", id: "font", uri: "fixture:font", mimeType: "font/ttf", expectedHash,
  family, style: "normal", weight: 400, metricsProviderVersion: "fixture@1", ...changes });
const nativeHost = (changes = {}) => ({ requestToken: "current", load: async () => ({ bytes, mimeType: "font/ttf" }),
  decode: async value => {
    const key = GlobalFonts.register(Buffer.from(value.bytes), value.family);
    assert.ok(key); assert.equal(GlobalFonts.remove(key), true); return identity(value);
  },
  measure: async ({ asset, queries }) => {
    const key = GlobalFonts.register(Buffer.from(asset.payload.data, "base64"), asset.family);
    assert.ok(key);
    try {
      const ctx = createCanvas(1, 1).getContext("2d");
      return { contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion,
        widths: queries.map(query => { ctx.font = `${asset.style} ${asset.weight} ${query.fontSize}px "${asset.family}"`; return ctx.measureText(query.text).width; }) };
    } finally { assert.equal(GlobalFonts.remove(key), true); }
  }, ...changes });
const metricHost = (changes = {}) => { const { load: _load, ...host } = nativeHost(changes); return host; };
async function withFont(program = chart(), changes = {}) {
  const prepared = await prepareFontResource(program, request(changes), nativeHost());
  return program.createFontResource({ prepared, requestToken: "current" });
}
const title = () => chart().createCanvas({ width: 500, height: 350, margin: 80 })
  .createTitle({ text: "AB AB", maxWidth: 50, titleStyle: { fontFamily: family, fontSize: 20, fontWeight: 400 } });

test("prepares exact native font widths, wraps once applied and restores without host calls", async () => {
  const base = await withFont(title()), before = serializeProgram(base);
  const prepared = await prepareTextMetrics(base, { id: "measured", fonts: ["font"] }, metricHost());
  assert.deepEqual(prepared, { kind: "text-metrics", request: { id: "measured", fonts: ["font"] } });
  const measured = base.applyTextMetrics({ prepared, requestToken: "current" });
  const profile = measured.materializationConfigs.textMetrics;
  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.measurements.find(value => value.text === "AB").width, 28);
  assert.equal(profile.measurements.find(value => value.text === "AB AB").width, 61);
  assert.deepEqual(measured.graphicSpec.objects.chartTitle.items.map(item => item.properties.text), ["AB", "AB"]);
  assert.equal(serializeProgram(base), before);
  const restored = deserializeProgram(serializeProgram(measured));
  assert.deepEqual(restored.materializationConfigs.textMetrics, profile);
  assert.deepEqual(restored.editCanvas({ width: 520 }).graphicSpec.objects.chartTitle.items.map(item => item.properties.text), ["AB", "AB"]);
  assert.ok(collectResourceReferences(measured, { kind: "font", id: "font" }).some(ref => ref.path[0] === "textMetrics"));
  assert.equal(basic().createFontResource, undefined);
});

test("new labels require preparation and leave exact profiles and traces unchanged", async () => {
  const base = await withFont(title());
  const prepared = await prepareTextMetrics(base, { id: "measured", fonts: ["font"] }, metricHost());
  const measured = base.applyTextMetrics({ prepared, requestToken: "current" }), before = serializeProgram(measured);
  assert.throws(() => measured.editTitle({ text: "BBBB" }), error => error.assetCode === "metrics-required");
  assert.equal(serializeProgram(measured), before);
  const edited = measured.removeTextMetrics().editTitle({ text: "BBBB" });
  const next = edited.applyTextMetrics({ prepared: await prepareTextMetrics(edited, { id: "updated", fonts: ["font"] }, metricHost()), requestToken: "current" });
  assert.equal(next.materializationConfigs.textMetrics.measurements.find(value => value.text === "BBBB").width, 64);
});

test("font and metric handles reject forged, stale, wrong-token, ABA and aborted application", async () => {
  const base = title(), prepared = await prepareFontResource(base, request(), nativeHost());
  assert.throws(() => base.createFontResource({ prepared: { ...prepared }, requestToken: "current" }), /authentic/);
  assert.throws(() => base.createFontResource({ prepared, requestToken: "old" }), error => error.assetCode === "stale-result");
  assert.throws(() => base.editCanvas({ width: 510 }).editCanvas({ width: 500 }).createFontResource({ prepared, requestToken: "current" }), error => error.assetCode === "stale-result");
  const font = base.createFontResource({ prepared, requestToken: "current" });
  const controller = new AbortController();
  const metrics = await prepareTextMetrics(font, { id: "m", fonts: ["font"] }, metricHost({ signal: controller.signal }));
  assert.throws(() => font.applyTextMetrics({ prepared: metrics, requestToken: "wrong" }), error => error.assetCode === "stale-result");
  assert.throws(() => font.editCanvas({ width: 510 }).applyTextMetrics({ prepared: metrics, requestToken: "current" }), error => error.assetCode === "stale-result");
  assert.throws(() => font.applyTextMetrics({ profile: { schemaVersion: 1, id: "m", measurements: [] }, prepared: metrics, requestToken: "current" }), /either/);
  controller.abort();
  assert.throws(() => font.applyTextMetrics({ prepared: metrics, requestToken: "current" }), error => error.assetCode === "aborted");
});

test("bound font replacement prepares its new measurement identity and removal is explicit", async () => {
  const base = await withFont(title());
  const measured = base.applyTextMetrics({ prepared: await prepareTextMetrics(base, { id: "m", fonts: ["font"] }, metricHost()), requestToken: "current" });
  let loads = 0;
  const replacing = request({ kind: "replace", target: "font", metricsProviderVersion: "fixture@2" }); delete replacing.id;
  const { measure: _measure, ...withoutMeasure } = nativeHost({ load: () => { loads++; } });
  await assert.rejects(prepareFontResource(measured, replacing, withoutMeasure), /measure/);
  assert.equal(loads, 0);
  const next = measured.replaceFontResource({ prepared: await prepareFontResource(measured, replacing, nativeHost()), requestToken: "current" });
  assert.equal(next.semanticSpec.resources[0].revision, 1);
  assert.equal(next.materializationConfigs.textMetrics.fonts[0].resource.revision, 1);
  assert.equal(next.materializationConfigs.textMetrics.fonts[0].identity.metricsProviderVersion, "fixture@2");
  assert.throws(() => next.removeResource({ kind: "font", id: "font" }), /active font/);
  const removed = next.removeResource({ kind: "font", id: "font", cascade: true });
  assert.equal(removed.semanticSpec.resources.length, 0);
  assert.equal(removed.materializationConfigs.textMetrics, undefined);
  assert.doesNotThrow(() => serializeProgram(removed));
  assert.throws(() => next.editSemantic({ property: "resource[font:font]", value: { ...next.semanticSpec.resources[0], revision: 2 } }), /stale/);
});

test("compositions adopt exact parent bindings and reject a conflicting child namespace", async () => {
  const composed = hconcat({ programs: [{ id: "a", program: title() }, { id: "b", program: title() }] });
  const base = await withFont(composed);
  const prepared = await prepareTextMetrics(base, { id: "m", fonts: ["font"] }, metricHost());
  const measured = base.applyTextMetrics({ prepared, requestToken: "current" });
  for (const child of Object.values(measured.children)) {
    assert.equal(child.materializationConfigs.textMetrics.schemaVersion, 2);
    assert.equal(child.semanticSpec.resources.find(resource => resource.kind === "font").options.expectedHash, expectedHash);
  }
  assert.doesNotThrow(() => serializeProgram(measured));
  const other = await withFont(title(), { metricsProviderVersion: "other@1" });
  assert.throws(() => measured.replaceCompositionChild({ target: "a", program: other }), /conflicts/);
});

test("shape and ambiguity failures run no host work and saved profiles validate font identity", async () => {
  const base = await withFont(title()); let calls = 0;
  const host = metricHost({ decode: () => { calls++; } });
  for (const fonts of [[], ["font", "font"], ["missing"], Array(65).fill("font")]) {
    await assert.rejects(prepareTextMetrics(base, { id: "m", fonts }, host));
  }
  await assert.rejects(prepareTextMetrics(base, { id: "m", get fonts() { calls++; return ["font"]; } }, host), /accessors/);
  assert.equal(calls, 0);
  const measured = base.applyTextMetrics({ prepared: await prepareTextMetrics(base, { id: "m", fonts: ["font"] }, metricHost()), requestToken: "current" });
  const profile = measured.materializationConfigs.textMetrics;
  for (const change of [{ resource: { ...profile.fonts[0].resource, revision: 1 } }, { identity: { ...profile.fonts[0].identity, contentHash: "a".repeat(64) } }]) {
    const invalid = measured._withMaterializationConfig(["textMetrics"], { ...profile, fonts: [{ ...profile.fonts[0], ...change }] });
    assert.throws(() => serializeProgram(invalid), /stale|identity/);
  }
  const invalidGraphics = structuredClone(measured.graphicSpec);
  invalidGraphics.objects.chartTitle.items[0].properties.font.metricsProviderVersion = "stale-provider@1";
  assert.throws(() => serializeProgram(measured._clone({ graphicSpec: invalidGraphics })), /Concrete font is stale/);
});

test("prepared metric application cannot be dispatched through a parent target", async () => {
  const child = await withFont(title());
  const parent = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: title() }] });
  const exactChild = parent.children.a;
  const prepared = await prepareTextMetrics(exactChild, { id: "child-metrics", fonts: ["font"] }, metricHost());
  const before = serializeProgram(parent);
  for (const target of [{ childPath: ["a"] }, [{ childPath: ["a"] }]]) {
    assert.throws(() => parent.applyTextMetrics({ target, prepared, requestToken: "current" }), /prepared.*target|target.*prepared/i);
  }
  assert.equal(serializeProgram(parent), before);
  const revisedChild = exactChild.applyTextMetrics({ prepared, requestToken: "current" });
  assert.equal(parent.replaceCompositionChild({ target: "a", program: revisedChild }).children.a.materializationConfigs.textMetrics.schemaVersion, 2);
  const legacy = parent.applyTextMetrics({ target: { childPath: ["a"] }, profile: { schemaVersion: 1, id: "legacy", measurements: [] } });
  assert.equal(legacy.children.a.materializationConfigs.textMetrics.schemaVersion, 1);
});

test("resource requests preflight identity, class, tokens and revision limits before loading", async () => {
  const base = await withFont(); let calls = 0;
  const host = nativeHost({ load() { calls++; throw new Error("Unexpected load"); } });
  await assert.rejects(prepareFontResource(basic(), request(), host), /font-authoring/);
  for (const change of [{ kind: "unknown" }, { target: "font" }, { kind: "replace", target: "font" }, { id: "" }]) {
    await assert.rejects(prepareFontResource(chart(), request(change), host));
  }
  await assert.rejects(prepareFontResource(base, request(), host), error => error.assetCode === "duplicate-id");
  for (const requestToken of [undefined, ""]) await assert.rejects(prepareFontResource(chart(), request(), { ...host, requestToken }), /requestToken/);
  const resource = { ...base.semanticSpec.resources[0], revision: Number.MAX_SAFE_INTEGER };
  const exhausted = base._clone({ semanticSpec: { ...base.semanticSpec, resources: [resource] } });
  const replacement = request({ kind: "replace", target: "font" }); delete replacement.id;
  await assert.rejects(prepareFontResource(exhausted, replacement, host), /revision limit/);
  const prepared = await prepareFontResource(chart(), request(), nativeHost());
  assert.throws(() => base.replaceFontResource({ prepared, requestToken: "current" }), error => error.assetCode === "stale-result");
  assert.throws(() => base.applyTextMetrics({ prepared: {}, requestToken: "current" }), /authentic/);
  assert.equal(calls, 0);
});

test("delayed font loading and aborted application preserve the fallback program", async () => {
  const base = title(), before = serializeProgram(base), controller = new AbortController();
  let started, finish;
  const entered = new Promise(resolve => { started = resolve; });
  const pending = prepareFontResource(base, request(), nativeHost({ signal: controller.signal,
    load() { started(); return new Promise(resolve => { finish = resolve; }); } }));
  await entered;
  assert.equal(serializeProgram(base), before);
  const revised = base.editTitle({ text: "BA" });
  finish({ bytes, mimeType: "font/ttf" });
  const prepared = await pending;
  assert.throws(() => revised.createFontResource({ prepared, requestToken: "current" }), error => error.assetCode === "stale-result");
  controller.abort();
  assert.throws(() => base.createFontResource({ prepared, requestToken: "current" }), error => error.assetCode === "aborted");
  assert.equal(serializeProgram(base), before);
});

test("unwrapped long labels use bounded query batches and still require exact measured widths", async () => {
  const text = "AB".repeat(256);
  const base = await withFont(chart().createCanvas({ width: 8000, height: 350, margin: 80 })
    .createTitle({ text, titleStyle: { fontFamily: family, fontSize: 20, fontWeight: 400 } }));
  const host = metricHost(), batches = [];
  const prepared = await prepareTextMetrics(base, { id: "long", fonts: ["font"] }, { ...host,
    measure(value) { batches.push(value.queries.map(query => query.text)); return host.measure(value); } });
  const measured = base.applyTextMetrics({ prepared, requestToken: "current" });
  assert.deepEqual(batches, [[text, ""]]);
  assert.equal(measured.materializationConfigs.textMetrics.measurements.find(query => query.text === text).width, 7168);
  assert.equal(measured.graphicSpec.objects.chartTitle.properties.text, text);
});

test("query work limits and missing host capabilities fail before measurement callbacks", async () => {
  const base = await withFont(title()); let calls = 0;
  for (const change of [{ decode: null }, { measure: null }]) {
    await assert.rejects(prepareTextMetrics(base, { id: "m", fonts: ["font"] }, metricHost(change)), /callbacks/);
  }
  const long = await withFont(chart().createCanvas({ width: 30_000_000, height: 350, margin: 80 })
    .createTitle({ text: "A".repeat(1048577), titleStyle: { fontFamily: family, fontSize: 20, fontWeight: 400 } }));
  await assert.rejects(prepareTextMetrics(long, { id: "m", fonts: ["font"] }, metricHost({ measure() { calls++; } })), /query closure.*budget/);
  assert.equal(calls, 0);
});
