// Independent reference calculations. These are not production key encodings
// or a persisted schema; callers must never depend on their token spelling.
const ORDER = ["boolean", "number", "bigint", "string", "date"];

function scalar(value) {
  if (value instanceof Date) {
    const epoch = Date.prototype.getTime.call(value);
    if (Number.isFinite(epoch)) return ["date", epoch];
  } else if (typeof value === "number") {
    if (Number.isFinite(value)) return ["number", value === 0 ? 0 : value];
  } else if (["boolean", "bigint", "string"].includes(typeof value)) {
    return [typeof value, value];
  }
  throw new TypeError("Identity keys require finite typed scalars.");
}

function parts(key) {
  if (!Array.isArray(key)) return { tuple: false, values: [scalar(key)] };
  if (key.length === 0 || key.length > 64) throw new RangeError("Reference tuple length must be 1..64.");
  if (Reflect.ownKeys(key).length !== key.length + 1) throw new TypeError("Identity tuples must be dense and plain.");
  const values = [];
  for (let i = 0; i < key.length; i++) {
    const entry = Object.getOwnPropertyDescriptor(key, String(i));
    if (!entry || !("value" in entry)) throw new TypeError("Identity tuples cannot contain holes or getters.");
    values.push(scalar(entry.value));
  }
  return { tuple: true, values };
}

export function referenceKey(key) {
  const { tuple, values } = parts(key);
  return JSON.stringify([tuple ? "tuple" : "scalar", values.map(([type, value]) =>
    [type, type === "bigint" ? String(value) : value])]);
}

export function compareReferenceKeys(left, right) {
  const a = parts(left), b = parts(right);
  // Scalar and tuple namespaces are distinct; scalars precede tuples.
  if (a.tuple !== b.tuple) return a.tuple ? 1 : -1;
  for (let i = 0; i < Math.min(a.values.length, b.values.length); i++) {
    const [at, av] = a.values[i], [bt, bv] = b.values[i];
    if (at !== bt) return ORDER.indexOf(at) - ORDER.indexOf(bt);
    if (av !== bv) return av < bv ? -1 : 1;
  }
  return a.values.length - b.values.length;
}

export function uniqueReferenceKeys(keys) {
  if (!Array.isArray(keys)) throw new TypeError("Keys must be an array.");
  const result = Array.from(keys, referenceKey);
  if (new Set(result).size !== result.length) throw new Error("Duplicate identity key.");
  return result;
}

// An explicit correspondence is an output-to-input position map, not value
// matching. Integers here are reference labels, not production row tokens.
export function referenceAllocation(previous, next, correspondence) {
  if (!Array.isArray(previous) || !Array.isArray(correspondence)) throw new TypeError("Expected arrays.");
  if (!Number.isSafeInteger(next) || next < 0) throw new RangeError("Invalid next token.");
  const old = Array.from(previous);
  if (old.some(key => !Number.isSafeInteger(key) || key < 0 || key >= next) ||
      new Set(old).size !== old.length) throw new Error("Invalid previous tokens.");
  if (correspondence.length > 10000) throw new RangeError("Reference allocation exceeds 10000 rows.");
  const used = new Set();
  let following = next;
  const keys = Array.from(correspondence, index => {
    if (index === null) {
      if (following === Number.MAX_SAFE_INTEGER) throw new RangeError("Token space exhausted.");
      return following++;
    }
    if (!Number.isSafeInteger(index) || index < 0 || index >= old.length || used.has(index)) {
      throw new Error("Correspondence must reference each existing row at most once.");
    }
    used.add(index);
    return old[index];
  });
  return { keys, next: following };
}
