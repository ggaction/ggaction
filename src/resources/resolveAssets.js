import { contentBytesDigest, copyContentBytes } from "../core/contentDigest.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { validateSvgImage } from "./svgImage.js";

const MAX_BYTES = 16 * 1024 * 1024;
const MAX_PIXELS = 64 * 1024 * 1024;
const MIMES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
}

function assetError(code, message, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.name = code === "aborted" ? "AbortError" : "ImageAssetError";
  Object.defineProperty(error, "assetCode", { value: code, enumerable: true });
  return error;
}

function aborted(signal) {
  if (signal === undefined) return false;
  return Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get.call(signal);
}

function assertActive(signal) {
  if (aborted(signal)) throw assetError("aborted", "Image preparation was aborted.");
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
function hostStage(callback, request, signal, code) {
  assertActive(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action, value) => {
      if (settled) return;
      settled = true;
      if (signal) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      action(value);
    };
    const onAbort = () => finish(reject, assetError("aborted", "Image preparation was aborted."));
    if (signal) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
    Promise.resolve().then(() => {
      assertActive(signal);
      return callback(request);
    }).then(value => {
      if (aborted(signal)) onAbort(); else finish(resolve, value);
    }, error => {
      if (aborted(signal)) onAbort();
      else finish(reject, assetError(isSecurityError(error) ? "cors" : code, `Image ${code} failed.`, error));
    });
  });
}

function matchesMime(bytes, mimeType) {
  if (mimeType === "image/svg+xml") return true; // The complete static SVG allowlist runs before decode.
  if (mimeType === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
  if (mimeType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12 && [82, 73, 70, 70].every((value, i) => bytes[i] === value) &&
    [87, 69, 66, 80].every((value, i) => bytes[i + 8] === value);
}

function base64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

// Private preparation kernel. No network, decoder, or backend object is implicit.
export async function prepareImageAsset(input, host) {
  exact(input, ["uri", "expectedHash", "mimeType", "maxBytes", "license", "attribution"], "Image request");
  exact(host, ["load", "decode", "signal"], "Image host");
  if (typeof input.uri !== "string" || !input.uri.trim()) throw new TypeError("Image URI must be a nonempty string.");
  if (typeof input.expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(input.expectedHash)) throw new TypeError("Image expectedHash must be a lowercase SHA256 digest.");
  if (!MIMES.includes(input.mimeType)) throw assetError("unsupported-format", "Image MIME must be image/png, image/jpeg, image/webp, or image/svg+xml.");
  const maxBytes = input.maxBytes === undefined ? MAX_BYTES : input.maxBytes;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_BYTES) throw new RangeError(`Image maxBytes must be in [1, ${MAX_BYTES}].`);
  for (const key of ["license", "attribution"]) if (input[key] !== undefined && typeof input[key] !== "string") throw new TypeError(`Image ${key} must be text.`);
  if (typeof host.load !== "function" || typeof host.decode !== "function") throw new TypeError("Image preparation requires host load and decode callbacks.");
  const { load, decode, signal } = host;
  assertActive(signal);
  const request = cloneAndFreeze({ ...input, maxBytes });
  const response = await hostStage(load, Object.freeze({ ...request, ...(signal === undefined ? {} : { signal }) }), signal, "load-error");
  assertActive(signal);
  exact(response, ["bytes", "mimeType"], "Image response");
  if (!(response.bytes instanceof Uint8Array)) throw new TypeError("Image response bytes must be Uint8Array.");
  let bytes;
  try { bytes = copyContentBytes(response.bytes, maxBytes); }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    throw assetError("byte-limit", "Image response exceeds maxBytes.");
  }
  if (bytes.length === 0) throw assetError("byte-limit", "Image response is empty.");
  if (response.mimeType !== request.mimeType || !matchesMime(bytes, request.mimeType)) throw assetError("mime-mismatch", "Image bytes do not match the requested MIME.");
  const hash = contentBytesDigest(bytes);
  if (hash !== request.expectedHash) throw assetError("hash-mismatch", "Image content hash does not match expectedHash.");
  if (request.mimeType === "image/svg+xml") {
    try { validateSvgImage(bytes); }
    catch (error) { throw assetError("unsafe-svg", "SVG image failed static image validation.", error); }
  }
  // The decoder receives its own copy; retained bytes cannot be changed by it.
  const dimensions = await hostStage(decode, Object.freeze({ bytes: new Uint8Array(bytes), mimeType: request.mimeType, maxPixels: MAX_PIXELS, ...(signal === undefined ? {} : { signal }) }), signal, "decode-error");
  assertActive(signal);
  exact(dimensions, ["width", "height", "originClean"], "Decoded image");
  if (![dimensions.width, dimensions.height].every(value => Number.isSafeInteger(value) && value > 0) || dimensions.width * dimensions.height > MAX_PIXELS) {
    throw assetError("dimension-limit", "Decoded image dimensions exceed the pixel budget.");
  }
  if (dimensions.originClean !== true) throw assetError("cors", "Decoded image is not origin-clean for export.");
  return cloneAndFreeze({ uri: request.uri, mimeType: request.mimeType, contentHash: hash, byteLength: bytes.length,
    width: dimensions.width, height: dimensions.height, payload: { encoding: "base64", data: base64(bytes) },
    ...(request.license === undefined ? {} : { license: request.license }),
    ...(request.attribution === undefined ? {} : { attribution: request.attribution }) });
}
