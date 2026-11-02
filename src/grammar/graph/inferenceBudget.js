import { isPlainObject } from "../../core/immutable.js";
import { countJSONStringBytes } from "../../core/jsonText.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export const INFERENCE_MAX_WORK = 100_000_000;
export const INFERENCE_MAX_BYTES = 128 * 1024 * 1024;

export function normalizeInferenceExecution(input) {
  if (input === undefined) return undefined;
  ownRecord(input, "Graph inference execution");
  rejectUnknownProperties(input, ["policy", "maxWork", "maxBytes"], "graph inference execution");
  if (!["policy", "maxWork", "maxBytes"].every(key => Object.hasOwn(input, key)) || input.policy !== "bounded-inference@1") {
    throw new TypeError("Graph inference execution requires its explicit policy and limits.");
  }
  for (const [key, maximum] of [["maxWork", INFERENCE_MAX_WORK], ["maxBytes", INFERENCE_MAX_BYTES]]) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 1 || input[key] > maximum) {
      throw new RangeError(`Graph inference ${key} must be a positive safe integer at most ${maximum}.`);
    }
  }
  return Object.freeze({ policy: input.policy, maxWork: input.maxWork, maxBytes: input.maxBytes });
}

// Each existing owner keeps its accumulator and charge formula. An explicit
// inference policy does not change layout, graphics, route or global limits.
export function checkInferenceSignal(signal) {
  if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal);
}

export function inferenceWorkValidator(execution, signal) {
  checkInferenceSignal(signal);
  const policy = normalizeInferenceExecution(execution);
  const validate = policy === undefined ? validateWorkLimit
    : (value, label) => {
      if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a nonnegative safe integer.`);
      return validateGeneratedItemLimit(value, label, policy.maxWork);
    };
  return signal === undefined ? validate : (value, label) => { checkInferenceSignal(signal); return validate(value, label); };
}

// Exact UTF-8 length of canonicalJSON(encodeValue(value)), without allocating
// that complete representation first. Descriptors are checked before reads.
export function validateInferenceBytes(value, execution, label = "Graph inference encoded bytes") {
  const policy = normalizeInferenceExecution(execution);
  if (policy === undefined) return;
  let bytes = 0;
  const add = count => validateGeneratedItemLimit(bytes += count, label, policy.maxBytes);
  const string = text => {
    bytes += countJSONStringBytes(text, bytes, policy.maxBytes, label);
  };
  const ancestors = new Set();
  function visit(item, depth) {
    if (item === null) { add(4); return; }
    if (typeof item === "string") { string(item); return; }
    if (typeof item === "boolean") { add(item ? 4 : 5); return; }
    if (typeof item === "number") {
      add(Number.isFinite(item) && !Object.is(item, -0) ? JSON.stringify(item).length
        : JSON.stringify(["number", Object.is(item, -0) ? "-0" : String(item)]).length);
      return;
    }
    if (typeof item === "undefined") { add(13); return; }
    if (typeof item === "bigint") { add(11); string(item.toString()); return; }
    if (typeof item !== "object" || !Array.isArray(item) && !isPlainObject(item)) {
      throw new TypeError("Graph inference bytes require plain data values.");
    }
    if (depth > 64 || ancestors.has(item)) throw new TypeError("Graph inference values cannot be cyclic or exceed depth 64.");
    const array = Array.isArray(item);
    if (array) {
      validateGeneratedItemLimit(bytes + item.length, label, policy.maxBytes);
      ownArray(item, "Graph inference array", false);
    } else ownRecord(item, "Graph inference record");
    const keys = array ? undefined : Object.keys(item), length = array ? item.length : keys.length;
    add((array ? 12 : 13) + Math.max(0, length - 1));
    ancestors.add(item);
    for (let index = 0; index < length; index++) {
      if (array && !Object.hasOwn(item, index)) { add(8); continue; }
      const key = array ? index : keys[index];
      if (!array) { add(3); string(key); }
      visit(item[key], depth + 1);
    }
    ancestors.delete(item);
  }
  visit(value, 0);
  return bytes;
}
