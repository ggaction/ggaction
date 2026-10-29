import { isColorScaleType } from "../scales/types.js";
import { validateSizeScaleType } from "../scales/size.js";
import { validateScaleUnknown } from "../scales/policies.js";
import { validateContinuousColorConsumer } from "../scales/colorConsumers.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateSemanticFieldType, validateTemporalUnit } from "../scales/fields.js";

export function validateGeoEncodingChannel(layer, channel) {
  const { mode, radiusDeg } = layer.geoBinding;
  if (!["shape", "point", "line"].includes(mode) || !["color", "size"].includes(channel)) throw new TypeError("Geographic field mapping requires a feature color or point size consumer.");
  if (channel === "size" && (mode !== "point" || radiusDeg !== undefined)) throw new TypeError("Geographic size requires pixel-radius point geometry; radiusDeg is incompatible.");
}

export function validateGeoEncodings(layer) {
  const encoding = layer.encoding ?? {};
  ownRecord(encoding, "Geographic encodings");
  rejectUnknownProperties(encoding, ["color", "size"], "geographic encodings");
  for (const [channel, binding] of Object.entries(encoding)) {
    validateGeoEncodingChannel(layer, channel);
    ownRecord(binding, "Geographic encoding");
    rejectUnknownProperties(binding, channel === "color" ? ["field", "fieldType", "scale", "temporalUnit"] : ["field", "fieldType", "scale"], "geographic encoding");
    validateNonEmptyString(binding.field, "Geographic field");
    validateUserId(binding.scale, "Geographic scale");
    validateSemanticFieldType(binding.fieldType);
    if (channel === "size" && binding.fieldType === "temporal") throw new TypeError("Geographic size does not accept temporal fields.");
    if (Object.hasOwn(binding, "temporalUnit")) {
      if (binding.fieldType !== "temporal") throw new TypeError("Temporal units require a temporal color field.");
      validateTemporalUnit(binding.temporalUnit);
    }
  }
}

export function validateGeoEncodingScale(layer, channel, encoding, scale) {
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  if (categorical !== (scale.type === "ordinal")) throw new TypeError("Geographic field type and scale family are incompatible.");
  if (channel === "size") validateSizeScaleType(scale.type);
  else if (!categorical) {
    if (!isColorScaleType(scale.type)) throw new TypeError("Geographic color requires a native color scale.");
    validateContinuousColorConsumer(layer, encoding, scale);
  }
  if (Object.hasOwn(scale, "unknown")) validateScaleUnknown(channel, scale.unknown);
}
