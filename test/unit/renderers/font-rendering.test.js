import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getEventListeners } from "node:events";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { prepareFontRendering, render } from "../../../src/index.js";
import { prepareFontRendering as basicPrepare } from "../../../src/basic.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { nativeFontRegistrar, prepareNativeFonts } from "../../../src/renderers/nativeBackend.js";
import { fontRenderAlias } from "../../../src/renderers/fonts.js";
import { prepareTextGlyphMask } from "../../../src/renderers/textGlyphMask.js";

const bytes = readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url));
const font = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf", byteLength: bytes.length,
  family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1",
  payload: { encoding: "base64", data: bytes.toString("base64") } };
const identity = request => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, request[key]]));
const program = () => ({ graphicSpec: { objects: {
  canvas: { type: "canvas", properties: { width: 100, height: 80, background: "white" } },
  text: { type: "text", properties: { x: 20, y: 50, text: "AB", fill: "#ff0000", fontSize: 20,
    fontFamily: font.family, fontWeight: 400, textAlign: "left", textBaseline: "alphabetic", font } }
}, order: ["canvas", "text"] } });
const native = { register: async request => {
  const key = GlobalFonts.register(request.bytes, request.family); assert.ok(key);
  return { ...identity(request), dispose() { assert.equal(GlobalFonts.remove(key), true); } };
} };
const code = expected => error => error.assetCode === expected;

test("actual embedded glyphs match literal interior geometry in Canvas and PNG and restore offline", async () => {
  const p = program(), fonts = await prepareFontRendering(p, native), canvas = createCanvas(1, 1);
  try {
    assert.equal(fonts.fontCount, 1);
    render(p, canvas.getContext("2d"), { fonts });
    // A occupies x=21..31, B x=33..47, both y=36..50, independently
    // derived from the fixture's 1000-unit em and rectangle coordinates.
    for (const x of [23, 37, 45]) assert.deepEqual([...canvas.getContext("2d").getImageData(x, 42, 1, 1).data], [255, 0, 0, 255]);
    for (const [x, y] of [[32, 42], [48, 42], [23, 34]]) assert.deepEqual([...canvas.getContext("2d").getImageData(x, y, 1, 1).data], [255, 255, 255, 255]);
    const png = await renderToPNGBuffer(p);
    assert.deepEqual(png.buffer, await canvas.encode("png"));
    const restored = deserializeGraphic(serializeGraphic(p));
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, png.buffer);
    assert.equal(basicPrepare, prepareFontRendering);
    const pdf = await renderToPDFBuffer(restored);
    assert.equal(Buffer.from(pdf.buffer).subarray(0, 4).toString(), "%PDF");
  } finally { fonts.dispose(); }
});

test("SVG and SVG scenes embed bytes under content-addressed aliases", () => {
  const p = program(), svg = renderToSVG(p);
  assert.match(svg, /@font-face\{font-family:"ggaction-font-[a-f0-9]{64}"/);
  assert.ok(svg.includes(`data:font/ttf;base64,${font.payload.data}`));
  assert.doesNotMatch(svg, /font-family="ggaction Metric Fixture"/);
  const scene = createTransitionScene(p);
  assert.ok(scene.definitions.includes(font.payload.data));
  assert.match(scene.nodes.find(node => node.type === "text").svg, /font-family="ggaction-font-/);
});

test("authentic font preparation rejects stale, mutable and disposed inputs before clearing", async () => {
  const p = program(), context = createMockCanvasContext(), before = structuredClone(context.canvas);
  assert.throws(() => render(p, context), code("preparation-required"));
  assert.throws(() => render(p, context, { fonts: {} }), /authentic/);
  let disposed = 0;
  const fonts = await prepareFontRendering(p, { register: request => ({ ...identity(request), dispose() { disposed++; } }) });
  assert.throws(() => render(program(), context, { fonts }), code("stale-result"));
  p.graphicSpec.objects.text.properties.x = 25;
  assert.throws(() => render(p, context, { fonts }), code("stale-result"));
  fonts.dispose(); fonts.dispose(); assert.equal(disposed, 1);
  assert.throws(() => render(p, context, { fonts }), code("disposed"));
  assert.equal(context.calls.length, 0); assert.deepEqual(context.canvas, before);
});

test("Canvas scene preparation shares concrete endpoints and rejects post-prepare mutations", async () => {
  const p = program(), scene = createTransitionScene(p, { format: "canvas" }), canvas = createCanvas(1, 1);
  const fonts = await prepareFontRendering(scene, native);
  try {
    renderTransitionScene(scene, canvas.getContext("2d"), { fonts });
    assert.deepEqual(await canvas.encode("png"), (await renderToPNGBuffer(p)).buffer);
  } finally { fonts.dispose(); }
  const mutable = structuredClone(scene), prepared = await prepareFontRendering(mutable, native), context = createMockCanvasContext();
  try {
    mutable.nodes.find(node => node.type === "text").properties.text = "BA";
    assert.throws(() => renderTransitionScene(mutable, context, { fonts: prepared }), code("stale-result"));
    assert.equal(context.calls.length, 0);
  } finally { prepared.dispose(); }
});

test("invalid receipts and later registration failure dispose every acquired font", async () => {
  let disposed = 0;
  await assert.rejects(prepareFontRendering(program(), { register: request => ({ ...identity(request), family: "fallback",
    dispose() { disposed++; } }) }), code("font-identity-mismatch"));
  assert.equal(disposed, 1);
  const p = program();
  p.graphicSpec.objects.text.items = [{ properties: p.graphicSpec.objects.text.properties },
    { properties: { ...p.graphicSpec.objects.text.properties, font: { ...font, family: "Other" }, fontFamily: "Other" } }];
  let calls = 0;
  await assert.rejects(prepareFontRendering(p, { register: request => {
    if (++calls === 2) throw new Error("unavailable");
    return { ...identity(request), dispose() { disposed++; } };
  } }), code("register-error"));
  assert.equal(disposed, 2);
});

test("abort disposes active and late registrations without leaking listeners", async () => {
  const controller = new AbortController(); let disposed = 0;
  const fonts = await prepareFontRendering(program(), { signal: controller.signal,
    register: request => ({ ...identity(request), dispose() { disposed++; } }) });
  controller.abort(); fonts.dispose(); assert.equal(disposed, 1);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  const lateController = new AbortController(); let finish, started;
  const entered = new Promise(resolve => { started = resolve; });
  const pending = prepareFontRendering(program(), { signal: lateController.signal, register: request => {
    started(); return new Promise(resolve => { finish = () => resolve({ ...identity(request), dispose() { disposed++; } }); });
  } });
  await entered; lateController.abort(); await assert.rejects(pending, code("aborted")); finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(disposed, 2); assert.equal(getEventListeners(lateController.signal, "abort").length, 0);
});

test("native output retains an exact prepared alias until its last drawing lease ends", async () => {
  const p = program(), fonts = await prepareFontRendering(p, native);
  const first = await prepareNativeFonts(p, GlobalFonts), second = await prepareNativeFonts(p, GlobalFonts);
  fonts.dispose();
  const canvas = createCanvas(1, 1);
  render(p, canvas.getContext("2d"), { fonts: first });
  first.dispose();
  render(p, canvas.getContext("2d"), { fonts: second });
  assert.deepEqual([...canvas.getContext("2d").getImageData(23, 42, 1, 1).data], [255, 0, 0, 255]);
  second.dispose();
  assert.equal(GlobalFonts.families.some(entry => entry.family === fontRenderAlias(font)), false);
});

test("native output failures release their own registrations and preserve a caller lease", async () => {
  const p = program(), fonts = await prepareFontRendering(p, native);
  try {
    await assert.rejects(renderToPNGBuffer(p, { pixelRatio: 0 }), /pixelRatio/);
    const canvas = createCanvas(1, 1);
    render(p, canvas.getContext("2d"), { fonts });
    assert.deepEqual([...canvas.getContext("2d").getImageData(45, 42, 1, 1).data], [255, 0, 0, 255]);
  } finally { fonts.dispose(); }
  await assert.rejects(renderToPNGBuffer(program(), { pixelRatio: 0 }), /pixelRatio/);
  assert.equal(GlobalFonts.families.some(entry => entry.family === fontRenderAlias(font)), false);
});

test("foreign graphic accessors are rejected without callbacks or reads", async () => {
  const p = program(); let calls = 0;
  Object.defineProperty(p.graphicSpec.objects.text.properties, "text", { enumerable: true, get() { calls++; return "AB"; } });
  await assert.rejects(prepareFontRendering(p, { register() { calls++; } }), /accessors/);
  assert.equal(calls, 0);
});

test("one native adapter safely shares both public-first and output-first registration order", async () => {
  for (const publicFirst of [false, true]) {
    const p = program(), host = { register: nativeFontRegistrar(GlobalFonts) };
    const first = publicFirst ? await prepareFontRendering(p, host) : await prepareNativeFonts(p, GlobalFonts);
    const second = publicFirst ? await prepareNativeFonts(p, GlobalFonts) : await prepareFontRendering(p, host);
    first.dispose();
    const canvas = createCanvas(1, 1);
    render(p, canvas.getContext("2d"), { fonts: second });
    assert.deepEqual([...canvas.getContext("2d").getImageData(45, 42, 1, 1).data], [255, 0, 0, 255]);
    const [png, pdf] = await Promise.all([renderToPNGBuffer(p), renderToPDFBuffer(p)]);
    assert.ok(png.bytes > 0 && pdf.bytes > 0);
    render(p, canvas.getContext("2d"), { fonts: second });
    assert.deepEqual([...canvas.getContext("2d").getImageData(23, 42, 1, 1).data], [255, 0, 0, 255]);
    second.dispose();
    assert.equal(GlobalFonts.families.some(entry => entry.family === fontRenderAlias(font)), false);
  }
});

test("native leases retain identical bytes shared by distinct provider aliases", async () => {
  const firstProgram = program(), secondProgram = program();
  secondProgram.graphicSpec.objects.text.properties.font = { ...font, metricsProviderVersion: "fixture@2" };
  const first = await prepareNativeFonts(firstProgram, GlobalFonts);
  const second = await prepareNativeFonts(secondProgram, GlobalFonts);
  first.dispose();
  const canvas = createCanvas(1, 1);
  render(secondProgram, canvas.getContext("2d"), { fonts: second });
  assert.deepEqual([...canvas.getContext("2d").getImageData(45, 42, 1, 1).data], [255, 0, 0, 255]);
  second.dispose();
  for (const p of [firstProgram, secondProgram]) {
    assert.equal(GlobalFonts.families.some(entry => entry.family === fontRenderAlias(p.graphicSpec.objects.text.properties.font)), false);
  }
});

test("glyph masks preserve literal glyph holes, multiline origins, rotation and source opacity", async () => {
  for (const rotation of [0, Math.PI / 2]) {
    const p = program(), text = p.graphicSpec.objects.text;
    Object.assign(text.properties, { rotation, opacity: 0.2, lines: [{ text: "AB", x: 0, y: 0 }, { text: "A", x: 0, y: 20 }] });
    const fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
    try {
      const mask = prepareTextGlyphMask(p, text, { left: 0, top: 0, width: 100, height: 80, pixelRatio: 2 }, { fonts, createCanvas });
      assert.deepEqual([mask.width, mask.height, mask.origin.x, mask.origin.y], [200, 160, 0, 0]);
      const at = (x, y) => mask.alpha[y * 2 * mask.width + x * 2];
      if (rotation === 0) {
        assert.equal(at(23, 42), 255); assert.equal(at(32, 42), 0); assert.equal(at(23, 62), 255);
      } else {
        assert.equal(at(28, 53), 255); assert.equal(at(28, 62), 0); assert.equal(at(8, 53), 255);
      }
      assert.equal(text.properties.opacity, 0.2);
    } finally { fonts.dispose(); }
  }
});

test("glyph preparation checks budgets, exact membership, mutation and disposal before allocating", async () => {
  const p = program(), text = p.graphicSpec.objects.text, fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
  let calls = 0;
  const options = { fonts, createCanvas() { calls++; throw new Error("Unexpected allocation"); } };
  const frame = { left: 0, top: 0, width: 100, height: 80 };
  assert.throws(() => prepareTextGlyphMask(p, { ...text }, frame, options), /exact/);
  for (const change of [{ width: 1e100 }, { pixelRatio: Infinity }, { width: 5000, height: 5000 }, { left: Number.MAX_VALUE }]) {
    assert.throws(() => prepareTextGlyphMask(p, text, { ...frame, ...change }, options), /budget|bounds/);
  }
  text.properties.x++;
  assert.throws(() => prepareTextGlyphMask(p, text, frame, options), code("stale-result"));
  fonts.dispose();
  assert.throws(() => prepareTextGlyphMask(p, text, frame, options), code("disposed"));
  assert.equal(calls, 0);
});

test("font preparation validates empty inputs and malformed registrations without invoking accessors", async () => {
  let calls = 0;
  const empty = { graphicSpec: { objects: {}, order: [] } };
  const fonts = await prepareFontRendering(empty, { register() { calls++; } });
  assert.equal(fonts.fontCount, 0); fonts.dispose();
  for (const host of [{ register: null }, { register() {}, extra: true }]) {
    await assert.rejects(prepareFontRendering(program(), host), /register|unsupported/);
  }
  await assert.rejects(prepareFontRendering({}, { register() { calls++; } }), /graphicSpec/);
  await assert.rejects(prepareFontRendering(program(), { register: request => ({ ...identity(request),
    get dispose() { calls++; return () => {}; } }) }), /accessors/);
  assert.equal(calls, 0);
});

test("failed font disposal stays observable after explicit and abort-triggered cleanup", async () => {
  for (const abort of [false, true]) {
    const controller = new AbortController(), failure = new Error("Host cleanup failed");
    const fonts = await prepareFontRendering(program(), { signal: controller.signal,
      register: request => ({ ...identity(request), dispose() { throw failure; } }) });
    if (abort) controller.abort();
    for (let attempt = 0; attempt < 2; attempt++) {
      assert.throws(() => fonts.dispose(), error => error instanceof AggregateError && error.errors.includes(failure));
    }
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  }
  const p = program(); let calls = 0;
  p.graphicSpec.objects.text.items = [{ properties: p.graphicSpec.objects.text.properties },
    { type: "text", properties: { ...p.graphicSpec.objects.text.properties, font: { ...font, family: "Other" }, fontFamily: "Other" } }];
  await assert.rejects(prepareFontRendering(p, { register: request => {
    if (++calls === 2) throw new Error("Second registration failed");
    return { ...identity(request), dispose() { throw new Error("Cleanup failed"); } };
  } }), error => error instanceof AggregateError && error.errors.length === 2);
});

test("glyph masks reject invalid surfaces, raster bytes and excessive text before retaining output", async () => {
  const p = program(), text = p.graphicSpec.objects.text, frame = { left: 0, top: 0, width: 100, height: 80 };
  const fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
  try {
    assert.throws(() => prepareTextGlyphMask(p, text, frame, { fonts, createCanvas: null }), /factory/);
    assert.throws(() => prepareTextGlyphMask(p, text, frame, { fonts, createCanvas: () => null }), /readable/);
    assert.throws(() => prepareTextGlyphMask(p, text, frame, { fonts, createCanvas(width, height) {
      const canvas = createCanvas(width, height), context = canvas.getContext("2d");
      context.getImageData = () => ({ data: new Uint8Array(width * height * 4) }); return canvas;
    } }), /RGBA/);
    const mask = prepareTextGlyphMask(p, text, frame, { fonts, createCanvas });
    assert.equal(mask.alpha[42 * 100 + 23], 255);
  } finally { fonts.dispose(); }
  const big = program(); big.graphicSpec.objects.text.properties.text = "A".repeat(1048577);
  const prepared = await prepareFontRendering(big, { register: request => ({ ...identity(request), dispose() {} }) });
  try {
    assert.throws(() => prepareTextGlyphMask(big, big.graphicSpec.objects.text, frame, { fonts: prepared,
      createCanvas() { throw new Error("Should not allocate"); } }), /work budget/);
  } finally { prepared.dispose(); }
});

test("font traversal deduplicates exact faces and rejects excess identities before registration", async () => {
  const p = program(), properties = p.graphicSpec.objects.text.properties;
  p.graphicSpec.objects.text.items = [{ properties }, { type: "text", properties: { ...properties, x: 25 } }];
  let calls = 0;
  const host = { register: request => { calls++; return { ...identity(request), dispose() {} }; } };
  const prepared = await prepareFontRendering(p, host); assert.equal(prepared.fontCount, 1); prepared.dispose();
  p.graphicSpec.objects.text.items = Array.from({ length: 65 }, (_, index) => ({ properties: { ...properties,
    fontFamily: `Face ${index}`, font: { ...font, family: `Face ${index}` } } }));
  await assert.rejects(prepareFontRendering(p, host), /unique font budget/);
  assert.equal(calls, 1);
});

test("glyph preparation accepts exact collection items and retains local fill bounds", async () => {
  const p = program(), properties = p.graphicSpec.objects.text.properties;
  properties.fillBounds = { left: 20, top: 36, right: 48, bottom: 50 };
  const item = { properties };
  p.graphicSpec.objects.text.items = [item];
  const fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
  try {
    const mask = prepareTextGlyphMask(p, item, { left: 20, top: 30, width: 30, height: 25 }, { fonts, createCanvas });
    assert.deepEqual(mask.origin, { x: 20, y: 30 });
    assert.equal(mask.alpha[12 * 30 + 3], 255);
  } finally { fonts.dispose(); }
});

test("glyph RGBA and alpha snapshot the same source before the provider reuses its readback buffer", async () => {
  const p = program(), text = p.graphicSpec.objects.text, fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
  let providerPixels;
  try {
    const mask = prepareTextGlyphMask(p, text, { left: 0, top: 0, width: 100, height: 80 }, { fonts,
      createCanvas(width, height) {
        const canvas = createCanvas(width, height), context = canvas.getContext("2d"), original = context.getImageData.bind(context);
        context.getImageData = (...args) => { const image = original(...args); providerPixels = image.data; return image; }; return canvas;
      } });
    const index = 42 * 100 + 23;
    assert.deepEqual([...mask.rgba.subarray(index * 4, index * 4 + 4)], [255, 0, 0, 255]);
    assert.equal(mask.alpha[index], mask.rgba[index * 4 + 3]);
    providerPixels.fill(0);
    assert.deepEqual([...mask.rgba.subarray(index * 4, index * 4 + 4)], [255, 0, 0, 255]);
    mask.rgba.fill(0); assert.equal(mask.alpha[index], 255);
  } finally { fonts.dispose(); }
});
