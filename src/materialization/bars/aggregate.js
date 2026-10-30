import { canonicalJSON } from "../../core/contentDigest.js";
import { resolveBarCellOpacities } from "./resolve.js";
import { deriveSeriesBarCells } from "../../grammar/bars/aggregate.js";
import { resolveBarChannels, resolveBarColorLayout, resolveBarOffsetChannel } from "../../grammar/bars/policy.js";
import {
  readScaleField
} from "../../grammar/scales/index.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { DEFAULT_BAR_FILL, resolveBarAppearance } from "./resolve.js";
import { resolveAggregateBarGeometry } from "../../grammar/bars/geometry.js";

export function deriveAggregateRectangles(required, resolved, widthConfig) {
  const { dataset, layer } = required;
  const channels = resolveBarChannels(layer), vertical = channels.orientation === "vertical";
  const categoryScale = resolved.resolvedScales[layer.encoding[channels.category].scale];
  const measureScale = resolved.resolvedScales[layer.encoding[channels.measure].scale];
  const color = layer.encoding.color, colorScale = resolved.resolvedScales[color?.scale];
  const grouped = resolveBarColorLayout(layer) === "group";
  const offsetScale = resolved.resolvedScales[layer.encoding[resolveBarOffsetChannel(layer)]?.scale];
  if (grouped && offsetScale === undefined) throw new Error("Grouped bar requires a resolved offset scale.");
  const temporal = categoryScale.type === "time";
  const segments = required.conditional?.segments ?? deriveSeriesBarCells(dataset.values, layer, required.conditional !== undefined || temporal ? undefined : categoryScale.domain,
    grouped ? offsetScale.domain : layer.encoding.group === undefined && color?.fieldType !== "quantitative" ? colorScale?.domain : undefined, required.conditional?.cells);
  const fills = color === undefined ? undefined : mapScaleConsumerValues(segments.map(segment => segment.cell.color), colorScale, "color");
  const stroke = layer.encoding?.stroke;
  const strokeValues = stroke === undefined ? undefined : segments.map(segment => {
    const values = readScaleField(
      segment.cell.sourceIndices.map(index => dataset.values[index]),
      stroke.field,
      stroke.fieldType,
      { temporalUnit: stroke.temporalUnit }
    );
    if (new Set(values).size !== 1) {
      throw new Error("Bar stroke requires one value within each aggregate cell.");
    }
    return values[0];
  });
  const strokes = strokeValues === undefined ? undefined : mapScaleConsumerValues(
    strokeValues,
    resolved.resolvedScales[stroke.scale],
    "stroke"
  );
  const opacities = resolveBarCellOpacities(resolved, layer, segments.map(segment => segment.cell.sourceIndices.map(index => dataset.values[index])));
  const config = resolved.markConfigs[layer.id] ?? {};
  const existing = resolved.graphicSpec.objects[layer.id].items;
  if (widthConfig?.interval !== undefined && (grouped || !temporal)) throw new Error("Bar interval width requires ungrouped aggregate temporal categories.");
  return segments.map(({ cell, start, end, seriesIndex }, index) => {
    const selected = required.conditional?.bindings.get(canonicalJSON(cell.sourceIndices));
    const categoryScale = resolved.resolvedScales[selected?.[channels.category]?.binding.scale ?? layer.encoding[channels.category].scale];
    const measureScale = resolved.resolvedScales[selected?.[channels.measure]?.binding.scale ?? layer.encoding[channels.measure].scale];
    const offset = selected?.[resolveBarOffsetChannel(layer)];
    const offsetScale = resolved.resolvedScales[offset?.binding.scale ?? layer.encoding[resolveBarOffsetChannel(layer)]?.scale];
    return { ...resolveAggregateBarGeometry({ categoryScale, measureScale, offsetScale, categoryValue: cell[channels.category],
      start, end, widthConfig, grouped, vertical, seriesIndex, offsetValue: offset?.value,
      explicitGroup: layer.encoding.group !== undefined && layer.encoding.group.inferredFrom === undefined }),
      fill: fills?.[index] ?? config.barAppearance?.fill ?? config.fill ?? DEFAULT_BAR_FILL,
      ...resolveBarAppearance(config, existing[index]?.properties),
      ...(strokes === undefined ? {} : { stroke: strokes[index] }),
      ...(opacities === undefined ? {} : { opacity: opacities[index] }) };
  });
}
