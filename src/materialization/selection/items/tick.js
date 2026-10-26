import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  itemKey,
  ownFields
} from "./common.js";

export function resolveTickItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  const completePosition =
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined;
  if (!Array.isArray(graphic?.items) || !completePosition) {
    throw new Error(`Tick mark "${layer.id}" is incomplete for selection.`);
  }
  const definitions = dataset.values.map((row, index) => ({
      key: itemKey(layer, "tick", index),
      fields: ownFields(row),
      channels: channelMapFromRow(row, layer),
      properties: concreteProperties(graphic.items[index]?.properties),
      members: [row]
    }));
  return finalizeItems(program, layer, "tick", definitions, "line");
}
