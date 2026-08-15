import { parseCsv } from "../csv.js";

function normalizedSource(source, definition) {
  let normalized = source.replace(/^\uFEFF/u, "");
  const csv = definition.csv ?? {};
  if (csv.lineEnding === "cr") {
    normalized = normalized.replace(/\r/gu, "\n");
  }
  const emptyHeaderAlias = csv.headerAliases?.[""];
  if (emptyHeaderAlias !== undefined) {
    if (
      typeof emptyHeaderAlias !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(emptyHeaderAlias) ||
      !/^"",/u.test(normalized)
    ) {
      throw new TypeError(`${definition.id} has an invalid empty-header alias.`);
    }
    normalized = normalized.replace(/^"",/u, `${emptyHeaderAlias},`);
  }
  return normalized;
}

function missing(value, tokens) {
  return tokens.includes(value);
}

function durationSeconds(value, label) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/u);
  if (!match) throw new TypeError(`${label} must use HH:MM:SS.`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function typedValue(value, schema, missingTokens, label) {
  if (missing(value, missingTokens)) {
    if (schema.nullable === true) return null;
    throw new TypeError(`${label} is unexpectedly missing.`);
  }
  if (["nominal", "ordinal"].includes(schema.type)) return value;
  if (schema.type === "boolean") {
    if (value === "TRUE") return true;
    if (value === "FALSE") return false;
    throw new TypeError(`${label} must be TRUE or FALSE.`);
  }
  if (schema.type === "duration-hms") return durationSeconds(value, label);
  if (schema.type === "temporal-year") {
    const year = Number(value);
    if (!Number.isInteger(year)) throw new TypeError(`${label} must be a year.`);
    return `${year.toString().padStart(4, "0")}-01-01T00:00:00Z`;
  }
  if (schema.type === "temporal-date") {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
      throw new TypeError(`${label} must be an ISO date.`);
    }
    return `${value}T00:00:00Z`;
  }
  if (schema.type === "temporal-datetime") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)) {
      throw new TypeError(`${label} must be an explicit UTC datetime.`);
    }
    return value;
  }
  if (schema.type === "quantitative") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite.`);
    return number;
  }
  throw new Error(`${label} has unknown field type "${schema.type}".`);
}

export function parseTypedCsv(source, definition) {
  const rows = parseCsv(normalizedSource(source, definition));
  const missingTokens = definition.missingTokens ?? [""];
  return rows.map((row, rowIndex) => Object.freeze(Object.fromEntries(
    Object.entries(row).map(([field, value]) => [
      field,
      definition.fields[field] === undefined
        ? value
        : typedValue(
            value,
            definition.fields[field],
            missingTokens,
            `${definition.id} row ${rowIndex + 1} field ${field}`
          )
    ])
  )));
}
