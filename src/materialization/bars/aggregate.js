import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import {
  BAR_ORIENTATIONS,
  resolveBarChannels,
  resolveBarColorLayout
} from "../../grammar/bars/policy.js";
import { layoutSeriesPartition } from "../../grammar/seriesLayout.js";
import {
  isDiscretePositionScaleType,
  mapLinearValues,
  mapOrdinalPositionValues
} from "../../grammar/scales.js";
import {
  DEFAULT_BAR_FILL,
  DEFAULT_BAR_STROKE,
  DEFAULT_BAR_STROKE_WIDTH
} from "./resolve.js";
import { deriveGroupedRectangles } from "./grouped.js";
import { resolveBarWidth } from "../../grammar/bars/geometry.js";

export function deriveAggregateRectangles(required, resolved, widthConfig) {
  const { dataset, layer } = required;
  const layout = resolveBarColorLayout(layer);
  if (layout === "group") {
    return deriveGroupedRectangles(required, resolved, widthConfig);
  }

  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const channels = resolveBarChannels(layer);
  const vertical = channels.orientation === BAR_ORIENTATIONS.vertical;
  const categoryScale = vertical ? xScale : yScale;
  const measureScale = vertical ? yScale : xScale;
  const colorEncoding = layer.encoding?.color;
  const colorScale = resolved.resolvedScales[colorEncoding?.scale];
  if (colorEncoding !== undefined && colorScale === undefined) {
    throw new Error(
      `Bar mark "${layer.id}" requires a resolved color scale.`
    );
  }

  const seriesDomain = colorScale?.domain ?? [undefined];
  const seriesIndex = new Map(
    seriesDomain.map((value, index) => [value, index])
  );
  const colors = new Map(seriesDomain.map((value, index) => [
    value,
    colorScale?.range[index % colorScale.range.length] ?? DEFAULT_BAR_FILL
  ]));
  const cells = deriveBarAggregates(dataset.values, layer).values;
  const discreteCategory = categoryScale.type === "ordinal" ||
    isDiscretePositionScaleType(categoryScale.type);
  const categoryDomain = discreteCategory
    ? categoryScale.domain
    : [...new Set(cells.map(cell => cell[channels.category]))]
        .sort((left, right) => left - right);
  const categoryIndex = new Map(
    categoryDomain.map((value, index) => [value, index])
  );
  const cellMap = new Map(cells.map(cell => [
    JSON.stringify([cell[channels.category], cell.color]),
    cell
  ]));
  const thickness = resolveBarWidth(
    widthConfig,
    Math.abs(categoryScale.bandwidth ?? categoryScale.step)
  );
  const baseline = layout === "overlay" ? measureScale.domain[0] : 0;
  const segments = [];

  for (const category of categoryDomain) {
    const partition = seriesDomain.map(color =>
      cellMap.get(JSON.stringify([category, color]))?.[channels.measure] ?? 0
    );
    for (const segment of layoutSeriesPartition(partition, layout, { baseline })) {
      const color = seriesDomain[segment.index];
      const cell = cellMap.get(JSON.stringify([category, color]));
      if (cell === undefined) continue;
      segments.push({ category, color, ...segment });
    }
  }

  const existing = resolved.graphicSpec.objects[layer.id].children;
  const config = resolved.markConfigs[layer.id] ?? {};
  const appearance = config.barAppearance ?? {};
  return segments.map((segment, index) => {
    const category = categoryIndex.get(segment.category);
    const color = seriesIndex.get(segment.color);
    if (category === undefined || color === undefined) {
      throw new Error("Bar value is outside a resolved ordinal domain.");
    }
    const categoryCenter = discreteCategory
      ? mapOrdinalPositionValues([segment.category], categoryScale)[0]
      : mapLinearValues(
          [segment.category],
          categoryScale.domain,
          categoryScale.range,
          { clamp: categoryScale.clamp ?? false }
        )[0];
    const [start, end] = mapLinearValues(
      [segment.start, segment.end],
      measureScale.domain,
      measureScale.range,
      { clamp: measureScale.clamp ?? false }
    );
    return {
      x: vertical
        ? categoryCenter - thickness / 2
        : Math.min(start, end),
      y: vertical
        ? Math.min(start, end)
        : categoryCenter - thickness / 2,
      width: vertical ? thickness : Math.abs(start - end),
      height: vertical ? Math.abs(start - end) : thickness,
      fill: segment.color === undefined
        ? appearance.fill ?? config.fill ?? colors.get(segment.color)
        : colors.get(segment.color),
      stroke: appearance.stroke === false
        ? "transparent"
        : appearance.stroke ?? config.stroke ?? existing[index]?.properties.stroke ?? DEFAULT_BAR_STROKE,
      strokeWidth:
        appearance.stroke === false
          ? 0
          : appearance.strokeWidth ?? config.strokeWidth ??
            existing[index]?.properties.strokeWidth ??
            DEFAULT_BAR_STROKE_WIDTH,
      ...((appearance.opacity ?? config.opacity) === undefined
        ? (existing[index]?.properties.opacity === undefined
            ? {}
            : { opacity: existing[index].properties.opacity })
        : { opacity: appearance.opacity ?? config.opacity })
    };
  });
}
