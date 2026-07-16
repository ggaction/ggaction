import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import { mapLinearValues } from "../../grammar/scales.js";
import { sameOrderedValues } from "../../core/validation.js";
import {
  DEFAULT_BAR_STROKE,
  DEFAULT_BAR_STROKE_WIDTH
} from "./resolve.js";
import { resolveBarWidth } from "../../grammar/bars/geometry.js";

export function deriveGroupedRectangles(required, resolved, widthConfig) {
  const { dataset, layer } = required;
  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const colorEncoding = layer.encoding?.color;
  const offsetEncoding = layer.encoding?.xOffset;
  const colorScale = resolved.resolvedScales[colorEncoding?.scale];
  const offsetScale = resolved.resolvedScales[offsetEncoding?.scale];

  if (
    colorEncoding?.field === undefined ||
    offsetEncoding?.field !== colorEncoding.field ||
    colorScale === undefined ||
    offsetScale === undefined
  ) {
    throw new Error(
      `Grouped bar mark "${layer.id}" requires matching color and xOffset scales.`
    );
  }
  if (!sameOrderedValues(colorScale.domain, offsetScale.domain)) {
    throw new Error(
      `Grouped bar mark "${layer.id}" requires matching color and xOffset domains.`
    );
  }

  const xIndex = new Map(xScale.domain.map((value, index) => [value, index]));
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
  const direction = Math.sign(xScale.step) || 1;
  const offsetDirection = Math.sign(offsetScale.step) || 1;
  const width = resolveBarWidth(widthConfig, offsetScale.bandwidth);
  const baseline = mapLinearValues(
    [yScale.domain[0]],
    yScale.domain,
    yScale.range,
    { clamp: yScale.clamp ?? false }
  )[0];
  const cells = [...deriveBarAggregates(dataset.values, layer).values].sort(
    (left, right) =>
      (xScale.type === "time"
        ? left.x - right.x
        : xIndex.get(left.x) - xIndex.get(right.x)) ||
      offsetIndex.get(left.color) - offsetIndex.get(right.color)
  );
  const existing = resolved.graphicSpec.objects[layer.id].children;
  const config = resolved.markConfigs[layer.id] ?? {};
  const appearance = config.barAppearance ?? {};

  return cells.map((cell, index) => {
    const category = xIndex.get(cell.x);
    const offset = offsetIndex.get(cell.color);
    if ((xScale.type !== "time" && category === undefined) || offset === undefined) {
      throw new Error("Grouped bar value is outside a resolved ordinal domain.");
    }

    const temporal = xScale.type === "time";
    const categoryStart = temporal
      ? mapLinearValues(
          [cell.x],
          xScale.domain,
          xScale.range,
          { clamp: xScale.clamp ?? false }
        )[0] - xScale.bandwidth / 2
      : (xScale.start ?? xScale.range[0]) + category * xScale.step;
    const offsetCenter = offsetScale.start + offset * offsetScale.step +
      offsetDirection * offsetScale.bandwidth / 2;
    const center = temporal
      ? categoryStart + offsetCenter
      : xScale.step > 0 && offsetScale.step > 0
      ? categoryStart + offsetCenter
      : categoryStart + xScale.step / 2 +
        direction * (offsetCenter - offsetMidpoint);
    const x = temporal || (xScale.step > 0 && offsetScale.step > 0)
      ? categoryStart + offsetScale.start + offset * offsetScale.step +
        (offsetScale.bandwidth - width) / 2
      : center - width / 2;
    const valueY = mapLinearValues(
      [cell.y],
      yScale.domain,
      yScale.range,
      { clamp: yScale.clamp ?? false }
    )[0];

    return {
      x,
      y: Math.min(valueY, baseline),
      width,
      height: Math.abs(baseline - valueY),
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
