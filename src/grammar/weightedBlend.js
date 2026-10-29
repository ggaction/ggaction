import { ownArray } from "../core/ownData.js";
import { linearLight, encodedLight } from "./linearColor.js";

export const MAX_BLEND_SOURCES = 64;
export const MAX_BLEND_ITEM_PIXELS = 1_048_576;
export const MAX_BLEND_SCENE_PIXELS = 16_777_216;
export const MAX_BLEND_PIXEL_WORK = 67_108_864;

export function validateBlendWeights(weights) {
  ownArray(weights, "Weighted blend weights");
  if (weights.length < 2 || weights.length > MAX_BLEND_SOURCES) throw new RangeError("Weighted blend requires 2..64 sources.");
  let sum = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new RangeError("Weighted blend weights must be finite and between 0 and 1.");
    sum += weight;
  }
  if (Math.abs(sum - 1) > 1e-12) throw new RangeError("Weighted blend weights must sum to 1.");
  return weights;
}

// Straight normalized sRGB input/output. All source validation precedes math.
export function weightedRGBA(colors, weights) {
  ownArray(colors, "Weighted blend colors"); validateBlendWeights(weights);
  if (colors.length !== weights.length) throw new TypeError("Weighted blend colors and weights must have equal lengths.");
  for (const color of colors) {
    ownArray(color, "Weighted blend color");
    if (color.length !== 4 || !color.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new TypeError("Weighted blend colors require four normalized RGBA channels.");
  }
  const endpoint = weights.indexOf(1);
  if (endpoint >= 0 && weights.every((weight, index) => index === endpoint || weight === 0)) return Object.freeze([...colors[endpoint]]);
  const result = [0, 0, 0, 0];
  for (let index = 0; index < colors.length; index++) {
    const color = colors[index], alpha = color[3] * weights[index];
    for (let channel = 0; channel < 3; channel++) result[channel] += linearLight(color[channel]) * alpha;
    result[3] += alpha;
  }
  if (result[3] === 0) return Object.freeze([0, 0, 0, 0]);
  return Object.freeze(result.map((value, channel) => Math.max(0, Math.min(1, channel === 3 ? value : encodedLight(value / result[3])))));
}

// Streaming raster reduction keeps only one source plus one Float64 accumulator.
const linearBytes = Float64Array.from({ length: 256 }, (_, index) => linearLight(index / 255));
export function accumulateBlendPixels(accumulator, rgba, weight) {
  if (!(accumulator instanceof Float64Array) || !(rgba instanceof Uint8ClampedArray) || accumulator.length !== rgba.length ||
      rgba.length % 4 || rgba.length > MAX_BLEND_ITEM_PIXELS * 4 || !Number.isFinite(weight) || weight < 0 || weight > 1) {
    throw new TypeError("Weighted blend pixels require equal bounded RGBA buffers and a normalized weight.");
  }
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] / 255 * weight;
    accumulator[index] += linearBytes[rgba[index]] * alpha;
    accumulator[index + 1] += linearBytes[rgba[index + 1]] * alpha;
    accumulator[index + 2] += linearBytes[rgba[index + 2]] * alpha;
    accumulator[index + 3] += alpha;
  }
}
export function encodeBlendPixels(accumulator) {
  if (!(accumulator instanceof Float64Array) || accumulator.length % 4 || accumulator.length > MAX_BLEND_ITEM_PIXELS * 4) throw new TypeError("Weighted blend accumulator exceeds its RGBA budget.");
  const rgba = new Uint8ClampedArray(accumulator.length);
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = accumulator[index + 3];
    if (![accumulator[index], accumulator[index + 1], accumulator[index + 2], alpha].every(Number.isFinite) ||
        alpha < 0 || alpha > 1 + 1e-12) throw new RangeError("Weighted blend accumulator is invalid.");
    for (let channel = 0; channel < 3; channel++) {
      const value = accumulator[index + channel];
      if (value < 0 || value > alpha + 1e-12) throw new RangeError("Weighted blend premultiplied color is invalid.");
      if (alpha > 0) rgba[index + channel] = Math.round(255 * encodedLight(Math.max(0, Math.min(1, value / alpha))));
    }
    rgba[index + 3] = Math.round(255 * Math.min(1, alpha));
  }
  return rgba;
}
