import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { prepareFontRendering } from "../../../src/renderers/fontRendering.js";
import { nativeFontRegistrar } from "../../../src/renderers/nativeBackend.js";
import { prepareImageRendering } from "../../../src/renderers/imageRendering.js";
import { prepareShadowRendering } from "../../../src/renderers/shadowRendering.js";
import { render } from "../../../src/renderers/canvas/index.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svgSerialization.js";
import { serializeGraphic, deserializeGraphic, serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { ChartProgram } from "../../../src/extension.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { translateGraphic } from "../../../src/materialization/graphicTranslation.js";

const bytes = readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url));
const font = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf", byteLength: bytes.length,
  family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1",
  payload: { encoding: "base64", data: bytes.toString("base64") } };
const source = (weight, type, properties) => ({ weight, type, properties, offset: [0, 0], clip: { x: 0, y: 0, width: 80, height: 80 }, clips: [] });
const text = (value, fill) => ({ x: 20, y: 40, text: value, fill, fontSize: 20, fontFamily: font.family, fontWeight: 400,
  textAlign: "left", textBaseline: "alphabetic", font, outline: { color: "black", width: 2 },
  shadow: { color: "blue", offsetX: 0, offsetY: 20, blurRadius: 0 } });
const program = sources => ({ graphicSpec: { objects: { canvas: { type: "canvas", properties: { width: 80, height: 80 } },
  glyph: { type: "weighted-blend", properties: { sources } } }, order: ["canvas", "glyph"] } });
const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
const px = (canvas, x, y) => [...canvas.getContext("2d").getImageData(x, y, 1, 1).data];

test("retained Text font, outline and shadow sources prepare once and restore without semantic state", async () => {
  const p = program([source(.5, "text", text("A", "red")), source(.5, "text", text("AB", "red"))]);
  const restored = deserializeGraphic(serializeGraphic(p)), fonts = await prepareFontRendering(restored, { register: nativeFontRegistrar(GlobalFonts) });
  const shadows = await prepareShadowRendering(restored, { fonts, createCanvas, decode });
  try {
    assert.equal(fonts.fontCount, 1); assert.equal(shadows.glyphCount, 2);
    const c = createCanvas(1, 1);render(restored, c.getContext("2d"), { fonts, shadows });
    assert.deepEqual(px(c, 23, 32), [255, 0, 0, 255]);
    assert.deepEqual(px(c, 23, 52), [0, 0, 255, 255]);
    assert.equal(px(c, 41, 32)[3], 128);
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, await c.encode("png"));
    assert.match(renderToSVG(restored, { shadows }), /feComposite/);
    const scene = createTransitionScene(restored, { format: "canvas" });
    const sceneFonts = await prepareFontRendering(scene, { register: nativeFontRegistrar(GlobalFonts) });
    const sceneShadows = await prepareShadowRendering(scene, { fonts: sceneFonts, createCanvas, decode });
    try { const current = createCanvas(1, 1);renderTransitionScene(scene, current.getContext("2d"), { fonts: sceneFonts, shadows: sceneShadows });assert.deepEqual(await current.encode("png"), await c.encode("png")); }
    finally { sceneShadows.dispose();sceneFonts.dispose(); }
  } finally { shadows.dispose();fonts.dispose(); }
});
test("embedded images retain bytes and stale or disposed preparation cannot clear the destination", async () => {
  const imageCanvas = createCanvas(2, 2);imageCanvas.getContext("2d").fillStyle = "blue";imageCanvas.getContext("2d").fillRect(0, 0, 2, 2);
  const imageBytes = await imageCanvas.encode("png");
  const image = { contentHash: createHash("sha256").update(imageBytes).digest("hex"), mimeType: "image/png", byteLength: imageBytes.length,
    width: 2, height: 2, payload: { encoding: "base64", data: imageBytes.toString("base64") } };
  const p = program([source(.5, "rect", { x: 10, y: 10, width: 20, height: 20, fill: "red", stroke: "none", strokeWidth: 0 }),
    source(.5, "image", { image, x: 10, y: 10, width: 20, height: 20 })]);
  const images = await prepareImageRendering(p, { decode });assert.equal(images.imageCount, 1);
  const c = createCanvas(1, 1);render(p, c.getContext("2d"), { images });assert.deepEqual(px(c, 15, 15), [188, 0, 188, 255]);
  const old = await c.encode("png"), other = deserializeGraphic(serializeGraphic(p));
  assert.throws(() => render(other, c.getContext("2d"), { images }), /different/);
  assert.deepEqual(await c.encode("png"), old);
  const invalid = program([p.graphicSpec.objects.glyph.properties.sources[0], { ...p.graphicSpec.objects.glyph.properties.sources[1], weight: -1 }]);
  let callbacks = 0;await assert.rejects(prepareImageRendering(invalid, { decode() { callbacks++; } }), /weights/);assert.equal(callbacks, 0);
});
test("extension primitives and editable codec retain weighted sources and reject malformed replacement atomically", () => {
  let p = new ChartProgram().createGraphics({ id: "canvas", type: "canvas" }).editGraphics({ target: "canvas", property: "width", value: 80 }).editGraphics({ target: "canvas", property: "height", value: 80 });
  const sources = [source(.5, "text", text("A", "red")), source(.5, "text", text("B", "blue"))];
  p = p.createGraphics({ id: "item", type: "weighted-blend" }).editGraphics({ target: "item", property: "sources", value: sources });
  const previous = serializeProgram(p), snapshot = JSON.stringify(sources);
  const restored = deserializeProgram(previous);
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  assert.throws(() => p.editGraphics({ target: "item", property: "sources", value: [sources[0]] }), /2..64/);
  assert.equal(serializeProgram(p), previous);assert.equal(JSON.stringify(sources), snapshot);
  sources[0].properties.text = "changed";
  assert.equal(p.graphicSpec.objects.item.properties.sources[0].properties.text, "A");
});

test("named heterogeneous collections retain embedded font assets through translation and scenes", async () => {
  const sources = [source(.5, "text", text("A", "red")), source(.5, "text", text("AB", "red"))];
  let p = new ChartProgram().createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 100 }).editGraphics({ target: "canvas", property: "height", value: 100 })
    .createGraphics({ id: "items", type: "collection" }).editGraphics({ target: "items", property: "items", value: [
      { type: "weighted-blend", properties: { sources } }
    ] });
  const original = serializeProgram(p);
  p = translateGraphic(p, "items", 5, 7);
  assert.deepEqual(p.graphicSpec.objects.items.items[0].properties.sources[0].offset, [5, 7]);
  assert.equal(deserializeProgram(original).graphicSpec.objects.items.items[0].properties.sources[0].offset[0], 0);
  const fonts = await prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
  const shadows = await prepareShadowRendering(p, { fonts, createCanvas, decode });
  try {
    assert.equal(fonts.fontCount, 1);assert.equal(shadows.glyphCount, 2);
    const c = createCanvas(1, 1);render(p, c.getContext("2d"), { fonts, shadows });
    assert.deepEqual(px(c, 28, 39), [255, 0, 0, 255]);
    assert.match(renderToSVG(p, { shadows }), /feComposite/);
  } finally { shadows.dispose();fonts.dispose(); }
});
