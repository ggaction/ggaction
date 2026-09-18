import { cloneAndFreeze } from "./immutable.js";
import { validateUserId } from "./identifiers.js";
import { validateOptionObject, validatePositiveFinite, validateNonNegativeFinite, validateNonEmptyString } from "./validation.js";

import { textMetricKey, validateFontStyle } from "./font.js";

export function normalizeTextMetricProfile(profile) {
  validateOptionObject(profile, ["schemaVersion", "id", "measurements"], "Text metrics profile");
  if (profile.schemaVersion !== 1) throw new Error("Text metrics require schemaVersion 1.");
  validateUserId(profile.id, "Text metrics profile id");
  if (!Array.isArray(profile.measurements)) throw new TypeError("Text metrics measurements must be an array.");
  const seen = new Set();
  for (const measurement of profile.measurements) {
    validateOptionObject(measurement, ["text", "fontFamily", "fontSize", "fontWeight", "fontStyle", "width"], "Text measurement");
    if (typeof measurement.text !== "string") throw new TypeError("Text measurement text must be a string.");
    validateNonEmptyString(measurement.fontFamily, "Text measurement fontFamily");
    validatePositiveFinite(measurement.fontSize, "Text measurement fontSize");
    validateNonNegativeFinite(measurement.width, "Text measurement width");
    if (!Number.isInteger(measurement.fontWeight) || measurement.fontWeight < 100 ||
        measurement.fontWeight > 900 || measurement.fontWeight % 100 !== 0) {
      throw new RangeError("Text measurement fontWeight must be 100–900 in steps of 100.");
    }
    if (measurement.fontStyle !== undefined) validateFontStyle(measurement.fontStyle, "Text measurement");
    const key = textMetricKey(measurement);
    if (seen.has(key)) throw new Error("Duplicate text measurement combination.");
    seen.add(key);
  }
  return cloneAndFreeze(profile);
}
