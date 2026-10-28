import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { prepareFontRendering, render } from "../../../src/index.js";
import { nativeFontRegistrar } from "../../../src/renderers/nativeBackend.js";
import { prepareShadowRendering } from "../../../src/renderers/shadowRendering.js";
import { measureTextInkBounds } from "../../../src/renderers/textInkBounds.js";
import { prepareTextGlyphMask } from "../../../src/renderers/textGlyphMask.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../src/renderers/pdf.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";

const bytes = readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url));
const font = { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf", byteLength: bytes.length,
  family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1",
  payload: { encoding: "base64", data: bytes.toString("base64") } };
function program(patch = {}) {
  return { graphicSpec: { objects: { canvas: { type: "canvas", properties: { width: 100, height: 100 } },
    text: { type: "text", properties: { x: 20, y: 40, text: "AB", fill: "#ff0000", fontSize: 20,
      fontFamily: font.family, fontWeight: 400, textAlign: "left", textBaseline: "alphabetic", font,
      shadow: { color: "blue", offsetX: 0, offsetY: 20, blurRadius: 0 }, ...patch } } }, order: ["canvas", "text"] } };
}
const prepare = p => prepareFontRendering(p, { register: nativeFontRegistrar(GlobalFonts) });
const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
const pixel = (context, x, y) => [...context.getImageData(x, y, 1, 1).data];

test("ink measurement uses literal embedded outlines and each authored line origin under rotation", async () => {
  for (const rotation of [0, Math.PI / 2]) {
    const p = program({ rotation, lines: [{ text: "AB", x: 0, y: 0 }, { text: "A", x: 5, y: 20 }] });
    const fonts = await prepare(p);
    try {
      const bounds = measureTextInkBounds(p, p.graphicSpec.objects.text, { fonts, createCanvas });
      const expected = rotation === 0 ? { left: 21, right: 47, top: 26, bottom: 60 } : { left: 0, right: 34, top: 41, bottom: 67 };
      for (const key of Object.keys(expected)) assert.ok(Math.abs(bounds[key] - expected[key]) < 2e-5, `${key}: ${bounds[key]}`);
    } finally { fonts.dispose(); }
  }
});

test("Text shadow preserves actual glyph holes and source opacity with one shared Canvas/PNG payload", async () => {
  const p = program({ opacity: .5 }), snapshot = JSON.stringify(p), fonts = await prepare(p);
  const shadows = await prepareShadowRendering(p, { fonts, createCanvas, decode });
  try {
    const canvas = createCanvas(1,1), context = canvas.getContext("2d");
    render(p, context, { fonts, shadows });
    assert.deepEqual(pixel(context, 23, 32), [255,0,0,128]);
    assert.deepEqual(pixel(context, 32, 32), [0,0,0,0]);
    assert.deepEqual(pixel(context, 23, 52), [0,0,255,128]);
    assert.deepEqual(pixel(context, 32, 52), [0,0,0,0]);
    const png = await renderToPNGBuffer(p);
    assert.deepEqual(png.buffer, await canvas.encode("png"));
    assert.deepEqual((await renderToPNGBuffer(deserializeGraphic(serializeGraphic(p)))).buffer, png.buffer);
    assert.equal(Buffer.from((await renderToPDFBuffer(p)).buffer).subarray(0,4).toString(), "%PDF");
    assert.equal(JSON.stringify(p), snapshot);
  } finally { shadows.dispose(); fonts.dispose(); }
});

test("Text source extraction retains outline while stripping shadow, blend and overall opacity", async () => {
  const p = program({ opacity: .1, blend: "multiply", outline: { color: "green", width: 4 }, lineJoin: "round" });
  const fonts = await prepare(p);
  try {
    const bounds = measureTextInkBounds(p, p.graphicSpec.objects.text, { fonts, createCanvas });
    assert.ok(Math.abs(bounds.right - 49) < 2e-5);
    assert.deepEqual({ ...bounds, right: 49 }, { left: 19, right: 49, top: 24, bottom: 42 });
    const mask = prepareTextGlyphMask(p, p.graphicSpec.objects.text, { left: 0, top: 0, width: 100, height: 100 }, { fonts, createCanvas });
    const at = (x,y) => [...mask.rgba.slice((y*100+x)*4,(y*100+x)*4+4)];
    assert.deepEqual(at(23,32), [255,0,0,255]);
    assert.deepEqual(at(20,32), [0,128,0,255]);
    assert.deepEqual(at(23,52), [0,0,0,0]);
  } finally { fonts.dispose(); }
});

test("empty text creates no substitute rectangle or raster allocation", async () => {
  const p = program({ text: "" }), fonts = await prepare(p); let allocations = 0;
  const factory = (w,h) => { if (w !== 1 || h !== 1) allocations++; return createCanvas(w,h); };
  try {
    assert.equal(measureTextInkBounds(p, p.graphicSpec.objects.text, { fonts, createCanvas: factory }), undefined);
    const shadows = await prepareShadowRendering(p, { fonts, createCanvas: factory, decode });
    try { const canvas = createCanvas(1,1); render(p,canvas.getContext("2d"),{fonts,shadows}); assert.equal(pixel(canvas.getContext("2d"),23,32)[3],0); }
    finally { shadows.dispose(); }
    assert.equal(allocations,0);
  } finally { fonts.dispose(); }
});

test("ink preparation rejects unsupported metrics, stale fonts, foreign text and invalid hosts before large allocations", async () => {
  const p = program(), fonts = await prepare(p), text = p.graphicSpec.objects.text;
  try {
    for (const options of [{ fonts }, { fonts, createCanvas, extra: 1 }, { fonts, createCanvas: () => null }]) {
      assert.throws(() => measureTextInkBounds(p, text, options), /factory|unsupported|measuring/);
    }
    assert.throws(() => measureTextInkBounds(p, { ...text }, { fonts, createCanvas }), /exact/);
    for (const metrics of [{}, { actualBoundingBoxLeft: NaN, actualBoundingBoxRight: 1, actualBoundingBoxAscent: 1, actualBoundingBoxDescent: 1 }]) {
      assert.throws(() => measureTextInkBounds(p,text,{fonts,createCanvas: () => ({width:1,height:1,getContext:()=>({measureText:()=>metrics})})}), /ink metrics/);
    }
    const unbound = program(); delete unbound.graphicSpec.objects.text.properties.font;
    await assert.rejects(prepareShadowRendering(unbound,{createCanvas,decode}), /font-bound/);
    p.graphicSpec.objects.text.properties.text = "BA";
    assert.throws(() => measureTextInkBounds(p, text, { fonts, createCanvas }), /changed/);
  } finally { fonts.dispose(); }
});


test("zero-advance combining ink outside the line origin remains in the source and shadow", async () => {
  const p=program({text:"\u0301"}),fonts=await prepare(p);
  try {
    const b=measureTextInkBounds(p,p.graphicSpec.objects.text,{fonts,createCanvas});
    assert.ok(Math.abs(b.left-16)<2e-5 && Math.abs(b.right-18)<2e-5);
    // This host reports vertical ink on its hinted pixel grid; the declared
    // 740..820 font-unit outline must stay inside that at-most-one-pixel expansion.
    assert.ok(b.top<=23.6 && b.top>22.6 && b.bottom>=25.2 && b.bottom<26.2);
    const shadows=await prepareShadowRendering(p,{fonts,createCanvas,decode});
    try { const canvas=createCanvas(1,1);render(p,canvas.getContext("2d"),{fonts,shadows});
      assert.ok(pixel(canvas.getContext("2d"),16,24)[0]>200);
      assert.ok(pixel(canvas.getContext("2d"),16,44)[2]>200);
      assert.deepEqual(pixel(canvas.getContext("2d"),23,32),[0,0,0,0]);
    } finally { shadows.dispose(); }
  } finally { fonts.dispose(); }
});

test("transparent pattern gaps remain absent from the actual glyph shadow", async () => {
  const fill={type:"pattern",style:"vertical",pitch:12,strokeWidth:2,phase:[0,0],origin:{x:0,y:0},foreground:"red",background:"transparent"};
  const p=program({fill,fillBounds:{left:20,right:48,top:20,bottom:40}}),fonts=await prepare(p);
  try {
    const shadows=await prepareShadowRendering(p,{fonts,createCanvas,decode});
    try {const canvas=createCanvas(1,1);render(p,canvas.getContext("2d"),{fonts,shadows});const context=canvas.getContext("2d");
      const source=pixel(context,24,32),behind=pixel(context,24,52);
      assert.deepEqual(source.slice(0,3),[255,0,0]);assert.ok(source[3]>0);
      assert.deepEqual(behind,[0,0,255,source[3]],"Shadow retains the exact antialiased pattern alpha");
      assert.deepEqual(pixel(context,28,32),[0,0,0,0]);
      assert.deepEqual(pixel(context,28,52),[0,0,0,0]);
    } finally {shadows.dispose();}
  } finally {fonts.dispose();}
});
