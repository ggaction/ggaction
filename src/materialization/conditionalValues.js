import { readScaleField } from "../grammar/scales/index.js";
import { conditionalFieldRows, mapConditionalValues } from "./conditionalMapping.js";
import { resolveMarkItems, resolveMarkSourceItems } from "./selection/policies/index.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";

export function readConditionalConsumerValues(program, layer, encoding, scale) {
  const items = resolveMarkSourceItems(program, layer.id);
  return readScaleField(conditionalFieldRows(items, encoding), encoding.field, encoding.fieldType, {
    allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: encoding.temporalUnit
  });
}

export function resolveConditionalValues(program, layer, channel, items) {
  const definition = layer.conditionals?.[channel];
  if (definition === undefined) return undefined;
  items ??= resolveMarkSourceItems(program, layer.id);
  const membership = conditionalSelectionMembership(program, layer, definition, items, { resolveMarkItems, resolveMarkSourceItems });
  return mapConditionalValues(program, layer, channel, items, membership);
}
