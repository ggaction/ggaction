import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  ownFields
} from "./common.js";

export function resolveTickItems(program, layer, dataset, grain, resolveItems, selectionResolvers) {
  const graphic = program.graphicSpec.objects[layer.id];
  const completePosition =
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined;
  if (!selectionResolvers?.sourceOnly && (!Array.isArray(graphic?.items) || !completePosition)) {
    throw new Error(`Tick mark "${layer.id}" is incomplete for selection.`);
  }
  const definitions = dataset.values.map((row, index) => ({
      rowKey: dataset.rowKeys[index],
      fields: ownFields(row),
      channels: channelMapFromRow(row, layer),
      properties: concreteProperties(graphic?.items?.[index]?.properties),
      members: [row]
    }));
  return finalizeItems(program, layer, "tick", definitions, "line", { selectionResolvers });
}
