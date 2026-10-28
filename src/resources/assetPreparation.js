import { contentBytesDigest, copyContentBytes } from "../core/contentDigest.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";

const MAX_BYTES = 16 * 1024 * 1024;

export function exactAssetRecord(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
  return Object.assign(Object.create(null), value);
}

export function assetError(code, message, cause, kind = "Image") {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.name = code === "aborted" ? "AbortError" : `${kind}AssetError`;
  Object.defineProperty(error, "assetCode", { value: code, enumerable: true });
  return error;
}

function aborted(signal) {
  if (signal === undefined) return false;
  return Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get.call(signal);
}

export function assertAssetActive(signal, kind = "Image") {
  if (aborted(signal)) throw assetError("aborted", `${kind} preparation was aborted.`, undefined, kind);
}

function isSecurityError(error) {
  if (error === null || (typeof error !== "object" && typeof error !== "function")) return false;
  try {
    const name = Object.getOwnPropertyDescriptor(error, "name");
    if (name) return "value" in name && name.value === "SecurityError";
    return Object.getOwnPropertyDescriptor(DOMException.prototype, "name").get.call(error) === "SecurityError";
  } catch { return false; }
}

// Race each host stage and remove its listener on success, failure, or abort.
export function assetHostStage(callback, request, signal, code, kind = "Image") {
  assertAssetActive(signal, kind);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action, value) => {
      if (settled) return;
      settled = true;
      if (signal) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      action(value);
    };
    const onAbort = () => finish(reject, assetError("aborted", `${kind} preparation was aborted.`, undefined, kind));
    if (signal) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
    Promise.resolve().then(() => {
      assertAssetActive(signal, kind);
      return callback(request);
    }).then(value => {
      if (aborted(signal)) onAbort(); else finish(resolve, value);
    }, error => {
      if (aborted(signal)) onAbort();
      else finish(reject, assetError(isSecurityError(error) ? "cors" : code, `${kind} ${code} failed.`, error, kind));
    });
  });
}


export function assetBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}


export function normalizeAssetRequest(input, keys, mimes, kind) {
  input = exactAssetRecord(input, ["uri", "expectedHash", "mimeType", "maxBytes", "license", "attribution", ...keys], `${kind} request`);
  if (typeof input.uri !== "string" || !input.uri.trim()) throw new TypeError(`${kind} URI must be a nonempty string.`);
  if (typeof input.expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(input.expectedHash)) throw new TypeError(`${kind} expectedHash must be a lowercase SHA256 digest.`);
  if (!mimes.includes(input.mimeType)) throw assetError("unsupported-format", `${kind} MIME must be ${mimes.join(", ")}.`, undefined, kind);
  const maxBytes = input.maxBytes === undefined ? MAX_BYTES : input.maxBytes;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BYTES) throw new RangeError(`${kind} maxBytes must be in [1, ${MAX_BYTES}].`);
  for (const key of ["license", "attribution"]) if (input[key] !== undefined && typeof input[key] !== "string") throw new TypeError(`${kind} ${key} must be text.`);
  return cloneAndFreeze({ ...input, maxBytes });
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
