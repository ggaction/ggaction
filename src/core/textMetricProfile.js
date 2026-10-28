import { cloneAndFreeze } from "./immutable.js";
import { validateUserId } from "./identifiers.js";
import { validateOptionObject, validatePositiveFinite, validateNonNegativeFinite, validateNonEmptyString } from "./validation.js";

import { textMetricKey, validateFontStyle, validateFontIdentity, FONT_IDENTITY_KEYS } from "./font.js";
import { ownArray, ownRecord } from "./ownData.js";
import { validateInputReference } from "./resourceReference.js";

export function normalizeTextMetricProfile(profile) {
  validateOptionObject(profile, ["schemaVersion", "id", "measurements"], "Text metrics profile");
  if (profile.schemaVersion !== 1) throw new Error("Text metrics require schemaVersion 1.");
  validateUserId(profile.id, "Text metrics profile id");
  validateMeasurements(profile.measurements);
  return cloneAndFreeze(profile);
}

function validateMeasurements(measurements) {
  if (!Array.isArray(measurements)) throw new TypeError("Text metrics measurements must be an array.");
  const seen = new Set();
  for (const measurement of measurements) {
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
}

export const FONT_METRIC_MAX_FONTS = 64;
export const FONT_METRIC_MAX_QUERIES = 10000;
export const FONT_METRIC_MAX_TEXT_UNITS = 1048576;

export function fontMetricIdentityKey({ family, style, weight }) {
  return JSON.stringify([family, style, weight]);
}

// Schema 2 is prepared by the host boundary. Schema 1's authoring normalizer
// above deliberately retains its existing permissive missing-query policy.
export function normalizeFontMetricProfile(profile) {
  ownRecord(profile, "Font metrics profile");
  validateOptionObject(profile, ["schemaVersion", "id", "fonts", "measurements"], "Font metrics profile");
  if (profile.schemaVersion !== 2) throw new Error("Font metrics require schemaVersion 2.");
  validateUserId(profile.id, "Font metrics profile id");
  ownArray(profile.fonts, "Font metric bindings");
  if (profile.fonts.length === 0 || profile.fonts.length > FONT_METRIC_MAX_FONTS) throw new RangeError("Font metric binding count exceeds its budget.");
  const identities = new Set(), resources = new Set();
  for (const binding of profile.fonts) {
    ownRecord(binding, "Font metric binding");
    validateOptionObject(binding, ["resource", "identity"], "Font metric binding");
    validateInputReference(binding.resource);
    if (binding.resource.kind !== "font") throw new TypeError("Font metrics require font resource references.");
    validateOptionObject(binding.identity, ["contentHash", ...FONT_IDENTITY_KEYS], "Measured font identity");
    validateFontIdentity(binding.identity);
    if (typeof binding.identity.contentHash !== "string" || !/^[a-f0-9]{64}$/.test(binding.identity.contentHash)) {
      throw new TypeError("Measured font requires a lowercase SHA256 content hash.");
    }
    const key = fontMetricIdentityKey(binding.identity);
    if (identities.has(key) || resources.has(binding.resource.id)) throw new Error("Ambiguous or duplicate font metric binding.");
    identities.add(key); resources.add(binding.resource.id);
  }
  ownArray(profile.measurements, "Font metric measurements");
  if (profile.measurements.length > FONT_METRIC_MAX_QUERIES) throw new RangeError("Font measurement count exceeds its budget.");
  for (const measurement of profile.measurements) ownRecord(measurement, "Font measurement");
  validateMeasurements(profile.measurements);
  let units = 0;
  for (const measurement of profile.measurements) {
    if (!Object.hasOwn(measurement, "fontStyle") || !identities.has(fontMetricIdentityKey({
      family: measurement.fontFamily, style: measurement.fontStyle, weight: measurement.fontWeight
    }))) throw new Error("Font measurement does not match an explicit font binding.");
    units += measurement.text.length;
    if (units > FONT_METRIC_MAX_TEXT_UNITS) throw new RangeError("Font measurement text exceeds its budget.");
  }
  return cloneAndFreeze(profile);
}
