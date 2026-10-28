import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareImageRendering, render } from "../../../src/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { validateImagePayload, imagePayloadBytes } from "../../../src/grammar/imagePayload.js";
import { createMockCanvasContext } from "../../support/canvas.js";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="10" height="10" fill="#ff0000"/><rect x="10" width="10" height="10" fill="#0000ff"/></svg>';
const bytes = Buffer.from(svg);
const image = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml", byteLength: bytes.length,
  width: 20, height: 10, payload: { encoding: "base64", data: bytes.toString("base64") } };
function program(payload = image) { return { graphicSpec: { objects: {
  canvas: { type: "canvas", properties: { width: 60, height: 40, background: "white" } },
  image: { type: "image", properties: { image: payload, x: 10, y: 10, width: 40, height: 20, opacity: 0.5 } }
}, order: ["canvas", "image"] } }; }
const fake = { image: {}, width: 20, height: 10, originClean: true };
const native = { decode: async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; } };
const code = expected => error => error.assetCode === expected;

// Literal colors are independent of the renderer and PNG/SVG implementation.
test("renders retained bytes in Canvas, SVG, PNG and PDF and restores a graphic offline", async () => {
  const p = program();
  const images = await prepareImageRendering(p, native);
  const canvas = createCanvas(1, 1);
  render(p, canvas.getContext("2d"), { images });
  assert.deepEqual([...canvas.getContext("2d").getImageData(20, 20, 1, 1).data], [255, 127, 127, 255]);
  assert.deepEqual([...canvas.getContext("2d").getImageData(40, 20, 1, 1).data], [127, 127, 255, 255]);
  const output = renderToSVG(p);
  assert.match(output, /<image /); assert.ok(output.includes(`data:image/svg+xml;base64,${image.payload.data}`));
  const png = await renderToPNGBuffer(p), pdf = await renderToPDFBuffer(p);
  assert.deepEqual(png.buffer, await canvas.encode("png"));
  assert.equal(Buffer.from(pdf.buffer).subarray(0, 4).toString(), "%PDF");
  const restored = deserializeGraphic(serializeGraphic(p));
  assert.equal(renderToSVG(restored), output);
  assert.deepEqual((await renderToPNGBuffer(restored)).buffer, png.buffer);
  assert.throws(() => render(restored, canvas.getContext("2d"), { images }), code("stale-result"));
});

test("preflights authentic handles, exact graphic identity, dimensions and decoder availability before clearing", async () => {
  const p = program(), context = createMockCanvasContext();
  const before = structuredClone(context.canvas);
  assert.throws(() => render(p, context), code("preparation-required"));
  assert.throws(() => render(p, context, { images: {} }), /authentic/);
  const images = await prepareImageRendering(p, { decode: () => fake });
  assert.throws(() => render(program(), context, { images }), code("stale-result"));
  assert.throws(() => render(p, context, { images }), /drawImage/);
  context.drawImage = () => { throw new Error("not expected"); };
  delete p.graphicSpec.objects.image.properties.width;
  assert.throws(() => render(p, context, { images }), /finite|requires/);
  assert.equal(context.calls.length, 0); assert.deepEqual(context.canvas, before);
});

test("deduplicates by content hash and rejects inconsistent metadata before the first decode", async () => {
  const p = program(); p.graphicSpec.objects.image.items = [{ properties: { ...p.graphicSpec.objects.image.properties } }, { properties: { ...p.graphicSpec.objects.image.properties } }];
  let calls = 0;
  const images = await prepareImageRendering(p, { decode: request => { calls++; request.bytes.fill(0); return fake; } });
  assert.equal(images.imageCount, 1); assert.equal(calls, 1);
  assert.deepEqual(imagePayloadBytes(image), new Uint8Array(bytes));
  p.graphicSpec.objects.image.items[0].properties.image = { ...image, width: 21 };
  await assert.rejects(prepareImageRendering(p, { decode: () => { calls++; return fake; } }), /inconsistent/);
  assert.equal(calls, 1);
});

test("checks the unique cumulative pixel budget before callbacks and does not count repeats", async () => {
  const p = program({ ...image, width: 8192, height: 8192 });
  let calls = 0;
  p.graphicSpec.objects.second = { type: "image", properties: { ...p.graphicSpec.objects.image.properties } };
  p.graphicSpec.order.push("second");
  const ready = await prepareImageRendering(p, { decode: () => { calls++; return { ...fake, width: 8192, height: 8192 }; } });
  assert.equal(ready.imageCount, 1); assert.equal(calls, 1);
  const otherBytes = Buffer.from(svg.replace("#ff0000", "#00ff00"));
  p.graphicSpec.objects.second.properties.image = { ...image, contentHash: createHash("sha256").update(otherBytes).digest("hex"),
    payload: { encoding: "base64", data: otherBytes.toString("base64") } };
  await assert.rejects(prepareImageRendering(p, { decode: () => { calls++; return fake; } }), code("render-budget"));
  assert.equal(calls, 1);
});

test("rejects malformed or changed bytes, unsupported MIME, dimensions and unsafe SVG offline", () => {
  for (const value of [undefined, { ...image, extra: true }, { ...image, width: 0 }, { ...image, width: Infinity },
    { ...image, byteLength: image.byteLength + 1 }, { ...image, byteLength: 0 }, { ...image, byteLength: 16 * 1024 * 1024 + 1 }, { ...image, mimeType: "image/gif" },
    { ...image, contentHash: "0".repeat(64) }, { ...image, payload: { encoding: "base64", data: image.payload.data.slice(0, -1) + "!" } },
    { ...image, payload: { encoding: "uri", data: "https://example.invalid/image" } }]) assert.throws(() => validateImagePayload(value));
  const unsafe = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
  assert.throws(() => validateImagePayload({ ...image, contentHash: createHash("sha256").update(unsafe).digest("hex"),
    byteLength: unsafe.length, payload: { encoding: "base64", data: unsafe.toString("base64") } }), /Unsafe or unsupported SVG/);
  const p = program(); delete p.graphicSpec.objects.image.properties.image;
  assert.throws(() => serializeGraphic(p), /requires/);
});

test("validates host own fields and decoded metadata without executing accessors", async () => {
  let calls = 0;
  await assert.rejects(prepareImageRendering(program(), { get decode() { calls++; return () => fake; } }), /accessors/);
  for (const decode of [() => ({ ...fake, width: 19 }), () => ({ ...fake, image: null }), () => ({ ...fake, originClean: false }),
    () => ({ ...fake, extra: true }), () => ({ ...fake, get image() { calls++; return {}; } })]) await assert.rejects(prepareImageRendering(program(), { decode }));
  Object.defineProperty(Object.prototype, "decode", { configurable: true, value: () => { calls++; return fake; } });
  try { await assert.rejects(prepareImageRendering(program(), {}), /callback/); }
  finally { delete Object.prototype.decode; }
  assert.equal(calls, 0);
});

test("rejects abort before callbacks, during decode and when applying a prepared handle", async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(prepareImageRendering(program(), { signal: controller.signal, decode: () => { calls++; return fake; } }), code("aborted"));
  assert.equal(calls, 0);
  const pending = new AbortController(); let started;
  const ready = new Promise(resolve => { started = resolve; });
  const p = prepareImageRendering(program(), { signal: pending.signal, decode: () => { started(); return new Promise(() => {}); } });
  await ready; pending.abort(); await assert.rejects(p, code("aborted"));
  const current = program(), after = new AbortController();
  const images = await prepareImageRendering(current, { signal: after.signal, decode: () => fake });
  after.abort(); const context = createMockCanvasContext();
  assert.throws(() => render(current, context, { images }), code("aborted")); assert.equal(context.calls.length, 0);
});

test("prepares exact Canvas scenes, preserves offline payloads, and rejects changed mutable frames", async () => {
  const { createTransitionScene, renderTransitionScene } = await import("../../../src/scene.js");
  const p = program(), scene = createTransitionScene(p, { format: "canvas" });
  assert.equal(scene.nodes[1].type, "image");
  assert.deepEqual(scene.nodes[1].properties.image, image);
  const images = await prepareImageRendering(scene, native), canvas = createCanvas(1, 1);
  renderTransitionScene(scene, canvas.getContext("2d"), { images });
  assert.deepEqual(await canvas.encode("png"), (await renderToPNGBuffer(p)).buffer);
  const mutable = structuredClone(scene), prepared = await prepareImageRendering(mutable, native);
  renderTransitionScene(mutable, canvas.getContext("2d"), { images: prepared });
  mutable.nodes[1].properties.x += 1;
  const context = createMockCanvasContext(); context.drawImage = () => {};
  assert.throws(() => renderTransitionScene(mutable, context, { images: prepared }), code("stale-result"));
  assert.equal(context.calls.length, 0);
  const restored = deserializeGraphic(serializeGraphic(p));
  assert.deepEqual(createTransitionScene(restored, { format: "canvas" }), scene);
  assert.ok(createTransitionScene(restored).nodes.some(node => node.svg.includes("data:image/svg+xml;base64,")));
});


test("prepared image scenes retain explicit path clips through the shared compiler", async () => {
  const { createTransitionScene, renderTransitionScene } = await import("../../../src/scene.js");
  const p = program();
  p.graphicSpec.objects.image.clip = { type: "path", commands: [{ op: "M", x: 4, y: 3 }, { op: "L", x: 25, y: 3 }, { op: "L", x: 25, y: 25 }, { op: "Z" }] };
  const scene = createTransitionScene(p, { format: "canvas" }), images = await prepareImageRendering(scene, native);
  const canvas = createCanvas(1, 1); renderTransitionScene(scene, canvas.getContext("2d"), { images });
  assert.deepEqual(canvas.toBuffer("image/png"), (await renderToPNGBuffer(p)).buffer);
});

test("prepared scenes translate path commands with the same origin as retained images", async () => {
  const { renderTransitionScene } = await import("../../../src/scene.js");
  const scene = { version: 2, width: 60, height: 40, nodes: [
    { key: "image", type: "image", clip: [0, 0, 60, 40], offset: [0, 0],
      properties: { image, x: 10, y: 10, width: 40, height: 20 } },
    { key: "path", type: "path", clip: [0, 0, 60, 40], offset: [4, 3], properties: {
      commands: [{ op: "M", x: 10, y: 10 }, { op: "C", x1: 10, y1: 10, x2: 18, y2: 10, x: 18, y: 10 },
        { op: "L", x: 18, y: 18 }, { op: "L", x: 10, y: 18 }, { op: "Z" }], fill: "#00ff00"
    } }
  ] };
  const images = await prepareImageRendering(scene, native), canvas = createCanvas(1, 1);
  renderTransitionScene(scene, canvas.getContext("2d"), { images });
  const pixels = canvas.getContext("2d");
  assert.deepEqual([...pixels.getImageData(17, 16, 1, 1).data], [0, 255, 0, 255]);
  assert.deepEqual([...pixels.getImageData(11, 11, 1, 1).data], [255, 0, 0, 255]);
  assert.deepEqual([...pixels.getImageData(40, 20, 1, 1).data], [0, 0, 255, 255]);
  assert.deepEqual(scene.nodes[1].properties.commands[0], { op: "M", x: 10, y: 10 });
});


test("rejects more than 64 MiB of unique retained bytes before decoder callbacks", async () => {
  const p = program();
  delete p.graphicSpec.objects.image; p.graphicSpec.order = ["canvas"];
  for (let index = 0; index < 5; index++) {
    const bytes = Buffer.alloc(13 * 1024 * 1024, index);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    const payload = {contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/png", byteLength: bytes.length,
      width: 1, height: 1, payload: {encoding: "base64", data: bytes.toString("base64")}};
    p.graphicSpec.objects[`image${index}`] = {type: "image", properties: {image: payload, x: 0, y: 0, width: 1, height: 1}};
    p.graphicSpec.order.push(`image${index}`);
  }
  let calls = 0;
  await assert.rejects(prepareImageRendering(p, {decode: () => {calls++; return fake;}}), code("render-budget"));
  assert.equal(calls, 0);
});


test("draws default opacity once and skips either zero destination dimension", async () => {
  for (const [width, height] of [[40, 20], [0, 20], [40, 0]]) {
    const p = program();
    Object.assign(p.graphicSpec.objects.image.properties, {width, height});
    delete p.graphicSpec.objects.image.properties.opacity;
    const images = await prepareImageRendering(p, {decode: () => fake});
    const context = createMockCanvasContext();
    context.drawImage = (...args) => context.calls.push({op: "drawImage", args, alpha: context.globalAlpha});
    render(p, context, {images});
    const calls = context.calls.filter(call => call.op === "drawImage");
    assert.equal(calls.length, width === 0 || height === 0 ? 0 : 1);
    if (calls.length) assert.equal(calls[0].alpha, 1);
  }
});

test("rejects image membership changes in a foreign graphic while decoding", async () => {
  const p = program();
  await assert.rejects(prepareImageRendering(p, {decode: () => {
    delete p.graphicSpec.objects.image; p.graphicSpec.order = ["canvas"]; return fake;
  }}), code("stale-result"));
});
