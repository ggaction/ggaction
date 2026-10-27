import { isPlainObject } from "../core/immutable.js";
import { encodeValue, invalidSnapshot } from "../core/valueEncoding.js";
export { encodeValue, invalidSnapshot } from "../core/valueEncoding.js";

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
