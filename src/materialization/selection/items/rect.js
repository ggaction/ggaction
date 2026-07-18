import { resolveRectRows } from "../../rect.js";
import {
  concreteProperties,
  finalizeItems,
  itemKey,
  ownFields
} from "./common.js";

export function resolveRectItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  if (graphic?.type !== "rect" || !Array.isArray(graphic.items)) {
    throw new Error(`Rect mark "${layer.id}" is incomplete for selection.`);
  }
  const rows = resolveRectRows(program, layer, dataset);
  const definitions = rows.map((item, graphicIndex) => ({
    key: itemKey(layer, "rect", item.sourceIndex),
    fields: ownFields(item.row),
    channels: item.channels,
    properties: concreteProperties(graphic.items[graphicIndex]?.properties),
    members: [item.row]
  }));
  return finalizeItems(program, layer, "rect", definitions, "rect");
}
