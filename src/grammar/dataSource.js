import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";
import { inferDatasetSchema, normalizeSourceSchema, validateRowsAgainstSchema } from "./datasetSchema.js";
import { parseDataDateValue, validateDataDateOptions } from "./parseTime.js";

const reserved = new Set(["__proto__", "prototype", "constructor"]);
const formats = ["csv", "json"];

function record(value, keys, required, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key)) || required.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(`${label} has unsupported or missing properties.`);
  }
  for (const key of Object.keys(value)) if (value[key] === undefined) throw new TypeError(`${label} cannot contain undefined.`);
}

function fieldName(value) {
  if (typeof value !== "string" || value.length === 0 || reserved.has(value)) throw new TypeError("Data field requires a nonempty, unreserved name.");
  validateWorkLimit(value.length, "Data field name length");
  return value;
}

// Validate descriptors before cloning or hashing. JSON and inline values share
// this boundary; no getter, prototype traversal, or executable value is read.
export function validateSourceRows(rows, { maxDepth = 64 } = {}) {
  ownArray(rows, "Data rows");
  let work = 0;
  const active = new WeakSet();
  function visit(value, depth) {
    validateWorkLimit(++work, "Data value work");
    if (depth > maxDepth) throw new RangeError(`Data values exceed maximum depth ${maxDepth}.`);
    if (value === null || typeof value === "boolean") return;
    if (typeof value === "string") { validateWorkLimit(value.length, "Data string length"); return; }
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object") throw new TypeError("Data values must contain finite JSON values.");
    if (active.has(value)) throw new TypeError("Data values cannot contain cycles.");
    active.add(value);
    if (Array.isArray(value)) ownArray(value, "Data array");
    else ownRecord(value, "Data object");
    for (const [key, item] of Object.entries(value)) {
      if (reserved.has(key)) throw new TypeError("Data contains a reserved prototype key.");
      visit(item, depth + 1);
    }
    active.delete(value);
  }
  for (const row of rows) { ownRecord(row, "Data row"); visit(row, 0); }
  return rows;
}

export function normalizeDataParse(parse = {}) {
  ownRecord(parse, "Data parse directives");
  const result = {};
  for (const [field, directive] of Object.entries(parse)) {
    fieldName(field);
    record(directive, ["type", "nullable", "format", "timeZone"], ["type"], "Data parse directive");
    if (!["string", "number", "boolean", "date"].includes(directive.type)) throw new TypeError("Unsupported data parse type.");
    if (Object.hasOwn(directive, "nullable") && typeof directive.nullable !== "boolean") throw new TypeError("Parse nullable must be boolean.");
    if (directive.type === "date") {
      validateDataDateOptions(directive);
    } else if (Object.hasOwn(directive, "format") || Object.hasOwn(directive, "timeZone")) {
      throw new TypeError("Parse format and timeZone require date type.");
    }
    result[field] = { ...directive, nullable: directive.nullable ?? false,
      ...(directive.type === "date" ? { format: directive.format ?? "%Y-%m-%d" } : {}) };
  }
  return cloneAndFreeze(result);
}

export function normalizeDataSource(source) {
  ownRecord(source, "Data source");
  const common = ["kind", "parse", "schema"];
  const inlineValues = source.kind === "inline" && Object.hasOwn(source, "values");
  const allowed = inlineValues ? [...common, "values"]
    : source.kind === "inline" ? [...common, "text", "format", "delimiter"]
      : source.kind === "named" ? [...common, "name", "format", "delimiter"]
        : [...common, "url", "format", "delimiter"];
  record(source, allowed, ["kind"], "Data source");
  if (!["inline", "named", "url"].includes(source.kind)) throw new TypeError("Unsupported data source kind.");
  if (inlineValues) validateSourceRows(source.values);
  else {
    if (!formats.includes(source.format)) throw new TypeError("Data source requires csv or json format.");
    if (source.kind === "inline" && typeof source.text !== "string") throw new TypeError("Inline source requires text or values.");
    if (source.kind === "named" && (typeof source.name !== "string" || !source.name)) throw new TypeError("Named source requires an explicit name.");
    if (source.kind === "url" && typeof source.url !== "string") {
      ownRecord(source.url, "Data source URL expression");
      validateSourceRows([{ expression: source.url }], { maxDepth: 256 });
    }
    if (typeof source.url === "string" && !source.url) throw new TypeError("Data source URL must not be empty.");
    for (const key of ["text", "name", "url"]) {
      if (typeof source[key] === "string") validateWorkLimit(source[key].length, `Data source ${key} length`);
    }
    if (Object.hasOwn(source, "delimiter") && (source.format !== "csv" || typeof source.delimiter !== "string" ||
      source.delimiter.length !== 1 || /["\r\n\uFEFF]/.test(source.delimiter))) throw new TypeError("CSV delimiter requires one nonquote, nonnewline character.");
  }
  const parse = normalizeDataParse(source.parse);
  if (source.schema !== undefined) { validateSourceRows([{ schema: source.schema }]); normalizeSourceSchema(source.schema); }
  return cloneAndFreeze({ ...source, parse, ...(!inlineValues && source.format === "csv" ? { delimiter: source.delimiter ?? "," } : {}) });
}

function csvRows(text, delimiter) {
  const records = [];
  let row = [], value = "", state = "start", pending = false;
  function cell() { row.push(value); value = ""; state = "start"; }
  function line() { cell(); records.push(row); row = []; pending = false; }
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; pending = true;
    if (state === "quoted") {
      if (char === '"') {
        if (text[index + 1] === '"') { value += '"'; index += 1; }
        else state = "closed";
      } else value += char;
      continue;
    }
    if (char === delimiter) { cell(); continue; }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      line(); continue;
    }
    if (char === '"' && state === "start") { state = "quoted"; continue; }
    if (char === '"' || state === "closed") throw new TypeError("Malformed CSV quote or text after closing quote.");
    value += char; state = "plain";
  }
  if (state === "quoted") throw new TypeError("CSV contains an unterminated quoted field.");
  if (pending) line();
  if (records.length === 0) return { values: [], fields: [] };
  const fields = records.shift();
  fields.forEach(fieldName);
  if (new Set(fields).size !== fields.length) throw new TypeError("CSV header fields must be unique.");
  return { fields, values: records.map((cells, index) => {
    if (cells.length !== fields.length) throw new TypeError(`CSV row ${index} has ${cells.length} cells; expected ${fields.length}.`);
    return Object.fromEntries(fields.map((field, column) => [field, cells[column]]));
  }) };
}

function parseValue(value, directive, field, row) {
  const label = `Data field "${field}" at row ${row}`;
  if (value === null || (value === "" && directive.type !== "string")) {
    if (directive.nullable) return null;
    throw new TypeError(`${label} cannot be null or an empty typed cell.`);
  }
  if (directive.type === "string" && typeof value === "string") return value;
  if (directive.type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) && Number.isFinite(Number(value))) return Number(value);
  }
  if (directive.type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "false") return value === "true";
  }
  if (directive.type === "date") return parseDataDateValue(value, directive);
  throw new TypeError(`${label} cannot be parsed as ${directive.type}.`);
}

export function parseDataSource(source, text) {
  const normalized = normalizeDataSource(source);
  let values, fields;
  if (Object.hasOwn(normalized, "values")) values = normalized.values;
  else {
    const input = text ?? normalized.text;
    if (typeof input !== "string") throw new TypeError("Resolved data source requires text.");
    validateWorkLimit(input.length, "Data source text length");
    const body = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;
    if (normalized.format === "csv") ({ values, fields } = csvRows(body, normalized.delimiter));
    else {
      try { values = JSON.parse(body); }
      catch { throw new TypeError("Data source contains malformed JSON."); }
    }
  }
  validateSourceRows(values);
  const known = new Set(fields ?? values.flatMap(row => Object.keys(row)));
  for (const field of Object.keys(normalized.parse)) if (!known.has(field) && (values.length > 0 || fields !== undefined)) throw new TypeError(`Parse field "${field}" is absent from the data.`);
  const parsed = values.map((row, index) => {
    const result = { ...row };
    for (const [field, directive] of Object.entries(normalized.parse)) {
      if (!Object.hasOwn(row, field)) throw new TypeError(`Parse field "${field}" is absent at row ${index}.`);
      result[field] = parseValue(row[field], directive, field, index);
    }
    return result;
  });
  let schema = normalized.schema === undefined ? inferDatasetSchema(parsed) : normalizeSourceSchema(normalized.schema);
  if (parsed.length === 0 && normalized.schema === undefined && (fields?.length || Object.keys(normalized.parse).length)) {
    schema = { version: 1, completeness: "known", origin: "inferred", fields: (fields ?? Object.keys(normalized.parse)).map(name => ({
      name, storageType: normalized.parse[name]?.type === "date" ? "number" : normalized.parse[name]?.type ?? "string",
      nullable: normalized.parse[name]?.nullable ?? false, optional: false
    })) };
  }
  if (normalized.schema === undefined && schema.completeness === "known") {
    schema = { ...schema, fields: schema.fields.map(field => {
      const directive = normalized.parse[field.name];
      return directive === undefined ? field : { ...field,
        storageType: directive.type === "date" ? "number" : directive.type,
        nullable: directive.nullable
      };
    }) };
  }
  validateRowsAgainstSchema(parsed, schema, "Resolved data");
  return cloneAndFreeze({ values: parsed, schema });
}
