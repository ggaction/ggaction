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

function visitCsvRecords(source, visitor) {
  if (typeof source !== "string") {
    throw new TypeError("CSV source must be a string.");
  }
  let record = [];
  let field = "";
  let quoted = false;
  let recordIndex = 0;
  const visit = () => {
    record.push(field);
    visitor(record, recordIndex);
    recordIndex += 1;
    record = [];
    field = "";
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      visit();
    } else if (character !== "\r") {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV source has an unterminated quoted field.");
  if (field.length > 0 || record.length > 0) visit();
  return recordIndex;
}

function validatedCsvHeader(source) {
  let headers;
  let firstWidthError;
  const recordCount = visitCsvRecords(source, (values, recordIndex) => {
    if (recordIndex === 0) {
      headers = values;
      return;
    }
    if (firstWidthError === undefined && values.length !== headers.length) {
      firstWidthError = {
        row: recordIndex + 1,
        fields: values.length,
        expected: headers.length
      };
    }
  });
  if (recordCount === 0) return undefined;
  if (headers.some(header => header.length === 0)) {
    throw new Error("CSV headers must be non-empty.");
  }
  if (firstWidthError !== undefined) {
    throw new Error(
      `CSV row ${firstWidthError.row} has ${firstWidthError.fields} fields; ` +
      `expected ${firstWidthError.expected}.`
    );
  }
  return headers;
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
  const normalized = normalizedSource(source, definition);
  const headers = validatedCsvHeader(normalized);
  if (headers === undefined) return [];
  const missingTokens = definition.missingTokens ?? [""];
  const rows = [];
  visitCsvRecords(normalized, (values, recordIndex) => {
    if (recordIndex === 0) return;
    const rawRow = Object.fromEntries(headers.map((field, columnIndex) => [
      field,
      values[columnIndex]
    ]));
    rows.push(Object.freeze(Object.fromEntries(
      Object.entries(rawRow).map(([field, value]) => [
        field,
        definition.fields[field] === undefined
          ? value
          : typedValue(
              value,
              definition.fields[field],
              missingTokens,
              `${definition.id} row ${recordIndex} field ${field}`
            )
      ])
    )));
  });
  return rows;
}
