import { ownArray, ownRecord } from "../core/ownData.js";
import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { annotateError } from "../core/diagnostics.js";
import { decodeValue, encodeValue, invalidSnapshot } from "../persistence/codec.js";
import { packageVersion } from "../version.js";

export const ANIMATION_ENVELOPE_LIMITS = Object.freeze({bytes: 64 * 1024 * 1024, depth: 128, values: 1_000_000});
const keys = ["kind", "schemaVersion", "packageVersion", "payload", "digest"];
const failLimit = (name, actual) => {
  throw annotateError(new RangeError(`Animation envelope ${name} exceed its limit.`), {
    code: "resource-limit", optionPath: `animation.${name}`, limit: ANIMATION_ENVELOPE_LIMITS[name], actual
  });
};

// Private column preparation accounts disjoint retained subtrees before keeping
// another one. Their sum is a lower bound; the complete packet is still walked.
export function validateAnimationEnvelopeAllocation(physical, encoded, bytes) {
  for (const count of [physical, encoded]) {
    if (!Number.isSafeInteger(count) || count < 0 || count > ANIMATION_ENVELOPE_LIMITS.values) failLimit("values", count);
  }
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > ANIMATION_ENVELOPE_LIMITS.bytes) failLimit("bytes", bytes);
}

function textBytes(text, json = false) {
  if (text.length > ANIMATION_ENVELOPE_LIMITS.bytes) failLimit("bytes", text.length);
  let bytes = json ? 2 : 0;
  for (let index = 0; index < text.length; index++) {
    const point = text.charCodeAt(index);
    if (json && (point === 34 || point === 92)) bytes += 2;
    else if (json && point < 32) bytes += [8, 9, 10, 12, 13].includes(point) ? 2 : 6;
    else if (point < 0x80) bytes++;
    else if (point < 0x800) bytes += 2;
    else if (point >= 0xd800 && point <= 0xdbff && index + 1 < text.length &&
      text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++; }
    else if (json && point >= 0xd800 && point <= 0xdfff) bytes += 6;
    else bytes += 3;
    if (bytes > ANIMATION_ENVELOPE_LIMITS.bytes) failLimit("bytes", bytes);
  }
  return bytes;
}

// This is a budget/descriptor walk, not a second value codec. Every occurrence
// counts so a small shared DAG cannot expand without bound during serialization.
export function inspectAnimationEnvelopeValue(input, encoded, estimateEncoding = false) {
  const pending = [{value: input, depth: 0}], ancestors = new WeakSet();
  let values = 0, bytes = 0, estimatedEncodedValues = 0, estimatedEncodedBytes = 0;
  while (pending.length) {
    const {value, depth, leave} = pending.pop();
    if (leave) { ancestors.delete(value); continue; }
    if (++values > ANIMATION_ENVELOPE_LIMITS.values) failLimit("values", values);
    // One plain value gains at most four structural levels in tagged encoding.
    if (depth > (encoded ? ANIMATION_ENVELOPE_LIMITS.depth * 4 + 8 : ANIMATION_ENVELOPE_LIMITS.depth)) {
      failLimit("depth", encoded ? Math.ceil((depth - 8) / 4) : depth);
    }
    if (value !== null && typeof value === "object") {
      if (ancestors.has(value)) throw invalidSnapshot("Animation envelope cannot contain cycles.", "animation.payload");
      const array = Array.isArray(value);
      if (array) ownArray(value, "Animation envelope array", false);
      else ownRecord(value, "Animation envelope record");
      ancestors.add(value);
      pending.push({value, leave: true});
      const children = Object.entries(value);
      if (estimateEncoding) {
        estimatedEncodedValues += 3 + (array ? 0 : 2 * children.length);
        estimatedEncodedBytes += (array ? 12 : 13) + Math.max(0, array ? value.length - 1 : children.length - 1);
        if (array) {
          const holes = value.length - children.length;
          estimatedEncodedValues += 2 * holes; estimatedEncodedBytes += 8 * holes;
        } else for (const [key] of children) estimatedEncodedBytes += 3 + textBytes(key, true);
      }
      if (array) {
        values += value.length - children.length;
        if (values > ANIMATION_ENVELOPE_LIMITS.values) failLimit("values", values);
      }
      if (encoded) bytes += 2 + Math.max(0, children.length - 1);
      // Include field names in the byte/work budget, not only leaf values.
      for (let index = children.length - 1; index >= 0; index--) {
        const [key, child] = children[index];
        if (!array) bytes += textBytes(key, encoded) + (encoded ? 1 : 0);
        pending.push({value: child, depth: depth + 1});
      }
    } else if (typeof value === "string") bytes += textBytes(value, encoded);
    else if (typeof value === "bigint") bytes += textBytes(value.toString());
    else if (!["undefined", "boolean", "number"].includes(typeof value) && value !== null) {
      throw invalidSnapshot("Animation envelope requires serializable values.", "animation.payload");
    } else if (encoded) bytes += JSON.stringify(value)?.length ?? 0;
    if (estimateEncoding && (value === null || typeof value !== "object")) {
      if (value === undefined) { estimatedEncodedValues += 2; estimatedEncodedBytes += 13; }
      else if (typeof value === "bigint") { estimatedEncodedValues += 3; estimatedEncodedBytes += 11 + textBytes(value.toString(), true); }
      else if (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0))) {
        estimatedEncodedValues += 3; estimatedEncodedBytes += 11 + textBytes(Object.is(value, -0) ? "-0" : String(value), true);
      } else {
        estimatedEncodedValues++; estimatedEncodedBytes += typeof value === "string" ? textBytes(value, true) : JSON.stringify(value).length;
      }
    }
    if (bytes > ANIMATION_ENVELOPE_LIMITS.bytes) failLimit("bytes", bytes);
    if (estimatedEncodedValues > ANIMATION_ENVELOPE_LIMITS.values) failLimit("values", estimatedEncodedValues);
    if (estimatedEncodedBytes > ANIMATION_ENVELOPE_LIMITS.bytes) failLimit("bytes", estimatedEncodedBytes);
  }
  return {physicalValues:values,bytes,...(estimateEncoding ? {estimatedEncodedValues,estimatedEncodedBytes} : {})};
}

export function encodeAnimationEnvelope(payload) {
  inspectAnimationEnvelopeValue(payload, false);
  const encoded = encodeValue(payload);
  inspectAnimationEnvelopeValue(encoded, true);
  const canonical = canonicalJSON(encoded);
  textBytes(canonical);
  const result = JSON.stringify({kind: "animation", schemaVersion: 1, packageVersion,
    payload: encoded, digest: contentDigest(canonical)});
  textBytes(result);
  return result;
}

export function decodeAnimationEnvelope(text) {
  if (typeof text !== "string") throw invalidSnapshot("Animation envelope must be a JSON string.", "animation");
  textBytes(text);
  let envelope;
  try { envelope = JSON.parse(text); } catch { throw invalidSnapshot("Animation envelope must be valid JSON.", "animation"); }
  inspectAnimationEnvelopeValue(envelope, true);
  ownRecord(envelope, "Animation envelope");
  if (Object.keys(envelope).length !== keys.length || keys.some(key => !Object.hasOwn(envelope, key)) ||
    envelope.kind !== "animation" || envelope.schemaVersion !== 1) {
    throw invalidSnapshot("Unsupported animation envelope schema or fields.", "animation");
  }
  if (typeof envelope.packageVersion !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(envelope.packageVersion)) {
    throw invalidSnapshot("Invalid animation package version.", "animation.packageVersion");
  }
  if (typeof envelope.digest !== "string" || !/^[0-9a-f]{64}$/.test(envelope.digest) ||
    contentDigest(canonicalJSON(envelope.payload)) !== envelope.digest) {
    throw invalidSnapshot("Animation envelope payload digest does not match.", "animation.digest");
  }
  const payload = decodeValue(envelope.payload);
  inspectAnimationEnvelopeValue(payload, false);
  return payload;
}
