import { assetError } from "../core/assetHost.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";

const MAX_BYTES = 16 * 1024 * 1024;

export function exactAssetRecord(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
  return Object.assign(Object.create(null), value);
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

