import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateKeys, validateWorkLimit } from "../core/validation.js";
import { compositeRGBA, quantizeRGBA } from "./compositing.js";
import { parsePaintColor } from "./color.js";
import { blurShadowMask, planShadowMask, SHADOW_LIMITS } from "./shadow.js";

const KEYS = ["width", "height", "blurRadius", "pixelRatio", "offsetX", "offsetY", "color"];

export function planShadowComposite(options) {
  ownRecord(options, "Shadow composite");
  validateKeys(options, KEYS, "Shadow composite");
  if (!Object.hasOwn(options, "color")) throw new TypeError("Shadow composite requires color.");
  const { color, ...geometry } = options;
  const rgba = parsePaintColor(color);
  const blur = planShadowMask(geometry);
  const ratio = blur.pixelRatio;
  const shadowX = blur.bounds.x * ratio, shadowY = blur.bounds.y * ratio;
  const left = Math.min(0, Math.floor(shadowX)), top = Math.min(0, Math.floor(shadowY));
  const right = Math.max(blur.sourceWidth, Math.ceil(shadowX + blur.width));
  const bottom = Math.max(blur.sourceHeight, Math.ceil(shadowY + blur.height));
  const width = right - left, height = bottom - top;
  for (const value of [left, top, right, bottom, width, height]) {
    if (!Number.isSafeInteger(value)) throw new RangeError("Shadow composite bounds must be safe pixel integers.");
  }
  for (const value of [width, height]) validateGeneratedItemLimit(value, "Shadow composite dimension", SHADOW_LIMITS.dimension);
  const pixels = width * height;
  validateGeneratedItemLimit(pixels, "Shadow composite pixels", SHADOW_LIMITS.pixels);
  // Four input channels, four mask samples and one RGBA composition per output.
  const work = blur.work + 4 * blur.sourceWidth * blur.sourceHeight + pixels * 9;
  validateWorkLimit(work, "Shadow composite work");
  const rgbaBytes = pixels * 4;
  validateGeneratedItemLimit(rgbaBytes, "Shadow composite RGBA bytes", SHADOW_LIMITS.bufferBytes);
  return Object.freeze({ blur, width, height, left, top, shadowX, shadowY, color: rgba, work, rgbaBytes,
    bounds: Object.freeze({ x: left / ratio, y: top / ratio, width: width / ratio, height: height / ratio }) });
}

// Both passes share the same alpha convolution and straight-alpha composition
// owners. A fractional logical offset uses bilinear sampling on the alpha grid;
// source pixels retain their original alignment. Quantization happens once after
// source-over, and mark opacity is deliberately absent from this private kernel.
export function compositeShadowPixels(rgba, options) {
  const plan = planShadowComposite(options);
  const { blur, width, height, left, top, shadowX, shadowY, color } = plan;
  ownArray(rgba, "Shadow source RGBA");
  if (rgba.length !== blur.sourceWidth * blur.sourceHeight * 4 ||
      !rgba.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new TypeError("Shadow source RGBA requires four integer bytes per source pixel.");
  }
  const alpha = Array.from({ length: blur.sourceWidth * blur.sourceHeight }, (_, i) => rgba[i * 4 + 3]);
  const { color: unused, ...geometry } = options;
  void unused;
  const mask = blurShadowMask(alpha, geometry).alpha;
  const output = new Uint8Array(width * height * 4);
  function sample(x, y) {
    return x >= 0 && y >= 0 && x < blur.width && y < blur.height ? mask[y * blur.width + x] : 0;
  }
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const x = left + column, y = top + row;
    const mx = x - shadowX, my = y - shadowY, ix = Math.floor(mx), iy = Math.floor(my);
    const fx = mx - ix, fy = my - iy;
    const maskAlpha = ((sample(ix, iy) * (1 - fx) + sample(ix + 1, iy) * fx) * (1 - fy) +
      (sample(ix, iy + 1) * (1 - fx) + sample(ix + 1, iy + 1) * fx) * fy) / 255;
    const sourceIndex = x >= 0 && y >= 0 && x < blur.sourceWidth && y < blur.sourceHeight
      ? (y * blur.sourceWidth + x) * 4 : -1;
    const source = sourceIndex < 0 ? [0, 0, 0, 0] : rgba.slice(sourceIndex, sourceIndex + 4).map(value => value / 255);
    const result = quantizeRGBA(compositeRGBA(source, [color.r, color.g, color.b, maskAlpha * color.a]));
    output.set(result, (row * width + column) * 4);
  }
  return Object.freeze({ ...plan, rgba: output });
}
