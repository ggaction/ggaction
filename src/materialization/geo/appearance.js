import { geoFeatureDataset } from "./featureDataset.js";
import { geoFeatureKey } from "./source.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { resolveConditionalValues } from "../conditionalValues.js";
import { validateGeoEncodingChannel, validateGeoEncodingScale } from "../../grammar/geo/encoding.js";
import { readScaleField } from "../../grammar/scales/fields.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { mapScaleConsumerValues } from "../scales/map.js";

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
  if (layer.conditionals !== undefined) {
    const resource = requireStoredResource(program, layer.geoBinding.geometry);
    const items = features.map(feature => ({ key: geoFeatureKey(layer, resource, feature),
      fields: feature.fields, members: [], rows: feature.rows ?? [] }));
    const resolved = resolvedScales === program.resolvedScales ? program : { ...program, resolvedScales };
    for (const channel of Object.keys(layer.conditionals)) {
      result[channel] = resolveConditionalValues(resolved, layer, channel, items);
    }
  }
  return result;
}

// Resolve semantic style once at the final feature grain, including invisible
// features whose current camera may later reveal a native part.
export function geoFeatureAppearance(config, binding, mapped, index) {
  const { clip: _clip, radiusPx, ...style } = config;
  return { style: mapped.color === undefined ? style : { ...style, [binding.mode === "line" ? "stroke" : "fill"]: mapped.color[index] },
    radiusPx: mapped.size === undefined ? radiusPx : Math.sqrt(mapped.size[index] / Math.PI) };
}
