import { cloneAndFreeze } from "../core/immutable.js";
import {
  isNominalValue,
  normalizeTemporalValue,
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateSemanticFieldType
} from "./scales/index.js";

const ENDPOINT_CHANNELS = Object.freeze(["x", "y", "x2", "y2"]);
const VALUE_CHANNELS = Object.freeze([
  ...ENDPOINT_CHANNELS,
  "strokeDash",
  "opacity"
]);

const RULE_MODES = Object.freeze({
  x: "vertical-span",
  y: "horizontal-span",
  "x,y,y2": "vertical-interval",
  "x,y,x2": "horizontal-interval",
  "x,y,x2,y2": "diagonal-interval"
});

export function resolveRuleMode(layer) {
  if (layer?.mark?.type !== "rule") return undefined;
  const signature = ENDPOINT_CHANNELS
    .filter(channel => layer.encoding?.[channel] !== undefined)
    .join(",");
  return RULE_MODES[signature];
}

function readField(rows, encoding) {
  if (["nominal", "ordinal"].includes(encoding.fieldType)) {
    return readNominalField(rows, encoding.field);
  }
  if (encoding.fieldType === "temporal") {
    return readTemporalField(rows, encoding.field);
  }
  return readQuantitativeField(rows, encoding.field);
}

export function normalizeRuleDatum(value, fieldType, channel) {
  validateSemanticFieldType(fieldType);
  if (fieldType === "quantitative") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Rule ${channel} datum must be a finite number.`);
    }
    return value;
  }
  if (fieldType === "temporal") {
    return normalizeTemporalValue(value, `${channel} datum`, 0);
  }
  if (!isNominalValue(value)) {
    throw new TypeError(`Rule ${channel} datum must be a nominal value.`);
  }
  return value;
}

export function deriveRuleValues(rows, layer) {
  const encodings = Object.fromEntries(
    VALUE_CHANNELS
      .map(channel => [channel, layer.encoding?.[channel]])
      .filter(([channel, encoding]) =>
        encoding !== undefined &&
        (ENDPOINT_CHANNELS.includes(channel) || Object.hasOwn(encoding, "field"))
      )
  );
  const hasField = Object.values(encodings).some(encoding =>
    Object.hasOwn(encoding, "field")
  );
  const length = hasField ? rows.length : 1;
  const values = {};

  for (const [channel, encoding] of Object.entries(encodings)) {
    if (Object.hasOwn(encoding, "field")) {
      values[channel] = readField(rows, encoding);
    } else {
      const datum = normalizeRuleDatum(
        encoding.datum,
        encoding.fieldType,
        channel
      );
      values[channel] = Array.from({ length }, () => datum);
    }
  }

  return cloneAndFreeze({ length, values });
}
