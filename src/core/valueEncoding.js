import { isPlainObject } from "./immutable.js";
import { annotateError } from "./diagnostics.js";

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

