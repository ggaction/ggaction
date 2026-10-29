import { annotateError } from "./diagnostics.js";
import { cloneAndFreeze, isPlainObject } from "./immutable.js";
import { validateDataRows, validateWorkLimit } from "./validation.js";

const TYPES = ["boolean", "number", "bigint", "string", "date"];
const MAX_COMPONENTS = 64;
export const DATA_IDENTITY_FIELDS = Object.freeze([
  "logicalId", "revision", "allocationId", "keySpec", "rowKeys", "nextGeneratedKey", "lineage"
]);

function invalid(path, message, code = "invalid-value") {
  return annotateError(new TypeError(message), { code, optionPath: path });
}

function dense(array, path, length) {
  if (!Array.isArray(array) || (length !== undefined && array.length !== length) ||
      Reflect.ownKeys(array).length !== array.length + 1) {
    throw invalid(path, `${path} requires a dense array of the expected length.`);
  }
  for (let i = 0; i < array.length; i++) {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(array, String(i)) ?? {}, "value")) {
      throw invalid(path, `${path} cannot contain holes or accessors.`);
    }
  }
  return array;
}

function scalar(value, path) {
  const type = typeof value;
  if (type === "boolean" || type === "string") return [type, value];
  if (type === "bigint") return [type, String(value)];
  if (type === "number" && Number.isFinite(value)) return [type, value === 0 ? 0 : value];
  if (value instanceof Date) {
    const epoch = Date.prototype.getTime.call(value);
    if (Number.isFinite(epoch)) return ["date", epoch];
  }
  throw invalid(path, "Row keys require strings, finite numbers, bigints, booleans or valid dates.");
}

function keyParts(value, path) {
  if (!Array.isArray(value)) return ["scalar", [scalar(value, path)]];
  dense(value, path);
  if (value.length === 0 || value.length > MAX_COMPONENTS) {
    throw invalid(path, "Row key tuples require between 1 and 64 scalar components.");
  }
  return ["tuple", value.map(part => scalar(part, path))];
}

// Tokens are private. Type and component boundaries are encoded, never joined.
export function encodeRowKey(value, path = "keys") {
  return JSON.stringify(keyParts(value, path));
}

export function compareRowKeys(left, right) {
  const [ak, a] = keyParts(left, "keys"), [bk, b] = keyParts(right, "keys");
  if (ak !== bk) return ak === "scalar" ? -1 : 1;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const [at, av] = a[i], [bt, bv] = b[i];
    if (at !== bt) return TYPES.indexOf(at) - TYPES.indexOf(bt);
    const x = at === "bigint" ? BigInt(av) : av;
    const y = bt === "bigint" ? BigInt(bv) : bv;
    if (x !== y) return x < y ? -1 : 1;
  }
  return a.length - b.length;
}

function fieldName(value, path) {
  if (typeof value !== "string" || value.length === 0) throw invalid(path, "Key field names must be non-empty strings.");
  return value;
}

function keySpec(options) {
  const supplied = ["keyField", "keyFields", "keys"].filter(key => options[key] !== undefined);
  if (supplied.length > 1) throw invalid("keys", "Supply exactly one row key option.");
  if (options.keyField !== undefined) return { mode: "field", field: fieldName(options.keyField, "keyField") };
  if (options.keyFields !== undefined) {
    const fields = dense(options.keyFields, "keyFields");
    if (fields.length === 0 || fields.length > MAX_COMPONENTS) throw invalid("keyFields", "keyFields requires 1 to 64 fields.");
    fields.forEach(field => fieldName(field, "keyFields"));
    if (new Set(fields).size !== fields.length) throw invalid("keyFields", "Key field names must be unique.");
    return { mode: "fields", fields: [...fields] };
  }
  return { mode: options.keys === undefined ? "generated" : "explicit" };
}

function fieldValue(row, field) {
  const entry = Object.getOwnPropertyDescriptor(row, field);
  if (!entry || !("value" in entry)) throw invalid("values", "Key fields must be own data properties on every row.");
  // A field is one scalar; tuple-valued fields cannot silently change the grain.
  scalar(entry.value, "values");
  return entry.value;
}

function unique(keys) {
  if (new Set(keys).size !== keys.length) throw invalid("keys", "Duplicate row identity.", "ambiguous-identity");
  return keys;
}

function keyedRows(values, spec, keys) {
  if (spec.mode === "explicit") return unique(dense(keys, "keys", values.length).map(key => encodeRowKey(key)));
  validateWorkLimit(values.length * (spec.mode === "fields" ? spec.fields.length : 1), "Row key work");
  return unique(values.map(row => encodeRowKey(spec.mode === "field"
    ? fieldValue(row, spec.field) : spec.fields.map(field => fieldValue(row, field)))));
}

function counter(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) throw invalid(path, `${path} requires a non-negative safe integer.`);
  return value;
}

function namespace(value, path) {
  if (typeof value !== "string" || value.length === 0) throw invalid(path, `${path} requires a non-empty namespace.`);
  return value;
}

export function allocateRowKeys(previous, nextGeneratedKey, rowMap, allocationId) {
  dense(previous, "rowKeys");
  dense(rowMap, "rowMap");
  counter(nextGeneratedKey, "nextGeneratedKey");
  namespace(allocationId, "allocationId");
  const used = new Set();
  const rowKeys = rowMap.map(index => {
    if (index === null) {
      if (nextGeneratedKey === Number.MAX_SAFE_INTEGER) {
        throw annotateError(new RangeError("Generated row identity space exhausted."), {
          code: "resource-limit", optionPath: "nextGeneratedKey", limit: Number.MAX_SAFE_INTEGER
        });
      }
      return JSON.stringify(["generated", allocationId, nextGeneratedKey++]);
    }
    if (!Number.isSafeInteger(index) || index < 0 || index >= previous.length || used.has(index)) {
      throw invalid("rowMap", "rowMap must reference each existing row at most once or use null for a new row.");
    }
    used.add(index);
    return previous[index];
  });
  return { rowKeys, nextGeneratedKey };
}

// UUID allocation belongs to the calling action; these calculations are pure.
export function createSourceIdentity(values, options, { logicalId, allocationId }) {
  validateDataRows(values);
  namespace(logicalId, "logicalId");
  namespace(allocationId, "allocationId");
  const spec = keySpec(options);
  const rows = spec.mode === "generated"
    ? allocateRowKeys([], 0, Array(values.length).fill(null), allocationId)
    : { rowKeys: keyedRows(values, spec, options.keys), nextGeneratedKey: 0 };
  return cloneAndFreeze({ logicalId, revision: 0, allocationId, keySpec: spec, ...rows });
}

export function reviseSourceIdentity(source, values, options, allocationId) {
  validateDataRows(values);
  namespace(allocationId, "allocationId");
  counter(source.revision, "revision");
  if (source.revision === Number.MAX_SAFE_INTEGER) {
    throw annotateError(new RangeError("Dataset revision space exhausted."), {
      code: "resource-limit", optionPath: "revision", limit: Number.MAX_SAFE_INTEGER
    });
  }
  if (options.keyField !== undefined || options.keyFields !== undefined) throw invalid("keys", "Revision inherits its source key mode.");
  const spec = source.keySpec;
  if ((spec.mode !== "explicit" && options.keys !== undefined) ||
      (spec.mode !== "generated" && options.rowMap !== undefined)) throw invalid("keys", "Revision options must match the source key mode.");
  const rows = spec.mode === "generated"
    ? allocateRowKeys(source.rowKeys, source.nextGeneratedKey,
      options.rowMap === undefined ? Array(values.length).fill(null) : dense(options.rowMap, "rowMap", values.length), allocationId)
    : { rowKeys: keyedRows(values, spec, options.keys), nextGeneratedKey: 0 };
  return cloneAndFreeze({ logicalId: source.logicalId, revision: source.revision + 1, allocationId, keySpec: spec, ...rows });
}

// Canonical typed tokens are shared by source rows and keyed compound columns.
export function validateTypedRowKeyToken(key) {
  let decoded;
  try { decoded = JSON.parse(key); } catch { throw invalid("rowKeys", "Invalid typed row key token."); }
  if (!Array.isArray(decoded) || decoded.length !== 2 || !["scalar", "tuple"].includes(decoded[0]) || !Array.isArray(decoded[1])) {
    throw invalid("rowKeys", "Invalid typed row key token.");
  }
  let parts;
  try {
    parts = decoded[1].map(([type, value]) => {
      const raw = type === "bigint" ? BigInt(value) : type === "date" ? new Date(value) : value;
      if (JSON.stringify(scalar(raw, "rowKeys")) !== JSON.stringify([type, value])) throw invalid("rowKeys", "Invalid typed row key token.");
      return raw;
    });
    if (decoded[0] === "scalar" && parts.length !== 1) throw invalid("rowKeys", "Invalid scalar row key token.");
    if (encodeRowKey(decoded[0] === "scalar" ? parts[0] : parts) !== key) throw invalid("rowKeys", "Noncanonical row key token.");
  } catch { throw invalid("rowKeys", "Invalid typed row key token."); }
  return key;
}

export function validateSourceIdentity(dataset) {
  const { logicalId, revision, allocationId, keySpec: spec, rowKeys, nextGeneratedKey, values } = dataset;
  namespace(logicalId, "logicalId");
  namespace(allocationId, "allocationId");
  counter(revision, "revision");
  counter(nextGeneratedKey, "nextGeneratedKey");
  if (!isPlainObject(spec)) throw invalid("keySpec", "Dataset requires a key specification.");
  const normalized = spec.mode === "field" ? keySpec({ keyField: spec.field })
    : spec.mode === "fields" ? keySpec({ keyFields: spec.fields })
      : spec.mode === "explicit" ? { mode: "explicit" } : { mode: "generated" };
  if (Object.keys(spec).length !== Object.keys(normalized).length ||
      Object.entries(normalized).some(([key, value]) => JSON.stringify(spec[key]) !== JSON.stringify(value))) {
    throw invalid("keySpec", "Invalid key specification.");
  }
  dense(rowKeys, "rowKeys", values.length);
  unique(rowKeys);
  for (const key of rowKeys) {
    let decoded;
    try { decoded = JSON.parse(key); } catch { throw invalid("rowKeys", "Invalid row key token."); }
    if (spec.mode === "generated") {
      if (!Array.isArray(decoded) || decoded.length !== 3 || decoded[0] !== "generated" ||
          typeof decoded[1] !== "string" || !decoded[1] || !Number.isSafeInteger(decoded[2]) ||
          decoded[2] < 0 || decoded[2] >= nextGeneratedKey || JSON.stringify(decoded) !== key) {
        throw invalid("rowKeys", "Invalid generated row key token.");
      }
    } else {
      validateTypedRowKeyToken(key);
    }
  }
  if (spec.mode !== "generated" && nextGeneratedKey !== 0) throw invalid("nextGeneratedKey", "Keyed sources have no generated counter.");
  if (["field", "fields"].includes(spec.mode)) {
    const expected = keyedRows(values, spec);
    if (expected.some((key, index) => key !== rowKeys[index])) throw invalid("rowKeys", "Stored keys disagree with source fields.");
  }
  return dataset;
}
