import { isOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { validateSvgImage } from "./svgImage.js";
import { ASSET_MAX_BYTES, readAssetPayloadBytes } from "./assetPayload.js";

export const IMAGE_MAX_BYTES = ASSET_MAX_BYTES;
export const IMAGE_MAX_PIXELS = 64 * 1024 * 1024;
export const IMAGE_MIME_TYPES = Object.freeze(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const validated = new WeakMap();

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(`${label} requires its exact fields.`);
  }
}

export function matchesImageMime(bytes, mimeType) {
  if (mimeType === "image/svg+xml") return true;
  if (mimeType === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (mimeType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return mimeType === "image/webp" && bytes.length >= 12 &&
    [82, 73, 70, 70].every((value, i) => bytes[i] === value) &&
    [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value);
}

export function validateImageDimensions(width, height) {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0) || width * height > IMAGE_MAX_PIXELS) {
    throw new RangeError("Image dimensions exceed the pixel budget.");
  }
}

function readBytes(image) {
  const cached = validated.get(image);
  if (cached !== undefined) return cached;
  exact(image, ["contentHash", "mimeType", "byteLength", "width", "height", "payload"], "Concrete image");
  validateImageDimensions(image.width, image.height);
  const bytes = readAssetPayloadBytes(image, IMAGE_MIME_TYPES, "Image");
  if (!matchesImageMime(bytes, image.mimeType)) throw new TypeError("Image bytes do not match their MIME.");
  if (image.mimeType === "image/svg+xml") validateSvgImage(bytes);
  if (isOwned(image)) validated.set(image, bytes);
  return bytes;
}

export function validateImagePayload(image) {
  readBytes(image);
  return image;
}

export function imagePayloadBytes(image) {
  return new Uint8Array(readBytes(image));
}
