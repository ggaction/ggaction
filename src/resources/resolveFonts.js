import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { validateFontStyle } from "../core/font.js";
import { exactAssetRecord, assetError, assertAssetActive, assetHostStage, assetBase64, normalizeAssetRequest, prepareAssetBytes } from "./assetPreparation.js";

const signatures = Object.freeze({
  "font/ttf": [0, 1, 0, 0],
  "font/otf": [79, 84, 84, 79],
  "font/woff": [119, 79, 70, 70],
  "font/woff2": [119, 79, 70, 50]
});
const identityKeys = ["family", "style", "weight", "metricsProviderVersion"];
const preparedFonts = new WeakSet();
const fail = (code, message) => assetError(code, message, undefined, "Font");

function validateIdentity(request) {
  if (identityKeys.some(key => !Object.hasOwn(request, key))) throw new TypeError("Font identity requires all own fields.");
  for (const key of ["family", "metricsProviderVersion"]) {
    if (typeof request[key] !== "string" || !request[key].trim()) throw new TypeError(`Font ${key} must be a nonempty string.`);
  }
  validateFontStyle(request.style, "Font");
  if (!Number.isInteger(request.weight) || request.weight < 100 || request.weight > 900 || request.weight % 100 !== 0) {
    throw new RangeError("Font weight must be 100–900 in steps of 100.");
  }
}

// A host validates the complete font; magic bytes alone do not establish validity.
export async function prepareFontAsset(input, host) {
  const request = normalizeAssetRequest(input, identityKeys, Object.keys(signatures), "Font");
  validateIdentity(request);
  host = exactAssetRecord(host, ["load", "decode", "signal"], "Font host");
  if (typeof host.load !== "function" || typeof host.decode !== "function") throw new TypeError("Font preparation requires host load and decode callbacks.");
  const { load, decode, signal } = host;
  assertAssetActive(signal, "Font");
  const { bytes, hash } = await prepareAssetBytes(request, load, signal,
    (value, mime) => signatures[mime].every((byte, index) => value[index] === byte), "Font");
  let decoded = await assetHostStage(decode, Object.freeze({
    bytes: new Uint8Array(bytes), mimeType: request.mimeType, contentHash: hash,
    ...Object.fromEntries(identityKeys.map(key => [key, request[key]])),
    ...(signal === undefined ? {} : { signal })
  }), signal, "decode-error", "Font");
  assertAssetActive(signal, "Font");
  decoded = exactAssetRecord(decoded, ["contentHash", ...identityKeys], "Decoded font");
  if (decoded.contentHash !== hash || identityKeys.some(key => decoded[key] !== request[key])) {
    throw fail("font-identity-mismatch", "Decoded font identity does not match the requested font and metrics provider.");
  }
  const asset = cloneAndFreeze({
    uri: request.uri, mimeType: request.mimeType, contentHash: hash, byteLength: bytes.length,
    ...Object.fromEntries(identityKeys.map(key => [key, request[key]])),
    payload: { encoding: "base64", data: assetBase64(bytes) },
    ...(Object.hasOwn(request, "license") && request.license !== undefined ? { license: request.license } : {}),
    ...(Object.hasOwn(request, "attribution") && request.attribution !== undefined ? { attribution: request.attribution } : {})
  });
  preparedFonts.add(asset);
  return asset;
}

// The host returns measurements for one exact prepared font, never fallback estimates.
export async function prepareFontMeasurements(asset, queries, host) {
  if (!preparedFonts.has(asset)) throw new TypeError("Font measurements require a prepared font asset.");
  ownArray(queries, "Font measurement queries");
  if (queries.length === 0 || queries.length > 10000) throw new RangeError("Font measurement count must be in [1, 10000].");
  let textUnits = 0;
  for (const input of queries) {
    const query = exactAssetRecord(input, ["text", "fontSize"], "Font measurement query");
    if (typeof query.text !== "string" || !Number.isFinite(query.fontSize) || query.fontSize <= 0) {
      throw new TypeError("Font measurements require text and a positive finite fontSize.");
    }
    textUnits += query.text.length;
    if (textUnits > 1048576) throw new RangeError("Font measurement text exceeds the batch budget.");
  }
  host = exactAssetRecord(host, ["measure", "signal"], "Font measurement host");
  if (typeof host.measure !== "function") throw new TypeError("Font measurements require a host measure callback.");
  const { measure, signal } = host;
  assertAssetActive(signal, "Font");
  const snapshot = cloneAndFreeze(queries);
  let result = await assetHostStage(measure, Object.freeze({
    asset, queries: snapshot, ...(signal === undefined ? {} : { signal })
  }), signal, "measure-error", "Font");
  assertAssetActive(signal, "Font");
  result = exactAssetRecord(result, ["contentHash", "metricsProviderVersion", "widths"], "Font measurement result");
  if (result.contentHash !== asset.contentHash || result.metricsProviderVersion !== asset.metricsProviderVersion) {
    throw fail("font-identity-mismatch", "Measured font identity does not match the prepared font and metrics provider.");
  }
  ownArray(result.widths, "Font measurement widths");
  if (result.widths.length !== snapshot.length || result.widths.some(width => !Number.isFinite(width) || width < 0)) {
    throw fail("invalid-metrics", "Font measurements require one finite nonnegative width for every query.");
  }
  return cloneAndFreeze({
    fontIdentity: { contentHash: asset.contentHash, ...Object.fromEntries(identityKeys.map(key => [key, asset[key]])) },
    measurements: snapshot.map((query, index) => ({
      ...query, fontFamily: asset.family, fontStyle: asset.style, fontWeight: asset.weight, width: result.widths[index]
    }))
  });
}
