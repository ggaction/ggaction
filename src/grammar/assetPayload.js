import { contentBytesDigest } from "../core/contentDigest.js";
import { ownRecord } from "../core/ownData.js";

export const ASSET_MAX_BYTES = 16 * 1024 * 1024;

// Shared encoded-byte proof. Asset owners still validate their complete shape,
// MIME signature and domain fields before retaining an owned-value cache.
export function readAssetPayloadBytes(asset, mimeTypes, label) {
  if (!mimeTypes.includes(asset.mimeType)) throw new TypeError(`Unsupported ${label.toLowerCase()} MIME.`);
  if (typeof asset.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(asset.contentHash)) {
    throw new TypeError(`${label} requires a lowercase SHA256 content hash.`);
  }
  if (!Number.isSafeInteger(asset.byteLength) || asset.byteLength < 1 || asset.byteLength > ASSET_MAX_BYTES) {
    throw new RangeError(`${label} byte length exceeds the byte budget.`);
  }
  ownRecord(asset.payload, `${label} payload`);
  if (Object.keys(asset.payload).length !== 2 || !Object.hasOwn(asset.payload, "encoding") || !Object.hasOwn(asset.payload, "data")) {
    throw new TypeError(`${label} payload requires its exact fields.`);
  }
  const data = asset.payload.data;
  if (asset.payload.encoding !== "base64" || typeof data !== "string" || data.length !== Math.ceil(asset.byteLength / 3) * 4 ||
      /[^A-Za-z0-9+/=]/.test(data)) {
    throw new TypeError(`${label} payload requires bounded canonical base64 bytes.`);
  }
  let binary;
  try { binary = atob(data); }
  catch { throw new TypeError(`${label} payload requires canonical base64 bytes.`); }
  if (binary.length !== asset.byteLength || btoa(binary) !== data) {
    throw new TypeError(`${label} payload does not match its canonical byte length.`);
  }
  const bytes = Uint8Array.from(binary, value => value.charCodeAt(0));
  if (contentBytesDigest(bytes) !== asset.contentHash) throw new Error(`${label} bytes do not match their content hash.`);
  return bytes;
}
