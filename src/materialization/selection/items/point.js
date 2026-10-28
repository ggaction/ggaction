import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  ownFields
} from "./common.js";
import { identifyItems } from "./common.js";

export function resolvePointSourceItems(program, layer, dataset) {
  return identifyItems(program, layer, "point", dataset.values.map((row, index) => ({
    rowKey: dataset.rowKeys[index], fields: ownFields(row), channels: channelMapFromRow(row, layer), members: [row]
  })));
}

export function resolvePointItems(program, layer, dataset, grain, resolveItems, selectionResolvers) {
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
    rowKey: dataset.rowKeys[index],
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    properties: concreteProperties(graphic.items[index]?.properties),
    members: [row]
  }));
  return finalizeItems(
    program,
    layer,
    "point",
    definitions,
    program.graphicSpec.objects[layer.id]?.type
  , { selectionResolvers });
}
