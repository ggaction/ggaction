// Synchronous browser-safe identities; scalar block state remains private.
import { createSha256State, updateSha256, finishSha256, clearSha256 } from "./sha256.js";

export function contentDigest(text) {
  return digestBytes(new TextEncoder().encode(text));
}

export function contentBytesDigest(input) {
  return digestBytes(copyContentBytes(input));
}

function digestBytes(input) {
  const state = createSha256State();
  try {
    updateSha256(state, input);
    return finishSha256(state);
  } finally {
    clearSha256(state);
  }
}

export function copyContentBytes(input, maxBytes = Infinity) {
  if (!(input instanceof Uint8Array)) throw new TypeError("Content digest requires bytes.");
  const prototype = Object.getPrototypeOf(Uint8Array.prototype);
  const read = key => Object.getOwnPropertyDescriptor(prototype, key).get.call(input);
  const length = read("byteLength"), buffer = read("buffer"), offset = read("byteOffset");
  // Shared memory cannot provide a stable offline identity while another writer runs.
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get.call(buffer);
  if (length > maxBytes) throw new RangeError("Content bytes exceed the declared limit.");
  return new Uint8Array(new Uint8Array(buffer, offset, length));
}

export function canonicalJSON(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
}

// Exactly canonicalJSON(a) === canonicalJSON(b), without building either text.
// Members that render as nothing (undefined, functions, symbols, array holes)
// match each other only; a one-member array of them renders like an empty one.
export function sameCanonicalJSON(a, b) {
  const aObject = a !== null && typeof a === "object", bObject = b !== null && typeof b === "object";
  if (!aObject || !bObject) {
    if (aObject || bObject) return false;
    if (typeof a === "string" && typeof b === "string" || Number.isFinite(a) && Number.isFinite(b)) return a === b;
    return JSON.stringify(a) === JSON.stringify(b);
  }
  const array = Array.isArray(a);
  if (array !== Array.isArray(b)) return false;
  if (array) {
    if (a.length !== b.length) {
      const [short, long] = a.length < b.length ? [a, b] : [b, a];
      return short.length === 0 && long.length === 1 && (long[0] === null || typeof long[0] !== "object") && JSON.stringify(long[0]) === undefined;
    }
    for (let index = 0; index < a.length; index++) if (!sameCanonicalJSON(a[index], b[index])) return false;
    return true;
  }
  const keys = Object.keys(a).sort(), other = Object.keys(b).sort();
  if (keys.length !== other.length || keys.some((key, index) => key !== other[index])) return false;
  for (const key of keys) if (!sameCanonicalJSON(a[key], b[key])) return false;
  return true;
}

// Bounded callers share the canonical browser-safe byte representation.
export function contentBytesBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
