import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import { resolveBarColorLayout } from "../../grammar/bars/policy.js";
import { layoutSeriesPartition } from "../../grammar/seriesLayout.js";
import { mapLinearValues } from "../../grammar/scales.js";
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
  const colorEncoding = layer.encoding?.color;
  const colorScale = resolved.resolvedScales[colorEncoding?.scale];
  if (colorEncoding !== undefined && colorScale === undefined) {
    throw new Error(
      `Bar mark "${layer.id}" requires a resolved color scale.`
    );
  }

  const xIndex = new Map(xScale.domain.map((value, index) => [value, index]));
  const seriesDomain = colorScale?.domain ?? [undefined];
  const seriesIndex = new Map(
    seriesDomain.map((value, index) => [value, index])
  );
  const colors = new Map(seriesDomain.map((value, index) => [
    value,
    colorScale?.range[index % colorScale.range.length] ?? DEFAULT_BAR_FILL
  ]));
  const cells = deriveBarAggregates(dataset.values, layer).values;
  const cellMap = new Map(cells.map(cell => [
    JSON.stringify([cell.x, cell.color]),
    cell
  ]));
  const width = resolveBarWidth(
    widthConfig,
    Math.abs(xScale.bandwidth ?? xScale.step)
  );
  const baseline = layout === "overlay" ? yScale.domain[0] : 0;
  const segments = [];

  for (const x of xScale.domain) {
    const partition = seriesDomain.map(color =>
      cellMap.get(JSON.stringify([x, color]))?.y ?? 0
    );
    for (const segment of layoutSeriesPartition(partition, layout, { baseline })) {
      const color = seriesDomain[segment.index];
      const cell = cellMap.get(JSON.stringify([x, color]));
      if (cell === undefined) continue;
      segments.push({ x, color, ...segment });
    }
  }

  const existing = resolved.graphicSpec.objects[layer.id].children;
  return segments.map((segment, index) => {
    const category = xIndex.get(segment.x);
    const color = seriesIndex.get(segment.color);
    if (category === undefined || color === undefined) {
      throw new Error("Bar value is outside a resolved ordinal domain.");
    }
    const categoryStart = xScale.range[0] + category * xScale.step;
    const [start, end] = mapLinearValues(
      [segment.start, segment.end],
      yScale.domain,
      yScale.range,
      { clamp: yScale.clamp ?? false }
    );
    return {
      x: categoryStart + (xScale.step - width) / 2,
      y: Math.min(start, end),
      width,
      height: Math.abs(start - end),
      fill: colors.get(segment.color),
      stroke: existing[index]?.properties.stroke ?? DEFAULT_BAR_STROKE,
      strokeWidth:
        existing[index]?.properties.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH
    };
  });
}
