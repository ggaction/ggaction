import { rectUsesFields } from "../../../grammar/rects.js";
import { readRectItemGeometry } from "../../../grammar/roundedRect.js";
import { resolveRectRows } from "../../rect.js";
import {
  channelMapFromRow,
  concreteProperties,
  finalizeItems,
  itemKey,
  ownFields,
  uniqueFields
} from "./common.js";

function rectSelectionProperties(graphic, index) {
  const item = graphic.items[index];
  return {
    ...concreteProperties(item?.properties),
    ...(readRectItemGeometry({
      type: item?.type ?? graphic.type,
      properties: item?.properties
    }) ?? {})
  };
}

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
      properties: rectSelectionProperties(graphic, index),
      members: [row]
    })),
    "rect"
  );
}

export function resolveRectItems(program, layer, dataset) {
  const graphic = program.graphicSpec.objects[layer.id];
  const rounded = Object.hasOwn(program.markConfigs[layer.id] ?? {}, "cornerRadius");
  const compatibleCollection = rounded && graphic?.type === "collection" &&
    graphic.items?.every(item => ["rect", "path"].includes(item.type));
  if (
    (graphic?.type !== "rect" && !compatibleCollection) ||
    !Array.isArray(graphic.items)
  ) {
    throw new Error(`Rect mark "${layer.id}" is incomplete for selection.`);
  }
  if (program.markConfigs[layer.id]?.gradientPlot?.materialized === true) {
    return resolveGradientPlotItems(program, layer, dataset);
  }
  const rows = resolveRectRows(program, layer, dataset);
  const hasField = rectUsesFields(layer);
  const definitions = rows.map((item, graphicIndex) => ({
    key: itemKey(layer, "rect", item.sourceIndex),
    fields: hasField ? ownFields(item.row) : uniqueFields(dataset.values),
    channels: channelMapFromRow(item.row, layer),
    properties: rectSelectionProperties(graphic, graphicIndex),
    members: hasField ? [item.row] : dataset.values
  }));
  return finalizeItems(
    program,
    layer,
    "rect",
    definitions,
    rounded ? ["rect", "path"] : "rect"
  );
}
