import { validateGeneratedItemLimit } from "../../core/validation.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateOHLCBinding, readOHLCItems } from "../../grammar/ohlcPlot.js";
import { formatTextValue } from "../../grammar/text.js";
import { resolveBarWidth, resolveBarInterval } from "../../grammar/bars/geometry.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolvePrimitiveGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { identifyItems } from "../selection/items/common.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { readScaleField, mapOrdinalPositionValues, mapContinuousScaleValues } from "../../grammar/scales/index.js";

export function ohlcScaleValues(dataset, layer, encoding) {
  const rows = readOHLCItems(dataset, layer).items.map(item => dataset.values[item.sourceIndex]);
  return readScaleField(rows, encoding.field, encoding.fieldType, { temporalUnit: encoding.temporalUnit });
}
export function resolveOHLCPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateOHLCBinding(layer, config);
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("OHLC plots require a Cartesian coordinate.");
  const dataset = requireDataset(program, layer.data), binding = layer.ohlc;
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const layout = readOHLCItems(dataset, layer), rows = layout.items.map(item => dataset.values[item.sourceIndex]);
  const xEncoding = layer.encoding.x, xScale = resolvedScales[xEncoding.scale], yScale = resolvedScales[layer.encoding.y.scale];
  if (xScale === undefined || yScale === undefined) throw new TypeError("OHLC requires resolved x and price scales.");
  const xValues = readScaleField(rows, xEncoding.field, xEncoding.fieldType, { temporalUnit: xEncoding.temporalUnit });
  const categorical = ["nominal", "ordinal"].includes(xEncoding.fieldType);
  const centers = categorical ? mapOrdinalPositionValues(xValues, xScale) : mapContinuousScaleValues(xValues, xScale);
  const width = config.width ?? (categorical ? { band: 0.72 } : { pixels: 5 });
  if (!categorical && width.band !== undefined) throw new TypeError("OHLC band width requires categorical x; use pixels or a temporal interval.");
  const color = layer.encoding.color;
  const colors = color === undefined ? undefined : mapScaleConsumerValues(readScaleField(rows, color.field, color.fieldType), resolvedScales[color.scale], "color");
  const definitions = layout.items.map((entry, index) => {
    const row = rows[index], rowKey = dataset.rowKeys[entry.sourceIndex];
    const [low, high, open, close] = mapContinuousScaleValues([entry.low, entry.high, entry.open, entry.close], yScale);
    const band = width.interval ? resolveBarInterval(width, xValues[index], xScale)
      : { width: resolveBarWidth(width, Math.abs(xScale.bandwidth ?? xScale.step)), position: undefined };
    const left = band.position ?? centers[index] - band.width / 2;
    return { ...entry, rowKey, members: [row], memberKeys: [rowKey], fields: { ...row },
      channels: { x: xValues[index], low: entry.low, high: entry.high, open: entry.open, close: entry.close, trend: entry.trend, ...(color ? { color: row[color.field] } : {}) },
      x: band.position === undefined ? centers[index] : left + band.width / 2, lowY: low, highY: high, openY: open, closeY: close,
      properties: { x: left, y: Math.min(low, high), width: band.width, height: Math.abs(high - low) } };
  });
  const items = identifyItems(program, layer, "item", definitions), graphics = [];
  for (const [index, item] of items.entries()) {
    const lineage = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: item.memberKeys };
    const add = (role, type, properties) => {
      if (type === "line" && properties.outline && properties.outline !== false) {
        const { x1, y1, x2, y2, ...appearance } = properties;
        type = "path";
        properties = { commands: [{ op: "M", x: x1, y: y1 }, { op: "L", x: x2, y: y2 }], ...appearance };
      }
      graphics.push({ type, properties, identity: { key: item.key, topology: item.topology, role, lineage } });
      item.graphicRoles.push(role);
    };
    item.graphicRoles = [];
    add("stem", "line", { x1: item.x, x2: item.x, y1: item.lowY, y2: item.highY, ...config.stem });
    const { upFill, downFill, ...body } = config.body;
    const fill = colors?.[index] ?? (item.trend === "down" ? downFill : upFill);
    if (item.trend !== "flat") add("body", "rect", { x: item.properties.x, y: Math.min(item.openY, item.closeY), width: item.properties.width, height: Math.abs(item.closeY - item.openY), fill, ...body });
    else if (binding.doji === "line") add("body", "line", { x1: item.properties.x, x2: item.properties.x + item.properties.width, y1: item.openY, y2: item.openY, ...body });
    if (binding.labels !== false) {
      const text = formatTextValue(item.channels[binding.labels.content], binding.labels.format);
      if (text !== undefined) {
        const { offset, ...appearance } = config.labels;
        const properties = bindTextFontProperties(program, { x: item.x, y: Math.min(item.lowY, item.highY) - offset, text, textAlign: "center", textBaseline: "bottom", ...appearance });
        resolvePrimitiveGraphicBounds("text", properties, program.materializationConfigs.textMetrics);
        add("label", "text", properties);
      }
    }
  }
  validateGeneratedItemLimit(graphics.length, "OHLC graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, dataset, omittedSourceIndices: layout.omittedSourceIndices };
}
