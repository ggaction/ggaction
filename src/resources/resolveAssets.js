import { cloneAndFreeze } from "../core/immutable.js";
import { validateSvgImage } from "./svgImage.js";
import { exactAssetRecord, assetError, assertAssetActive, assetHostStage, assetBase64, normalizeAssetRequest, prepareAssetBytes } from "./assetPreparation.js";

const MAX_PIXELS = 64 * 1024 * 1024;
const MIMES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function matchesMime(bytes, mimeType) {
  if (mimeType === "image/svg+xml") return true; // The complete static SVG allowlist runs before decode.
  if (mimeType === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (mimeType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12 && [82, 73, 70, 70].every((value, i) => bytes[i] === value) &&
    [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value);
}

// Private preparation kernel. No network, decoder, or backend object is implicit.
export async function prepareImageAsset(input, host) {
  const request = normalizeAssetRequest(input, [], MIMES, "Image");
  host = exactAssetRecord(host, ["load", "decode", "signal"], "Image host");
  if (typeof host.load !== "function" || typeof host.decode !== "function") throw new TypeError("Image preparation requires host load and decode callbacks.");
  const { load, decode, signal } = host;
  assertAssetActive(signal);
  const { bytes, hash } = await prepareAssetBytes(request, load, signal, matchesMime, "Image");
  if (request.mimeType === "image/svg+xml") {
    try { validateSvgImage(bytes); }
    catch (error) { throw assetError("unsafe-svg", "SVG image failed static image validation.", error); }
  }
  // The decoder receives its own copy; retained bytes cannot be changed by it.
  let dimensions = await assetHostStage(decode, Object.freeze({ bytes: new Uint8Array(bytes), mimeType: request.mimeType, maxPixels: MAX_PIXELS, ...(signal === undefined ? {} : { signal }) }), signal, "decode-error");
  assertAssetActive(signal);
  dimensions = exactAssetRecord(dimensions, ["width", "height", "originClean"], "Decoded image");
  if (![dimensions.width, dimensions.height].every(value => Number.isSafeInteger(value) && value > 0) || dimensions.width * dimensions.height > MAX_PIXELS) {
    throw assetError("dimension-limit", "Decoded image dimensions exceed the pixel budget.");
  }
  if (dimensions.originClean !== true) throw assetError("cors", "Decoded image is not origin-clean for export.");
  return cloneAndFreeze({ uri: request.uri, mimeType: request.mimeType, contentHash: hash, byteLength: bytes.length,
    width: dimensions.width, height: dimensions.height, payload: { encoding: "base64", data: assetBase64(bytes) },
    ...(Object.hasOwn(request, "license") && request.license !== undefined ? { license: request.license } : {}),
    ...(Object.hasOwn(request, "attribution") && request.attribution !== undefined ? { attribution: request.attribution } : {}) });
}
