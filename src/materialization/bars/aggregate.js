import { deriveSeriesBarCells } from "../../grammar/bars/aggregate.js";
import { resolveBarChannels, resolveBarColorLayout, resolveBarOffsetChannel } from "../../grammar/bars/policy.js";
import { mapContinuousScaleValues, mapOrdinalPositionValues } from "../../grammar/scales/index.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { DEFAULT_BAR_FILL, resolveBarAppearance } from "./resolve.js";
import { resolveBarWidth } from "../../grammar/bars/geometry.js";
import { finiteMidpoint } from "../../grammar/numeric.js";

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
  const segments = deriveSeriesBarCells(dataset.values, layer, temporal ? undefined : categoryScale.domain,
    grouped ? offsetScale.domain : layer.encoding.group === undefined && color?.fieldType !== "quantitative" ? colorScale?.domain : undefined);
  const fills = color === undefined ? undefined : mapScaleConsumerValues(segments.map(segment => segment.cell.color), colorScale, "color");
  const config = resolved.markConfigs[layer.id] ?? {};
  const existing = resolved.graphicSpec.objects[layer.id].items;
  const width = resolveBarWidth(widthConfig, grouped ? offsetScale.bandwidth : Math.abs(categoryScale.bandwidth ?? categoryScale.step));
  const indices = new Map(categoryScale.domain.map((value, index) => [value, index]));
  return segments.map(({ cell, start, end, seriesIndex }, index) => {
    const categoryValue = cell[channels.category];
    const categoryCenter = (temporal ? mapContinuousScaleValues : mapOrdinalPositionValues)([categoryValue], categoryScale)[0];
    let position = !grouped && layer.encoding.group !== undefined && layer.encoding.group.inferredFrom === undefined && !temporal && categoryScale.step > 0
      ? (categoryScale.start ?? categoryScale.range[0]) + indices.get(categoryValue) * categoryScale.step + categoryScale.bandwidth / 2 - width / 2
      : categoryCenter - width / 2;
    if (grouped) {
      const direction = Math.sign(categoryScale.step ?? categoryScale.range[1] - categoryScale.range[0]) || 1;
      const offsetCenter = offsetScale.start + seriesIndex * offsetScale.step + (Math.sign(offsetScale.step) || 1) * offsetScale.bandwidth / 2;
      if (vertical && direction > 0 && offsetScale.step > 0) {
        const categoryStart = temporal ? categoryCenter - categoryScale.bandwidth / 2
          : (categoryScale.start ?? categoryScale.range[0]) + indices.get(categoryValue) * categoryScale.step;
        position = categoryStart + offsetScale.start + seriesIndex * offsetScale.step + (offsetScale.bandwidth - width) / 2;
      } else position = categoryCenter + direction * (offsetCenter - finiteMidpoint(...offsetScale.range)) - width / 2;
    }
    const [a, b] = mapContinuousScaleValues([start, end], measureScale);
    return { x: vertical ? position : Math.min(a, b), y: vertical ? Math.min(a, b) : position,
      width: vertical ? width : Math.abs(a - b), height: vertical ? Math.abs(a - b) : width,
      fill: fills?.[index] ?? config.barAppearance?.fill ?? config.fill ?? DEFAULT_BAR_FILL,
      ...resolveBarAppearance(config, existing[index]?.properties) };
  });
}
