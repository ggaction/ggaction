import { POSITION_CHANNELS } from "../core/vocabulary.js";
import {
  mapOrdinalPositionValues,
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField
} from "../grammar/scales/index.js";
import { mapScaleConsumerValues } from "./scales/map.js";

export function resolveRowEncodingValues(program, layer, dataset, channel) {
  const encoding = layer.encoding?.[channel];
  if (encoding === undefined) return undefined;
  const scale = program.resolvedScales[encoding.scale];
  if (scale === undefined) {
    throw new Error(
      `${layer.mark.type} mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
    );
  }
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  const values = Object.hasOwn(scale, "unknown")
    ? readScaleField(dataset.values, encoding.field, encoding.fieldType, {
        allowUnknown: true
      })
    : categorical
      ? readNominalField(dataset.values, encoding.field)
      : encoding.fieldType === "temporal"
        ? readTemporalField(dataset.values, encoding.field)
        : readQuantitativeField(dataset.values, encoding.field);
  return categorical && POSITION_CHANNELS.includes(channel)
    ? mapOrdinalPositionValues(values, scale)
    : mapScaleConsumerValues(values, scale, channel);
}
