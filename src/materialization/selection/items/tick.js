import { selectMarkItemKeys } from "../../../grammar/markSelection.js";
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
  let definitions = dataset.values.map((row, index) => ({
    key: itemKey(layer, "tick", index),
    fields: ownFields(row),
    channels: channelMapFromRow(row, layer),
    properties: concreteProperties(graphic.items[index]?.properties),
    members: [row]
  }));
  for (const config of Object.values(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (config.target !== layer.id || config.bringToFront !== true) continue;
    const selection = program.materializationConfigs.selections?.[config.selection];
    if (selection?.target !== layer.id) continue;
    const selected = new Set(selectMarkItemKeys(definitions, selection.selector));
    definitions = [
      ...definitions.filter(definition => !selected.has(definition.key)),
      ...definitions.filter(definition => selected.has(definition.key))
    ];
  }
  definitions = definitions.map((definition, index) => ({
    ...definition,
    properties: concreteProperties(graphic.items[index]?.properties)
  }));
  return finalizeItems(program, layer, "tick", definitions, "line");
}
