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

// Bounded callers share the canonical browser-safe byte representation.
export function contentBytesBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}
