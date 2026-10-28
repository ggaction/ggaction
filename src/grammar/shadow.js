import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateKeys, validateNonNegativeFinite, validatePositiveFinite, validateWorkLimit } from "../core/validation.js";

// Private numeric buffers only; this is not a renderer allocation or public API.
export const SHADOW_LIMITS = Object.freeze({ dimension: 4096, pixels: 1_048_576, bufferBytes: 8_388_608 });

export function planShadowMask(options) {
  ownRecord(options, "Shadow mask options");
  validateKeys(options, ["width", "height", "blurRadius", "pixelRatio", "offsetX", "offsetY"], "Shadow mask");
  if (Object.values(options).some(value => value === undefined)) throw new TypeError("Shadow mask options cannot contain explicit undefined.");
  const { width, height, blurRadius = 0, pixelRatio = 1, offsetX = 0, offsetY = 0 } = options;
  for (const value of [width, height]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError("Shadow mask dimensions require positive safe integers.");
    validateGeneratedItemLimit(value, "Shadow mask dimension", SHADOW_LIMITS.dimension);
  }
  validateNonNegativeFinite(blurRadius, "Shadow blurRadius");
  validatePositiveFinite(pixelRatio, "Shadow pixelRatio");
  if (![offsetX, offsetY].every(Number.isFinite)) throw new TypeError("Shadow offsets require finite numbers.");
  const sigmaPixels = blurRadius * pixelRatio / 2;
  if (!Number.isFinite(sigmaPixels) || blurRadius > 0 && sigmaPixels === 0) throw new RangeError("Shadow pixel-space blur is not representable.");
  const padding = Math.ceil(3 * sigmaPixels), outputWidth = width + 2 * padding, outputHeight = height + 2 * padding;
  for (const value of [outputWidth, outputHeight]) validateGeneratedItemLimit(value, "Shadow output dimension", SHADOW_LIMITS.dimension);
  const pixels = outputWidth * outputHeight;
  validateGeneratedItemLimit(pixels, "Shadow output pixels", SHADOW_LIMITS.pixels);
  const taps = 2 * padding + 1, intermediatePixels = outputWidth * height;
  const work = width * height + (intermediatePixels + pixels + 2) * taps;
  validateWorkLimit(work, "Shadow convolution work");
  const bufferBytes = (taps + intermediatePixels) * Float64Array.BYTES_PER_ELEMENT + pixels;
  validateGeneratedItemLimit(bufferBytes, "Shadow numeric buffer bytes", SHADOW_LIMITS.bufferBytes);
  const x = offsetX - padding / pixelRatio, y = offsetY - padding / pixelRatio;
  const logicalWidth = outputWidth / pixelRatio, logicalHeight = outputHeight / pixelRatio;
  if (![x, y, logicalWidth, logicalHeight, x + logicalWidth, y + logicalHeight].every(Number.isFinite) ||
      !(x + logicalWidth > x) || !(y + logicalHeight > y)) throw new RangeError("Shadow bounds are not representable.");
  return Object.freeze({ sourceWidth: width, sourceHeight: height, width: outputWidth, height: outputHeight,
    pixelRatio, sigmaPixels, padding, work, bufferBytes,
    bounds: Object.freeze({ x: x === 0 ? 0 : x, y: y === 0 ? 0 : y, width: logicalWidth, height: logicalHeight }) });
}

// Alpha bytes are caller-owned inputs. The returned byte buffer is freshly owned
// by the caller too; it is not a serializable or frozen ChartProgram resource.
export function blurShadowMask(alpha, options) {
  const plan = planShadowMask(options);
  if (!Array.isArray(alpha) || alpha.length !== plan.sourceWidth * plan.sourceHeight) throw new TypeError("Shadow alpha length must match its source dimensions.");
  ownArray(alpha, "Shadow alpha");
  if (!alpha.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) throw new TypeError("Shadow alpha requires integer bytes from 0 to 255.");
  const { padding: radius, sigmaPixels: sigma, sourceWidth, sourceHeight, width, height } = plan;
  const weights = new Float64Array(2 * radius + 1);
  let total = 0;
  for (let k = -radius; k <= radius; k++) {
    const weight = k === 0 ? 1 : Math.exp(-0.5 * (k / sigma) ** 2);
    weights[k + radius] = weight; total += weight;
  }
  for (let index = 0; index < weights.length; index++) weights[index] /= total;
  const horizontal = new Float64Array(width * sourceHeight);
  for (let y = 0; y < sourceHeight; y++) for (let x = 0; x < width; x++) {
    let value = 0;
    for (let k = -radius; k <= radius; k++) {
      const sourceX = x - radius + k;
      if (sourceX >= 0 && sourceX < sourceWidth) value += alpha[y * sourceWidth + sourceX] * weights[k + radius];
    }
    horizontal[y * width + x] = value;
  }
  const output = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = 0;
    for (let k = -radius; k <= radius; k++) {
      const sourceY = y - radius + k;
      if (sourceY >= 0 && sourceY < sourceHeight) value += horizontal[sourceY * width + x] * weights[k + radius];
    }
    output[y * width + x] = Math.round(value);
  }
  return Object.freeze({ ...plan, alpha: output });
}
