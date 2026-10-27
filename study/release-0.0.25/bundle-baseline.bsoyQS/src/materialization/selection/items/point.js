import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  itemKey,
  ownFields,
  reorderHighlightedItems
} from "./common.js";

export function resolvePointItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  const completePosition = (
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  ) || (
    layer.encoding?.theta?.scale !== undefined &&
    layer.encoding?.radius?.scale !== undefined
  );
  if (
    !Array.isArray(graphic?.items) ||
    !completePosition
  ) {
    throw new Error(`Point mark "${layer.id}" is incomplete for selection.`);
  }
  const definitions = dataset.values.map((row, index) => ({
    key: itemKey(layer, "point", index),
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    properties: concreteProperties(graphic.items[index]?.properties),
    members: [row]
  }));
  return finalizeItems(
    program,
    layer,
    "point",
    reorderHighlightedItems(program, layer, definitions),
    program.graphicSpec.objects[layer.id]?.type
  );
}
