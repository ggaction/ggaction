import { isNominalValue, normalizeTemporalValue, validateSemanticFieldType } from "./scales/index.js";

export function normalizePositionDatum(value, fieldType, channel, temporalUnit, mark = "Position") {
  validateSemanticFieldType(fieldType);
  if (fieldType === "quantitative") {
    if (!Number.isFinite(value)) throw new TypeError(`${mark} ${channel} datum must be a finite number.`);
    return value;
  }
  if (fieldType === "temporal") return normalizeTemporalValue(value, `${channel} datum`, 0, temporalUnit);
  if (!isNominalValue(value)) throw new TypeError(`${mark} ${channel} datum must be a nominal value.`);
  return value;
}
