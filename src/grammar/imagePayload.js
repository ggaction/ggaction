import { contentBytesDigest } from "../core/contentDigest.js";
import { isOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { validateSvgImage } from "./svgImage.js";

export const IMAGE_MAX_BYTES = 16 * 1024 * 1024;
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
  if (!IMAGE_MIME_TYPES.includes(image.mimeType)) throw new TypeError("Unsupported image MIME.");
  if (typeof image.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(image.contentHash)) throw new TypeError("Image requires a lowercase SHA256 content hash.");
  validateImageDimensions(image.width, image.height);
  if (!Number.isSafeInteger(image.byteLength) || image.byteLength < 1 || image.byteLength > IMAGE_MAX_BYTES) {
    throw new RangeError("Image byte length exceeds the byte budget.");
  }
  exact(image.payload, ["encoding", "data"], "Image payload");
  const data = image.payload.data;
  if (image.payload.encoding !== "base64" || typeof data !== "string" || data.length !== Math.ceil(image.byteLength / 3) * 4 ||
      /[^A-Za-z0-9+/=]/.test(data)) {
    throw new TypeError("Image payload requires bounded canonical base64 bytes.");
  }
  let binary;
  try { binary = atob(data); }
  catch { throw new TypeError("Image payload requires canonical base64 bytes."); }
  if (binary.length !== image.byteLength || btoa(binary) !== data) throw new TypeError("Image payload does not match its canonical byte length.");
  const bytes = Uint8Array.from(binary, value => value.charCodeAt(0));
  if (!matchesImageMime(bytes, image.mimeType)) throw new TypeError("Image bytes do not match their MIME.");
  if (contentBytesDigest(bytes) !== image.contentHash) throw new Error("Image bytes do not match their content hash.");
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
