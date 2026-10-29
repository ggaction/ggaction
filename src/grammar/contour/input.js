import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, requireStringValue, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { normalizeContourDensityOptions } from "./density.js";

export const CONTOUR_DENSITY_FIELDS = Object.freeze(["x", "y", "weight", "grid", "estimator", "normalization", "bandwidth", "kernel"]);

export function normalizeContourDensityDefinition(input) {
  ownRecord(input, "Contour density definition");
  rejectUnknownProperties(input, CONTOUR_DENSITY_FIELDS, "contour density definition");
  const { x, y, weight, ...options } = input;
  requireStringValue(x, "Contour x field"); requireStringValue(y, "Contour y field");
  if (Object.hasOwn(input, "weight")) requireStringValue(weight, "Contour weight field");
  return cloneAndFreeze({ x, y, ...(Object.hasOwn(input, "weight") ? { weight } : {}), ...normalizeContourDensityOptions(options) });
}

export function contourDensityInput(rows, definition) {
  if (Array.isArray(rows)) validateGeneratedItemLimit(rows.length, "Contour density row count");
  ownArray(rows, "Contour density rows");
  let work = 0;
  return rows.map(row => {
    ownRecord(row, "Contour density row");
    validateWorkLimit(work += Object.keys(row).length, "Contour source fields");
    return Object.fromEntries(["x", "y", ...(Object.hasOwn(definition, "weight") ? ["weight"] : [])].map(role => {
      const field = definition[role];
      if (!Object.hasOwn(row, field)) throw new TypeError(`Contour source requires its own ${field} field.`);
      return [role, row[field]];
    }));
  });
}

export function contourDensityOptions(definition) {
  const { x: _x, y: _y, weight: _weight, ...options } = definition;
  return options;
}
