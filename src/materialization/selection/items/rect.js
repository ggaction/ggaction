import { resolveRectRows } from "../../rect.js";
import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  itemKey,
  ownFields
} from "./common.js";

function resolveGradientPlotItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  return finalizeItems(
    program,
    layer,
    "rect",
    dataset.values.map((row, index) => ({
      key: itemKey(layer, "rect", index),
      fields: ownFields(row),
      channels: channelMapFromRow(row, layer),
      properties: concreteProperties(graphic.items[index]?.properties),
      members: [row]
    })),
    "rect"
  );
}

export function resolveRectItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  if (graphic?.type !== "rect" || !Array.isArray(graphic.items)) {
    throw new Error(`Rect mark "${layer.id}" is incomplete for selection.`);
  }
  if (program.markConfigs[layer.id]?.gradientPlot?.materialized === true) {
    return resolveGradientPlotItems(program, layer, dataset);
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
