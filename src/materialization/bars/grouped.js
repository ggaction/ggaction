import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../grammar/scales/index.js";
import { sameOrderedValues } from "../../core/validation.js";
import {
  DEFAULT_BAR_STROKE,
  DEFAULT_BAR_STROKE_WIDTH
} from "./resolve.js";
import { resolveBarWidth } from "../../grammar/bars/geometry.js";
import { DEFAULT_SERIES_BASELINE } from "../../grammar/seriesLayout.js";
import {
  BAR_ORIENTATIONS,
  resolveBarChannels,
  resolveBarOffsetChannel
} from "../../grammar/bars/policy.js";

export function deriveGroupedRectangles(required, resolved, widthConfig) {
  const { dataset, layer } = required;
  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const channels = resolveBarChannels(layer);
  const vertical = channels.orientation === BAR_ORIENTATIONS.vertical;
  const categoryScale = vertical ? xScale : yScale;
  const measureScale = vertical ? yScale : xScale;
  const offsetChannel = resolveBarOffsetChannel(layer);
  const colorEncoding = layer.encoding?.color;
  const offsetEncoding = layer.encoding?.[offsetChannel];
  const colorScale = resolved.resolvedScales[colorEncoding?.scale];
  const offsetScale = resolved.resolvedScales[offsetEncoding?.scale];

  if (
    colorEncoding?.field === undefined ||
    offsetEncoding?.field !== colorEncoding.field ||
    colorScale === undefined ||
    offsetScale === undefined
  ) {
    throw new Error(
      `Grouped bar mark "${layer.id}" requires matching color and ${offsetChannel} scales.`
    );
  }
  if (!sameOrderedValues(colorScale.domain, offsetScale.domain)) {
    throw new Error(
      `Grouped bar mark "${layer.id}" requires matching color and ${offsetChannel} domains.`
    );
  }

  const categoryIndex = new Map(
    categoryScale.domain.map((value, index) => [value, index])
  );
  const offsetIndex = new Map(
    offsetScale.domain.map((value, index) => [value, index])
  );
  const colors = new Map(
    colorScale.domain.map((value, index) => [
      value,
      colorScale.range[index % colorScale.range.length]
    ])
  );
  const offsetMidpoint = (offsetScale.range[0] + offsetScale.range[1]) / 2;
  const categoryDirection = Math.sign(
    categoryScale.step ?? categoryScale.range[1] - categoryScale.range[0]
  ) || 1;
  const offsetDirection = Math.sign(offsetScale.step) || 1;
  const width = resolveBarWidth(widthConfig, offsetScale.bandwidth);
  const baseline = mapContinuousScaleValues(
    [DEFAULT_SERIES_BASELINE],
    measureScale
  )[0];
  const cells = [...deriveBarAggregates(dataset.values, layer).values].sort(
    (left, right) =>
      (categoryScale.type === "time"
        ? left[channels.category] - right[channels.category]
        : categoryIndex.get(left[channels.category]) -
          categoryIndex.get(right[channels.category])) ||
      offsetIndex.get(left.color) - offsetIndex.get(right.color)
  );
  const existing = resolved.graphicSpec.objects[layer.id].items;
  const config = resolved.markConfigs[layer.id] ?? {};
  const appearance = config.barAppearance ?? {};

  return cells.map((cell, index) => {
    const categoryValue = cell[channels.category];
    const category = categoryIndex.get(categoryValue);
    const offset = offsetIndex.get(cell.color);
    if ((categoryScale.type !== "time" && category === undefined) || offset === undefined) {
      throw new Error("Grouped bar value is outside a resolved ordinal domain.");
    }

    const offsetCenter = offsetScale.start + offset * offsetScale.step +
      offsetDirection * offsetScale.bandwidth / 2;
    const valuePosition = mapContinuousScaleValues(
      [cell[channels.measure]],
      measureScale
    )[0];
    let geometry;
    if (vertical) {
      // Preserve the established vertical arithmetic order exactly. Primitive
      // baselines intentionally compare concrete floating-point coordinates.
      const temporal = xScale.type === "time";
      const categoryStart = temporal
        ? mapContinuousScaleValues([cell.x], xScale)[0] - xScale.bandwidth / 2
        : (xScale.start ?? xScale.range[0]) + category * xScale.step;
      const center = temporal
        ? categoryStart + offsetCenter
        : xScale.step > 0 && offsetScale.step > 0
        ? categoryStart + offsetCenter
        : categoryStart + xScale.step / 2 +
          categoryDirection * (offsetCenter - offsetMidpoint);
      const x = temporal || (xScale.step > 0 && offsetScale.step > 0)
        ? categoryStart + offsetScale.start + offset * offsetScale.step +
          (offsetScale.bandwidth - width) / 2
        : center - width / 2;
      geometry = {
        x,
        y: Math.min(valuePosition, baseline),
        width,
        height: Math.abs(baseline - valuePosition)
      };
    } else {
      const categoryCenter = mapOrdinalPositionValues(
        [categoryValue],
        categoryScale
      )[0];
      const center = categoryCenter + categoryDirection *
        (offsetCenter - offsetMidpoint);
      geometry = {
        x: Math.min(valuePosition, baseline),
        y: center - width / 2,
        width: Math.abs(baseline - valuePosition),
        height: width
      };
    }

    return {
      ...geometry,
      fill: colors.get(cell.color),
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
