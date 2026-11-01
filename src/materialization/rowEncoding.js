import { mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { identifyItems } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";
import { hasPositionBinding } from "../core/encodingBindings.js";
import {
  OFFSET_POSITION_CHANNELS,
  POSITION_CHANNELS,
  POSITION_ENCODING_CHANNELS
} from "../core/vocabulary.js";
import {
  mapOrdinalOffsetValues,
  mapOrdinalPositionValues,
  readScaleField
} from "../grammar/scales/index.js";
import { applyOffsetPositionValues } from "../grammar/positionOffset.js";
export { applyOffsetPositionValues } from "../grammar/positionOffset.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { mapScaleConsumerValues } from "./scales/map.js";

export function resolveRowEncodingValues(program, layer, dataset, channel, resolvers, { includeScale = false, mapped = true } = {}) {
  const definition = layer.conditionals?.[channel];
  if (definition !== undefined && POSITION_ENCODING_CHANNELS.includes(channel)) {
    const items = identifyItems(program, layer, layer.mark.type, dataset.values.map((row, index) => ({
      rowKey: dataset.rowKeys[index], fields: row, members: [row], rows: memberRowReferences(program, [row], layer.data, [dataset.rowKeys[index]])
    })));
    const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
    return mapConditionalValues(program, layer, channel, items, membership, { includeScale, mapped });
  }
  const encoding = layer.encoding?.[channel];
  if (encoding === undefined) return undefined;
  const scale = program.resolvedScales[encoding.scale];
  if (scale === undefined) {
    throw new Error(
      `${layer.mark.type} mark "${layer.id}" requires resolved ${channel} scale "${encoding.scale}".`
    );
  }
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  const values = Object.hasOwn(encoding, "datum")
    ? Array(dataset.values.length).fill(normalizePositionDatum(
        encoding.datum,
        encoding.fieldType,
        channel,
        encoding.temporalUnit,
        layer.mark.type[0].toUpperCase() + layer.mark.type.slice(1)
      ))
    : readScaleField(dataset.values, encoding.field, encoding.fieldType, {
        allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: encoding.temporalUnit
      });
  const output = !mapped ? values : categorical && OFFSET_POSITION_CHANNELS.includes(channel) ? mapOrdinalOffsetValues(values, scale)
    : categorical && POSITION_CHANNELS.includes(channel) ? mapOrdinalPositionValues(values, scale)
    : mapScaleConsumerValues(values, scale, channel);
  return includeScale ? output.map(value => ({ value, scale })) : output;
}

export function resolveRowPositionValues(program, layer, dataset, channel, resolvers) {
  const offsetChannel = channel === "x" ? "xOffset" : "yOffset";
  if (!hasPositionBinding(layer, offsetChannel)) return resolveRowEncodingValues(program, layer, dataset, channel, resolvers);
  const base = resolveRowEncodingValues(program, layer, dataset, channel, resolvers, { includeScale: true });
  if (base === undefined) return undefined;
  const offset = resolveRowEncodingValues(program, layer, dataset, offsetChannel, resolvers, { includeScale: true });
  return base.map((item, index) => applyOffsetPositionValues({
    base: [item.value], offset: [offset[index].value], parentScale: item.scale,
    offsetScale: offset[index].scale, channel
  })[0]);
}
