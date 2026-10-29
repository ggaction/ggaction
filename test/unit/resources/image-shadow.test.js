import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, prepareImageResource, prepareImageRendering, prepareShadowRendering, render } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { getMarkItems } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { encodeRGBA8PNG } from "../../../src/core/pngEncoding.js";

const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
const host = { createCanvas, decode };
async function example() {
  const rgba = Array.from({ length: 6 * 6 * 4 }, (_, i) => {
    const x = Math.floor(i / 4) % 6, y = Math.floor(i / 24), ink = x >= 2 && x < 4 && y >= 2 && y < 4;
    return ink && (i % 4 === 0 || i % 4 === 3) ? 255 : 0;
  });
  const bytes = encodeRGBA8PNG({ width: 6, height: 6, rgba: new Uint8ClampedArray(rgba) }), expectedHash = createHash("sha256").update(bytes).digest("hex");
  const p = chart().createCanvas({ width: 32, height: 32, margin: 0, plotBorder: false, background: "transparent" });
  const prepared = await prepareImageResource(p, { kind: "create", id: "asset", uri: "fixture:alpha", expectedHash, mimeType: "image/png" },
    { requestToken: "image", load: () => ({ bytes, mimeType: "image/png" }), decode: () => ({ width: 6, height: 6, originClean: true }) });
  return p.createImageResource({ prepared, requestToken: "image" }).createImageMark({ viewport: { x: 4, y: 4, width: 6, height: 6 }, fit: "fill",
    shadow: { color: "blue", offsetX: 2 }, opacity: .5 });
}
const pixel = (ctx, x, y) => [...ctx.getImageData(x, y, 1, 1).data];

test("image shadows use source alpha and one opacity without inventing a rectangle mask", async () => {
  const p = await example(), snapshot = serializeProgram(p), shadows = await prepareShadowRendering(p, host), images = await prepareImageRendering(p, { decode });
  try {
    const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(p, context, { shadows, images });
    assert.deepEqual(pixel(context, 6, 6), [255, 0, 0, 128]);
    assert.deepEqual(pixel(context, 8, 6), [0, 0, 255, 128]);
    for (const point of [[4, 4], [8, 4], [9, 9]]) assert.deepEqual(pixel(context, ...point), [0, 0, 0, 0]);
    assert.deepEqual(canvas.toBuffer("image/png"), (await renderToPNGBuffer(p)).buffer);
    assert.match(renderToSVG(p, { shadows }), /data:image\/png;base64/);
    const q = deserializeProgram(snapshot).editImageMark({ shadow: false });
    assert.equal(q.graphicSpec.objects.image.items[0].properties.shadow, undefined);
    assert.equal(getMarkItems(q)[0].key, getMarkItems(p)[0].key);
    assert.equal(serializeProgram(p), snapshot);
    assert.throws(() => renderToSVG(q, { shadows }), /different|changed/);
  } finally { shadows.dispose(); }
});

test("image shadow scenes retain source bytes and reject missing decode before raster work", async () => {
  const p = await example(); let rasterCalls = 0;
  await assert.rejects(prepareShadowRendering(p, { createCanvas: (...args) => { rasterCalls++; return createCanvas(...args); } }), /decode/);
  assert.equal(rasterCalls, 0);
  const scene = createTransitionScene(p, { format: "canvas" }), shadows = await prepareShadowRendering(scene, host), images = await prepareImageRendering(scene, { decode });
  try {
    const canvas = createCanvas(1, 1); renderTransitionScene(scene, canvas.getContext("2d"), { shadows, images });
    assert.deepEqual(pixel(canvas.getContext("2d"), 8, 6), [0, 0, 255, 128]);
  } finally { shadows.dispose(); }
  assert.throws(() => p.editImageMark({ shadow: undefined }));
  assert.throws(() => p.editImageMark({ outline: { color: "red", width: 2 } }), /unsupported|unknown/i);
});
