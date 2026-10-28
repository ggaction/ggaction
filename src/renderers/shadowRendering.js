import { ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { contentBytesBase64, contentBytesDigest } from "../core/contentDigest.js";
import { encodeRGBA8PNG } from "../core/pngEncoding.js";
import { assertAssetActive, assetError } from "../core/assetHost.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { compositeShadowPixels } from "../grammar/shadowComposite.js";
import { resolvePrimitiveGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { validateImagePayload } from "../grammar/imagePayload.js";
import { canvasSceneProgram } from "./canvasScene.js";
import { drawResolvedGraphicSpec, requireProgramGraphicSpec, resolveGraphicRenderTarget } from "./canvas/index.js";
import { preflightCanvasGraphicSpec } from "./canvas/native.js";
import { walkGraphicPaintItems } from "./paintFrames.js";
import { planShadowFrame } from "./shadowFrames.js";
import { createPreparedShadowHandle, shadowGraphicDigest, shadowGraphicItems } from "./shadowState.js";
import { prepareImageRendering, readPreparedImages } from "./imageRendering.js";
import { measureTextInkBounds } from "./textInkBounds.js";
import { prepareTextGlyphMask } from "./textGlyphMask.js";

const OPTIONS = ["createCanvas", "decode", "fonts", "pixelRatio", "signal"];
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PIXELS = 16_777_216;

function sourcePixels(item, plan, createCanvas) {
  const { shadow, blend, opacity, ...properties } = item.object.properties;
  void shadow; void blend; void opacity;
  const width = plan.composite.blur.sourceWidth, height = plan.composite.blur.sourceHeight;
  const canvas = createCanvas(width, height), context = canvas?.getContext?.("2d");
  if (canvas?.width !== width || canvas?.height !== height || typeof context?.getImageData !== "function") {
    throw new TypeError("Shadow Canvas factory must return the requested readable raster surface.");
  }
  const source = { objects: { canvas: { type: "canvas", properties: { width: plan.width, height: plan.height } },
    glyph: { type: item.type, properties: { ...properties, opacity: 1 } } }, order: ["canvas", "glyph"] };
  context.scale(plan.pixelRatio, plan.pixelRatio);
  context.translate(-plan.left, -plan.top);
  drawResolvedGraphicSpec(resolveGraphicRenderTarget(source), context, { createCanvas, pixelRatio: plan.pixelRatio });
  const rgba = context.getImageData(0, 0, width, height).data;
  if (!(rgba instanceof Uint8ClampedArray) || rgba.length !== width * height * 4) throw new TypeError("Shadow surface returned invalid RGBA bytes.");
  return Array.from(rgba);
}

export async function prepareShadowRendering(program, options) {
  ownRecord(options, "Shadow rendering options");
  if (Object.keys(options).some(key => !OPTIONS.includes(key))) throw new TypeError("Shadow rendering options contain unsupported properties.");
  options = { __proto__: null, ...options };
  const { createCanvas, decode, pixelRatio = 1, signal } = options;
  if (typeof createCanvas !== "function") throw new TypeError("Shadow rendering requires an explicit Canvas factory.");
  if (decode !== undefined && typeof decode !== "function") throw new TypeError("Shadow decode must be a function.");
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) throw new RangeError("Shadow pixelRatio must be positive and finite.");
  assertAssetActive(signal, "Shadow");
  const scene = program?.version === 2 && Array.isArray(program.nodes) ? program : undefined;
  const resolved = scene === undefined ? program : canvasSceneProgram(scene);
  const graphicSpec = requireProgramGraphicSpec(resolved), digest = shadowGraphicDigest(graphicSpec);
  const items = shadowGraphicItems(graphicSpec), target = resolveGraphicRenderTarget(graphicSpec);
  preflightCanvasGraphicSpec(target, pixelRatio);
  const plans = new Map();
  let work = 0, pixels = 0, bytes = 0;
  walkGraphicPaintItems(target, (id, object, type, frame) => {
    if (!items.has(id)) return;
    const bounds = type === "text" ? measureTextInkBounds(resolved, object, { fonts: options.fonts, createCanvas })
      : resolvePrimitiveGraphicBounds(type, object.properties);
    if (!bounds && type === "text") { plans.set(id, undefined); return; }
    if (!bounds) throw new TypeError(`Graphic "${id}" requires finite shadow source bounds.`);
    const plan = planShadowFrame(bounds, frame, object.properties.shadow, pixelRatio);
    plans.set(id, plan);
    if (!plan) return;
    work += plan.composite.work;
    pixels += plan.composite.width * plan.composite.height;
    bytes += plan.composite.rgbaBytes;
    validateWorkLimit(work, "Shadow scene work");
    validateGeneratedItemLimit(pixels, "Shadow scene pixels", MAX_PIXELS);
    validateGeneratedItemLimit(bytes, "Shadow scene RGBA bytes", MAX_BYTES);
  });
  const glyphs = new Map(), objects = Object.create(null), order = [];
  // All resolved source frames and aggregate work limits precede raster callbacks.
  for (const [id, plan] of plans) {
    assertAssetActive(signal, "Shadow");
    if (!plan) { glyphs.set(id, { empty: true }); continue; }
    const item = items.get(id);
    const rgba = item.type === "text"
      ? Array.from(prepareTextGlyphMask(resolved, item.object, { left: plan.left, top: plan.top,
        width: plan.width, height: plan.height, pixelRatio }, { fonts: options.fonts, createCanvas }).rgba)
      : sourcePixels(item, plan, createCanvas);
    const composite = compositeShadowPixels(rgba, { width: plan.composite.blur.sourceWidth, height: plan.composite.blur.sourceHeight,
      pixelRatio, ...item.object.properties.shadow });
    const png = encodeRGBA8PNG({ width: composite.width, height: composite.height, rgba: composite.rgba });
    const payload = cloneAndFreeze({ contentHash: contentBytesDigest(png), mimeType: "image/png", byteLength: png.length,
      width: composite.width, height: composite.height, payload: { encoding: "base64", data: contentBytesBase64(png) } });
    validateImagePayload(payload);
    const glyph = { x: plan.left + composite.bounds.x, y: plan.top + composite.bounds.y,
      width: composite.bounds.width, height: composite.bounds.height, payload };
    glyphs.set(id, glyph);
    objects[id] = { type: "image", properties: { image: payload, x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height } };
    order.push(id);
  }
  if (decode !== undefined && order.length) {
    const lowered = { graphicSpec: { objects, order } };
    const images = readPreparedImages(lowered.graphicSpec, await prepareImageRendering(lowered, { decode, signal }));
    for (const glyph of glyphs.values()) if (!glyph.empty) glyph.image = images.get(glyph.payload.contentHash).image;
  }
  assertAssetActive(signal, "Shadow");
  const current = scene === undefined ? graphicSpec : canvasSceneProgram(scene).graphicSpec;
  if (current !== graphicSpec || shadowGraphicDigest(current) !== digest) throw assetError("stale-result", "Shadow inputs changed during preparation.", undefined, "Shadow");
  return createPreparedShadowHandle(graphicSpec, digest, glyphs, pixelRatio, signal);
}
