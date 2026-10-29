import { validateGeneratedItemLimit } from "../../core/validation.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateWaterfallBinding, readWaterfallItems } from "../../grammar/waterfallPlot.js";
import { formatTextValue } from "../../grammar/text.js";
import { resolveBarSlotBandwidth, resolveBarWidth } from "../../grammar/bars/geometry.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolvePrimitiveGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { identifyItems } from "../selection/items/common.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { readScaleField, mapOrdinalPositionValues, mapContinuousScaleValues } from "../../grammar/scales/index.js";

export function waterfallScaleValues(dataset, layer, encoding, channel) {
  const layout = readWaterfallItems(dataset, layer);
  if (channel === "y") return layout.items.flatMap(item => [item.start, item.end]);
  return readScaleField(dataset.values, encoding.field, encoding.fieldType);
}
export function resolveWaterfallPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateWaterfallBinding(layer, config);
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Waterfall plots require a Cartesian coordinate.");
  const dataset = requireDataset(program, layer.data), binding = layer.waterfall;
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const layout = readWaterfallItems(dataset, layer), rows = dataset.values;
  const xEncoding = layer.encoding.x, xScale = resolvedScales[xEncoding.scale], yScale = resolvedScales[layer.encoding.y.scale];
  if (xScale === undefined || yScale === undefined) throw new TypeError("Waterfall requires resolved stage and value scales.");
  const categories = readScaleField(rows, xEncoding.field, xEncoding.fieldType);
  const centers = mapOrdinalPositionValues(categories, xScale);
  const width = resolveBarWidth(config.width, resolveBarSlotBandwidth(xScale));
  const color = layer.encoding.color;
  const colors = color === undefined ? undefined : mapScaleConsumerValues(readScaleField(rows, color.field, color.fieldType), resolvedScales[color.scale], "color");
  const definitions = layout.items.map((entry, index) => {
    const row = rows[index], rowKey = dataset.rowKeys[index], memberKeys = entry.memberIndices.map(i => dataset.rowKeys[i]);
    const [startY, endY, runningY] = mapContinuousScaleValues([entry.start, entry.end, entry.runningBefore], yScale);
    return { ...entry, rowKey, members: entry.memberIndices.map(i => rows[i]), memberKeys, fields: { ...row },
      channels: { category: categories[index], role: entry.role, value: entry.value, start: entry.start, end: entry.end, runningBefore: entry.runningBefore, runningAfter: entry.runningAfter, ...(color ? { color: row[color.field] } : {}) },
      center: centers[index], startY, endY, runningY, properties: { x: centers[index] - width / 2, y: Math.min(startY, endY), width, height: Math.abs(endY - startY) } };
  });
  const items = identifyItems(program, layer, "item", definitions), graphics = [];
  validateGeneratedItemLimit(items.length * (1 + (binding.labels === false ? 0 : 1)) + (config.connectors === false ? 0 : Math.max(0, items.length - 1)), "Waterfall graphic count");
  for (const [index, item] of items.entries()) {
    const lineage = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: item.memberKeys };
    const add = (role, type, properties) => {
      graphics.push({ type, properties, identity: { key: item.key, topology: item.topology, role, lineage } });
      item.graphicRoles.push(role);
    };
    item.graphicRoles = [];
    if (index > 0 && config.connectors !== false) {
      const previous = items[index - 1].properties;
      add("connector", "path", { commands: [{ op: "M", x: previous.x + previous.width, y: item.runningY }, { op: "L", x: item.properties.x, y: item.runningY }], ...config.connectors });
    }
    const { positiveFill, negativeFill, totalFill, subtotalFill, ...appearance } = config.bars;
    const fill = colors?.[index] ?? (item.role === "total" ? totalFill : item.role === "subtotal" ? subtotalFill : item.value < 0 ? negativeFill : positiveFill);
    add("bar", "rect", { ...item.properties, fill, ...appearance });
    if (binding.labels !== false) {
      const value = binding.labels.content === "category" ? item.channels.category : item[binding.labels.content];
      const text = formatTextValue(value, binding.labels.format);
      if (text !== undefined) {
        const { offset, ...style } = config.labels;
        const properties = bindTextFontProperties(program, { x: item.center, y: item.properties.y - offset, text, textAlign: "center", textBaseline: "bottom", ...style });
        resolvePrimitiveGraphicBounds("text", properties, program.materializationConfigs.textMetrics);
        add("label", "text", properties);
      }
    }
  }
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, dataset, running: layout.running };
}
