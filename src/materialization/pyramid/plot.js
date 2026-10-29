import { pyramidLabelProperties } from "./labels.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { layoutPyramidStages } from "../../grammar/pyramid/layout.js";
import { validatePyramidBinding, readPyramidStages } from "../../grammar/pyramid/plot.js";
import { formatTextValue } from "../../grammar/text.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { bindTextFontProperties } from "../textFont.js";
import { identifyItems } from "../selection/items/common.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { readScaleField } from "../../grammar/scales/fields.js";

export function resolvePyramidPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validatePyramidBinding(layer, config);
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Pyramid plots require a Cartesian viewport.");
  const dataset = requireDataset(program, layer.data), binding = layer.pyramid;
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const layout = layoutPyramidStages(readPyramidStages(dataset.values, dataset.rowKeys, binding),
    { ...binding.options, width: frame.width, height: frame.height });
  const color = layer.encoding?.color;
  const colors = color === undefined ? undefined : mapScaleConsumerValues(
    readScaleField(dataset.values, color.field, color.fieldType), resolvedScales[color.scale], "color");
  const definitions = layout.stages.map((stage, index) => {
    const row = dataset.values[index], rowKey = dataset.rowKeys[index];
    const { left, right, top, bottom } = stage.bounds;
    return { ...stage, rowKey, members: [row], memberKeys: [rowKey], fields: { ...row },
      channels: { stage: row[binding.stage], value: stage.value, percent: stage.percent, ...(color ? { color: row[color.field] } : {}) },
      properties: { x: frame.x + left, y: frame.y + top, width: right - left, height: bottom - top } };
  });
  const items = identifyItems(program, layer, "item", definitions), graphics = [];
  for (const [index, item] of items.entries()) {
    const lineage = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: item.memberKeys };
    const identity = role => ({ key: item.key, topology: item.topology, role, lineage });
    const commands = item.points.map(([x, y], pointIndex) => ({ op: pointIndex ? "L" : "M", x: frame.x + x, y: frame.y + y }));
    commands.push({ op: "Z" });
    graphics.push({ type: "path", properties: { commands, ...config.stages, ...(colors ? { fill: colors[index] } : {}) }, identity: identity("body") });
    item.graphicRoles = ["body"];
    if (binding.labels !== false) {
      const text = formatTextValue(item.channels[binding.labels.content], binding.labels.format);
      if (text !== undefined) {
        graphics.push({ type: "text", properties: bindTextFontProperties(program, pyramidLabelProperties(item, frame, binding.options.orientation,
          text, config.labels, program.materializationConfigs.textMetrics)), identity: identity("label") });
        item.graphicRoles.push("label");
      }
    }
  }
  validateGeneratedItemLimit(graphics.length, "Pyramid graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic, properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, dataset, layout };
}
