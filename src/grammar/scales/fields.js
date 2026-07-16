import { cloneAndFreeze } from "../../core/immutable.js";

export function isNominalValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function validateFieldType(fieldType) {
  if (!["quantitative", "ordinal", "temporal"].includes(fieldType)) {
    throw new Error(`Unsupported field type "${fieldType}".`);
  }
  return fieldType;
}

export function validateNominalFieldType(fieldType) {
  if (fieldType !== "nominal") {
    throw new Error(`Unsupported color field type "${fieldType}".`);
  }
  return fieldType;
}

export function validateSemanticFieldType(fieldType) {
  if (!["quantitative", "nominal", "ordinal", "temporal"].includes(fieldType)) {
    throw new Error(`Unsupported semantic field type "${fieldType}".`);
  }
  return fieldType;
}

function validateField(field) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Encoding field must be a non-empty string.");
  }
}

export function readQuantitativeField(rows, field) {
  validateField(field);
  return cloneAndFreeze(rows.map((row, index) => {
    if (!Object.hasOwn(row, field) || !Number.isFinite(row[field])) {
      throw new TypeError(
        `Field "${field}" must contain a finite number at row ${index}.`
      );
    }
    return row[field];
  }));
}

function utcDate(year, month = 1, day = 1) {
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? timestamp
    : undefined;
}

export function normalizeTemporalValue(value, field = "value", index = 0) {
  let timestamp;
  if (typeof value === "number") {
    timestamp = Number.isInteger(value) && value >= 1000 && value <= 9999
      ? utcDate(value)
      : value;
  } else if (typeof value === "string") {
    const year = /^(\d{4})$/.exec(value);
    const date = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value);
    timestamp = year !== null
      ? utcDate(Number(year[1]))
      : date !== null
        ? utcDate(Number(date[1]), Number(date[2]), Number(date[3]))
        : Date.parse(value);
  }
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(
      `Field "${field}" must contain a temporal string or finite timestamp ` +
      `(including a valid date or four-digit year) at row ${index}.`
    );
  }
  return timestamp;
}

export function readTemporalField(rows, field) {
  validateField(field);
  return cloneAndFreeze(rows.map((row, index) => {
    if (!Object.hasOwn(row, field)) {
      throw new TypeError(
        `Field "${field}" must contain a temporal string or finite timestamp at row ${index}.`
      );
    }
    return normalizeTemporalValue(row[field], field, index);
  }));
}

export function readNominalField(rows, field) {
  validateField(field);
  return cloneAndFreeze(rows.map((row, index) => {
    if (!Object.hasOwn(row, field) || !isNominalValue(row[field])) {
      throw new TypeError(
        `Field "${field}" must contain a nominal value at row ${index}.`
      );
    }
    return row[field];
  }));
}

export function readScaleField(rows, field, fieldType, { allowUnknown = false } = {}) {
  validateSemanticFieldType(fieldType);
  if (!allowUnknown) {
    if (fieldType === "temporal") return readTemporalField(rows, field);
    if (["nominal", "ordinal"].includes(fieldType)) {
      return readNominalField(rows, field);
    }
    return readQuantitativeField(rows, field);
  }
  validateField(field);
  return cloneAndFreeze(rows.map((row, index) => {
    if (!Object.hasOwn(row, field)) return undefined;
    const value = row[field];
    if (fieldType === "quantitative") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (["nominal", "ordinal"].includes(fieldType)) {
      return isNominalValue(value) ? value : undefined;
    }
    try {
      return normalizeTemporalValue(value, field, index);
    } catch {
      return undefined;
    }
  }));
}
