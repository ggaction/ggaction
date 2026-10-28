import { assetError, assertAssetActive, assetHostStage } from "../core/assetHost.js";
export { assetError, assertAssetActive, assetHostStage } from "../core/assetHost.js";
import { contentBytesDigest, copyContentBytes } from "../core/contentDigest.js";

import { exactAssetRecord } from "../grammar/assetRequest.js";
export { exactAssetRecord, normalizeAssetRequest } from "../grammar/assetRequest.js";

export function assetBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}


export async function prepareAssetBytes(request, load, signal, matchesMime, kind) {
  let response = await assetHostStage(load, Object.freeze({ ...request, ...(signal === undefined ? {} : { signal }) }), signal, "load-error", kind);
  assertAssetActive(signal, kind);
  response = exactAssetRecord(response, ["bytes", "mimeType"], `${kind} response`);
  if (!(response.bytes instanceof Uint8Array)) throw new TypeError(`${kind} response bytes must be Uint8Array.`);
  let bytes;
  try { bytes = copyContentBytes(response.bytes, request.maxBytes); }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw assetError("byte-limit", `${kind} response exceeds maxBytes.`, undefined, kind);
  }
  if (bytes.length === 0) throw assetError("byte-limit", `${kind} response is empty.`, undefined, kind);
  if (response.mimeType !== request.mimeType || !matchesMime(bytes, request.mimeType)) throw assetError("mime-mismatch", `${kind} bytes do not match the requested MIME.`, undefined, kind);
  const hash = contentBytesDigest(bytes);
  if (hash !== request.expectedHash) throw assetError("hash-mismatch", `${kind} content hash does not match expectedHash.`, undefined, kind);
  return { bytes, hash };
}
