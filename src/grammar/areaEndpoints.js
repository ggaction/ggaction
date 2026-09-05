import { validateKeys, validateNonEmptyString } from "../core/validation.js";
import { isPlainObject } from "../core/immutable.js";
import { readQuantitativeField } from "./scales/fields.js";

export function validateAreaMissing(value = "error") {
  if (!["error", "break"].includes(value)) {
    throw new Error('Area missing must be "error" or "break".');
  }
  return value;
}

export function normalizeAreaBound(bound) {
  if (typeof bound === "string") return { field: validateNonEmptyString(bound, "Area endpoint field") };
  if (!isPlainObject(bound)) throw new TypeError("Area bound must be a field or datum object.");
  validateKeys(bound, ["datum"], "Area bound");
  if (!Number.isFinite(bound.datum)) throw new TypeError("Area datum must be finite.");
  return { datum: bound.datum };
}

export function readAreaEndpoint(rows, encoding, missing = "error") {
  if (Object.hasOwn(encoding, "datum")) {
    if (Object.hasOwn(encoding, "field") || !Number.isFinite(encoding.datum) || encoding.fieldType !== "quantitative") {
      throw new TypeError("Area endpoint requires exactly one finite quantitative datum or field.");
    }
    return rows.map(() => encoding.datum);
  }
  if (missing !== "break") return readQuantitativeField(rows, encoding.field);
  validateNonEmptyString(encoding.field, "Area endpoint field");
  if (rows.length > 0 && !rows.some(row => Object.hasOwn(row, encoding.field))) {
    throw new Error(`Area endpoint field "${encoding.field}" does not exist.`);
  }
  return rows.map((row, index) => {
    const value = row[encoding.field];
    if (value == null) return null;
    if (!Number.isFinite(value)) {
      throw new TypeError(`Field "${encoding.field}" must contain a finite number at row ${index}.`);
    }
    return value;
  });
}

export function validateAreaEndpointPair(primary, secondary) {
  if (primary?.datum !== undefined && secondary?.datum !== undefined) {
    throw new Error("Area range requires at least one field endpoint.");
  }
}
