import { ownRecord } from "../core/ownData.js";
import { preparedTextGlyphInput } from "./textGlyphInput.js";
import { translateFillPaint } from "../grammar/paint.js";
import { readPreparedFonts } from "./fontRendering.js";
import { drawResolvedGraphicSpec, resolveGraphicRenderTarget } from "./canvas/index.js";
import { preflightCanvasGraphicSpec } from "./canvas/native.js";
import { MAX_RASTER_DIMENSION, MAX_RASTER_PIXELS } from "./canvas/limits.js";

function closed(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} has unsupported properties.`);
  return { __proto__: null, ...value };
}

// Private host preparation for the actual fill/outline glyph source. The caller
// owns frame selection and later blur/color/compositing, including mark opacity.
// Frame coordinates are local to this exact concrete text, before ancestors.
export function prepareTextGlyphMask(program, text, frame, options) {
  frame = closed(frame, ["left", "top", "width", "height", "pixelRatio"], "Glyph frame");
  options = closed(options, ["fonts", "createCanvas"], "Glyph preparation options");
  const { left, top, width, height, pixelRatio = 1 } = frame;
  if (![left, top, width, height, pixelRatio, left + width, top + height].every(Number.isFinite) ||
      width <= 0 || height <= 0 || pixelRatio <= 0 || left + width <= left || top + height <= top) {
    throw new RangeError("Glyph frame requires finite representable bounds and positive dimensions and pixelRatio.");
  }
  const rasterWidth = Math.ceil(width * pixelRatio), rasterHeight = Math.ceil(height * pixelRatio);
  if (![rasterWidth, rasterHeight].every(value => Number.isSafeInteger(value) && value > 0 && value <= MAX_RASTER_DIMENSION) ||
      rasterWidth * rasterHeight > MAX_RASTER_PIXELS) throw new RangeError("Glyph frame exceeds its raster allocation budget.");
  if (typeof options.createCanvas !== "function") throw new TypeError("Glyph preparation requires an explicit compatible Canvas factory.");
  const { graphicSpec, properties: original, fontAliases } = preparedTextGlyphInput(program, text, options.fonts);
  const { shadow, blend, ...sourceProperties } = original;
  void shadow; void blend;
  const properties = { ...sourceProperties, x: original.x - left, y: original.y - top, opacity: 1 };
  if (properties.fill !== undefined) properties.fill = translateFillPaint(properties.fill, -left, -top);
  if (original.fillBounds) properties.fillBounds = { left: original.fillBounds.left - left, right: original.fillBounds.right - left,
    top: original.fillBounds.top - top, bottom: original.fillBounds.bottom - top };
  const source = { objects: { canvas: { type: "canvas", properties: { width, height } },
    glyph: { type: "text", properties } }, order: ["canvas", "glyph"] };
  const target = resolveGraphicRenderTarget(source);
  preflightCanvasGraphicSpec(target, pixelRatio);
  const canvas = options.createCanvas(rasterWidth, rasterHeight), context = canvas?.getContext?.("2d");
  if (canvas?.width !== rasterWidth || canvas?.height !== rasterHeight || typeof context?.getImageData !== "function") {
    throw new TypeError("Glyph Canvas factory must return the requested readable raster surface.");
  }
  readPreparedFonts(graphicSpec, options.fonts);
  context.scale(pixelRatio, pixelRatio);
  drawResolvedGraphicSpec(target, context, { createCanvas: options.createCanvas, pixelRatio, fontAliases });
  const pixels = context.getImageData(0, 0, rasterWidth, rasterHeight).data;
  if (!(pixels instanceof Uint8ClampedArray) || pixels.length !== rasterWidth * rasterHeight * 4) {
    throw new TypeError("Glyph surface returned invalid RGBA bytes.");
  }
  readPreparedFonts(graphicSpec, options.fonts);
  // Keep provider readback buffers outside the returned snapshot. Both source
  // color and mask belong to the same opacity-one drawing of the exact text.
  const rgba = new Uint8ClampedArray(pixels);
  const alpha = new Uint8Array(rasterWidth * rasterHeight);
  for (let index = 0; index < alpha.length; index++) alpha[index] = rgba[index * 4 + 3];
  return Object.freeze({ width: rasterWidth, height: rasterHeight, pixelRatio,
    origin: Object.freeze({ x: left, y: top }), alpha, rgba });
}
