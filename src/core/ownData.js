import { isOwned, isPlainObject } from "./immutable.js";

// An owned value is frozen, so its prototype and descriptors cannot change and a
// passed check stays valid. Each mark lives on the checked value itself (no weak
// table churn) and only this module can add or read it. Values that are not
// owned are checked on every call.
class CheckedTarget { constructor(value) { return value; } }
class RecordMark extends CheckedTarget {
  #checked;
  static add(value) { return new RecordMark(value); }
  static has(value) { return #checked in value; }
}
class ArrayMark extends CheckedTarget {
  #checked;
  static add(value) { return new ArrayMark(value); }
  static has(value) { return #checked in value; }
}
class DenseArrayMark extends CheckedTarget {
  #checked;
  static add(value) { return new DenseArrayMark(value); }
  static has(value) { return #checked in value; }
}
function remember(Mark, value) {
  if (!isOwned(value) || Mark.has(value)) return;
  try {
    // Use the result so production tree-shaking keeps the marking constructor.
    if (Mark.add(value) !== value) throw new TypeError("Check mark did not attach to its value.");
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }
}

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
  if (isOwned(value) && RecordMark.has(value)) return value;
  if (!isPlainObject(value)) throw new TypeError(`${label} must be a plain object.`);
  ownDataProperties(value, label);
  remember(RecordMark, value);
  return value;
}

export function ownArray(value, label, dense = true) {
  if (isOwned(value) && (DenseArrayMark.has(value) || !dense && ArrayMark.has(value))) return value;
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${label} must be an ordinary array.`);
  }
  const descriptors = ownDataProperties(value, label);
  for (const key of Object.keys(descriptors)) {
    if (key !== "length" && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      throw new TypeError(`${label} cannot contain extra properties.`);
    }
  }
  const isDense = Object.keys(descriptors).length === value.length + 1;
  if (dense && !isDense) {
    throw new TypeError(`${label} must be dense.`);
  }
  remember(isDense ? DenseArrayMark : ArrayMark, value);
  return value;
}
