import { isPlainObject } from "./immutable.js";

// Inspect descriptors before reading values. This is a plain-data boundary,
// not a sandbox for Proxy traps or other executable host objects.
export function ownDataProperties(value, label) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof key !== "string" || !Object.hasOwn(descriptor, "value") ||
        (!descriptor.enumerable && !(Array.isArray(value) && key === "length"))) {
      throw new TypeError(`${label} requires enumerable own data properties; accessors are not supported.`);
    }
  }
  return descriptors;
}

export function ownRecord(value, label) {
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object.`);
  ownDataProperties(value, label);
  return value;
}

export function ownArray(value, label, dense = true) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${label} must be an ordinary array.`);
  }
  const descriptors = ownDataProperties(value, label);
  for (const key of Object.keys(descriptors)) {
    if (key !== "length" && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      throw new TypeError(`${label} cannot contain extra properties.`);
    }
  }
  if (dense && Object.keys(descriptors).length !== value.length + 1) {
    throw new TypeError(`${label} must be dense.`);
  }
  return value;
}
