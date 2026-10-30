import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateWorkLimit } from "../../core/validation.js";
import { textMetricKey } from "../../core/font.js";
import { measureTextWidth, fontMetricBinding } from "../../core/textMetrics.js";
import { normalizeTextMetricProfile, normalizeFontMetricProfile } from "../../core/textMetricProfile.js";

// Retain only the exact native layout queries. Schema 2 keeps the byte identity
// and resource revision of every measured font; missing queries remain errors.
export function prepareGuideMetrics(queries, source, id) {
  const unique = new Map(queries.map(query => [textMetricKey(query), query]));
  const measurements = [...unique.values()].map(query => ({ ...query, width: measureTextWidth(query.text, query, source) }));
  if (source?.schemaVersion !== 2) return normalizeTextMetricProfile({ schemaVersion: 1, id, measurements });
  const fonts = new Map();
  for (const query of measurements) {
    const binding = fontMetricBinding(source, query);
    fonts.set(binding.resource.id, binding);
  }
  return normalizeFontMetricProfile({ schemaVersion: 2, id, fonts: [...fonts.values()], measurements });
}
export function normalizeGuideMetrics(profile) {
  ownRecord(profile, "Prepared guide metrics");
  if (!["schemaVersion", "id", "measurements"].every(key => Object.hasOwn(profile, key))) throw new TypeError("Prepared guide metrics require every field.");
  if (profile.schemaVersion === 2 && !Object.hasOwn(profile, "fonts")) throw new TypeError("Prepared guide metrics require font bindings.");
  ownArray(profile.measurements, "Prepared guide measurements");
  let work = 0;
  for (const query of profile.measurements) {
    ownRecord(query, "Prepared guide measurement");
    validateWorkLimit(work += 1 + (typeof query.text === "string" ? query.text.length : 0), "Prepared guide text work");
  }
  return profile.schemaVersion === 2 ? normalizeFontMetricProfile(profile) : normalizeTextMetricProfile(profile);
}
