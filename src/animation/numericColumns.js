import { ownArray, ownRecord } from "../core/ownData.js";
import { contentBytesBase64 } from "../core/contentDigest.js";
import { inspectAnimationEnvelopeValue, validateAnimationEnvelopeAllocation } from "./envelopeCodec.js";

const label = "Animation numeric vector";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const sextets = new Int16Array(128).fill(-1);
for (let index = 0; index < alphabet.length; index++) sextets[alphabet.charCodeAt(index)] = index;
const sextet = (text, index) => sextets[text.charCodeAt(index)] ?? -1;

// The retained wire size is known before allocating a byte buffer or base64.
export function animationNumericVectorFootprint(length) {
  if (!Number.isSafeInteger(length) || length < 0 || !Number.isSafeInteger(length * 8)) throw new RangeError(`${label} requires a bounded safe length.`);
  const byteLength = length * 8, base64Length = 4 * Math.ceil(byteLength / 3);
  const empty = inspectAnimationEnvelopeValue({ kind: "float64-le", length, base64: "" }, false, true);
  const result = { physicalValues: empty.physicalValues, encodedValues: empty.estimatedEncodedValues, bytes: empty.estimatedEncodedBytes + base64Length };
  validateAnimationEnvelopeAllocation(result.physicalValues, result.encodedValues, result.bytes);
  return { ...result, byteLength, base64Length };
}

export function packAnimationNumericVector(values) {
  ownArray(values, label);
  const size = animationNumericVectorFootprint(values.length);
  if (!values.every(value => typeof value === "number" && Number.isFinite(value))) throw new TypeError(`${label} requires finite numbers.`);
  const bytes = new Uint8Array(size.byteLength), view = new DataView(bytes.buffer);
  for (let index = 0; index < values.length; index++) view.setFloat64(index * 8, values[index], true);
  return { kind: "float64-le", length: values.length, base64: contentBytesBase64(bytes) };
}

// This stage validates storage without allocating its expanded numeric cells.
export function inspectAnimationNumericVector(input) {
  ownRecord(input, label);
  if (Object.keys(input).length !== 3 || ["kind", "length", "base64"].some(key => !Object.hasOwn(input, key)) || input.kind !== "float64-le") throw new TypeError(`${label} has unknown fields or encoding.`);
  const { length, base64 } = input, size = animationNumericVectorFootprint(length);
  if (typeof base64 !== "string" || base64.length !== size.base64Length) throw new RangeError(`${label} byte length differs from its declaration.`);
  const padding = (3 - size.byteLength % 3) % 3, end = base64.length - padding;
  for (let index = 0; index < end; index++) if (sextet(base64, index) < 0) throw new TypeError(`${label} requires canonical base64.`);
  for (let index = end; index < base64.length; index++) if (base64[index] !== "=") throw new TypeError(`${label} requires canonical base64 padding.`);
  if (padding && (sextet(base64, end - 1) & ((1 << (padding * 2)) - 1))) throw new TypeError(`${label} has noncanonical base64 padding bits.`);
  // A fixed scratch cell avoids allocating a full decoded pool before expansion
  // preflight. It is private and never aliases caller-owned bytes or arrays.
  let scratch;
  const at = index => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) throw new RangeError(`${label} index is outside its declaration.`);
    scratch ??= new DataView(new ArrayBuffer(8));
    for (let offset = 0; offset < 8; offset++) {
      const byte = index * 8 + offset, group = Math.floor(byte / 3) * 4, part = byte % 3;
      const first = sextet(base64, group + part), next = sextet(base64, group + part + 1);
      scratch.setUint8(offset, part === 0 ? (first << 2) | (next >> 4) : part === 1 ? ((first & 15) << 4) | (next >> 2) : ((first & 3) << 6) | next);
    }
    return scratch.getFloat64(0, true);
  };
  return { length, at, validateFinite() {
    for (let index = 0; index < length; index++) if (!Number.isFinite(at(index))) throw new TypeError(`${label} contains a nonfinite value.`);
  } };
}
