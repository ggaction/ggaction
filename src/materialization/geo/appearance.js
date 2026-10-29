import { geoMarkSource } from "./source.js";
import { validateGeoEncodingChannel, validateGeoEncodingScale } from "../../grammar/geo/encoding.js";
import { readScaleField } from "../../grammar/scales/fields.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { mapScaleConsumerValues } from "../scales/map.js";

// Transient feature rows share the native encoder readers; no dataset identity
// or materialized data resource is synthesized for a geometry-backed layer.
export function geoFeatureDataset(program, layer) {
  validateGeoEncodingChannel(layer, "color");
  const source = geoMarkSource(program, layer, program.materializationConfigs.marks[layer.id].geo);
  const features = source.drawableFeatures;
  return { values: features.map(feature => feature.fields), features };
}

export function geoScaleValues(program, { layer, encoding, channel }) {
  validateGeoEncodingChannel(layer, channel);
  const scale = requireSemanticScale(program, encoding.scale);
  validateGeoEncodingScale(layer, channel, encoding, scale);
  return readScaleField(geoFeatureDataset(program, layer).values, encoding.field, encoding.fieldType,
    { allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: encoding.temporalUnit });
}

export function geoAppearanceValues(program, layer, features, resolvedScales = program.resolvedScales) {
  const result = {};
  for (const [channel, encoding] of Object.entries(layer.encoding ?? {})) {
    validateGeoEncodingChannel(layer, channel);
    const scale = resolvedScales[encoding.scale];
    if (scale === undefined) throw new TypeError("Geographic field mapping requires a resolved scale.");
    validateGeoEncodingScale(layer, channel, encoding, scale);
    const raw = readScaleField(features.map(feature => feature.fields), encoding.field, encoding.fieldType,
      { allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: encoding.temporalUnit });
    result[channel] = mapScaleConsumerValues(raw, scale, channel);
  }
  return result;
}
