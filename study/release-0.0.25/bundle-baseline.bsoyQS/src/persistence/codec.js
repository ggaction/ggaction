import { isPlainObject } from "../core/immutable.js";
import { annotateError } from "../core/diagnostics.js";

export function invalidSnapshot(message, optionPath) {
  return annotateError(new TypeError(message), { code: "unsupported-format", optionPath });
}

export function encodeValue(value, path = "payload", ancestors = new WeakSet(), shared) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (value === undefined) return ["undefined"];
  if (typeof value === "bigint") return ["bigint", value.toString()];
  if (typeof value === "number") {
    return Number.isFinite(value) && !Object.is(value, -0) ? value
      : ["number", Object.is(value, -0) ? "-0" : String(value)];
  }
  if (typeof value !== "object") throw invalidSnapshot(`Cannot serialize ${typeof value} at ${path}.`, path);
  if (ancestors.has(value)) throw invalidSnapshot(`Cannot serialize a cycle at ${path}.`, path);
  if (!Array.isArray(value) && !isPlainObject(value)) throw invalidSnapshot(`Cannot serialize a class instance at ${path}.`, path);
  if (Object.getOwnPropertySymbols(value).length) throw invalidSnapshot(`Cannot serialize symbol keys at ${path}.`, path);
  if (shared?.seen.has(value)) return shared.seen.get(value);
  const keys = Object.getOwnPropertyNames(value);
  if (Array.isArray(value) ? keys.some(key => key !== "length" && !(/^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length)) :
      keys.some(key => !Object.getOwnPropertyDescriptor(value, key).enumerable)) {
    throw invalidSnapshot(`Cannot serialize hidden or named array properties at ${path}.`, path);
  }
  ancestors.add(value);
  const result = Array.isArray(value)
    ? ["array", Array.from({ length: value.length }, (_, index) => Object.hasOwn(value, index)
        ? encodeValue(value[index], `${path}[${index}]`, ancestors, shared) : ["hole"])]
    : ["object", Object.entries(value).map(([key, child]) => [key, encodeValue(child, `${path}.${key}`, ancestors, shared)])];
  ancestors.delete(value);
  if (shared !== undefined && Array.isArray(value) && value.length >= 32) {
    const key = JSON.stringify(result);
    let index = shared.keys.get(key);
    if (index === undefined) {
      index = shared.arrays.length;
      shared.keys.set(key, index);
      shared.arrays.push(result);
    }
    const reference = ["reference", index];
    shared.seen.set(value, reference);
    return reference;
  }
  return result;
}

export function encodeSharedValue(value) {
  const shared = { arrays: [], keys: new Map(), seen: new WeakMap() };
  const root = encodeValue(value, "payload", new WeakSet(), shared);
  return ["shared", shared.arrays, root];
}

export function decodeValue(value, path = "payload", references) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  const invalid = () => { throw invalidSnapshot(`Invalid encoded value at ${path}.`, path); };
  if (!Array.isArray(value)) return invalid();
  const [tag, payload] = value;
  if (tag === "shared" && references === undefined && value.length === 3 && Array.isArray(payload)) {
    const arrays = [];
    for (const [index, encoded] of payload.entries()) {
      if (!Array.isArray(encoded) || encoded[0] !== "array") return invalid();
      arrays.push(decodeValue(encoded, `${path}.arrays[${index}]`, arrays));
    }
    return decodeValue(value[2], path, arrays);
  }
  if (tag === "reference" && references !== undefined && value.length === 2 &&
      Number.isInteger(payload) && payload >= 0 && payload < references.length) {
    return references[payload];
  }
  if (tag === "undefined" && value.length === 1) return undefined;
  if (value.length !== 2) return invalid();
  if (tag === "bigint" && typeof payload === "string" && /^(?:0|-?[1-9]\d*)$/.test(payload)) return BigInt(payload);
  if (tag === "number" && typeof payload === "string" && ["NaN", "Infinity", "-Infinity", "-0"].includes(payload)) {
    return payload === "-0" ? -0 : Number(payload);
  }
  if (tag === "array" && Array.isArray(payload)) {
    const result = new Array(payload.length);
    payload.forEach((child, index) => {
      if (Array.isArray(child) && child.length === 1 && child[0] === "hole") return;
      result[index] = decodeValue(child, `${path}[${index}]`, references ?? []);
    });
    return result;
  }
  if (tag === "object" && Array.isArray(payload)) {
    const result = {};
    for (const entry of payload) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || Object.hasOwn(result, entry[0])) return invalid();
      Object.defineProperty(result, entry[0], {
        value: decodeValue(entry[1], `${path}.${entry[0]}`, references ?? []), enumerable: true, writable: true, configurable: true
      });
    }
    return result;
  }
  return invalid();
}
