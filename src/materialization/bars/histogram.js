import {
  countHistogramBins,
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../grammar/histogram.js";
import {
  mapContinuousScaleValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField
} from "../../grammar/scales.js";
import { resolveBarColorLayout } from "../../grammar/bars/policy.js";
import { layoutSeriesPartition } from "../../grammar/seriesLayout.js";
import {
  DEFAULT_BAR_FILL,
  DEFAULT_BAR_STROKE,
  DEFAULT_BAR_STROKE_WIDTH
} from "./resolve.js";

export function deriveHistogramSegments({
  dataset,
  layer,
  xEncoding,
  xScale,
  resolvedScales
}) {
  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    bin: xEncoding.bin,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  const colorEncoding = layer.encoding?.color;
  const layout = resolveBarColorLayout(layer);

  if (colorEncoding?.scale === undefined) {
    return countHistogramBins(xValues, bins.boundaries).flatMap((count, bin) =>
      layoutSeriesPartition([count], layout).map(segment => ({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        category: segment.index,
        categoryCount: 1,
        stackStart: segment.start,
        stackEnd: segment.end,
        members: dataset.values.filter((_, index) =>
          findHistogramBinIndex(xValues[index], bins.boundaries) === bin
        )
      }))
    );
  }

  const colorScale = resolvedScales[colorEncoding.scale];
  if (colorScale === undefined) {
    throw new Error(
      `Bar mark "${layer.id}" requires a resolved color scale.`
    );
  }
  const colorValues = readNominalField(dataset.values, colorEncoding.field);
  mapOrdinalValues(colorValues, colorScale.domain, colorScale.range);
  const categoryIndex = new Map(
    colorScale.domain.map((value, index) => [value, index])
  );
  const counts = bins.boundaries.slice(0, -1).map(() =>
    colorScale.domain.map(() => 0)
  );

  for (let index = 0; index < xValues.length; index += 1) {
    const bin = findHistogramBinIndex(xValues[index], bins.boundaries);
    const category = categoryIndex.get(colorValues[index]);
    if (bin !== -1 && category !== undefined) counts[bin][category] += 1;
  }

  const segments = [];
  for (let bin = 0; bin < counts.length; bin += 1) {
    const partition = layoutSeriesPartition(counts[bin], layout);
    for (const segment of partition) {
      const category = segment.index;
      segments.push({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        category,
        categoryCount: counts[bin].length,
        stackStart: segment.start,
        stackEnd: segment.end,
        members: dataset.values.filter((_, index) =>
          findHistogramBinIndex(xValues[index], bins.boundaries) === bin &&
          categoryIndex.get(colorValues[index]) === category
        ),
        color: mapOrdinalValues(
          [colorScale.domain[category]],
          colorScale.domain,
          colorScale.range
        )[0]
      });
    }
  }
  return segments;
}

export function deriveHistogramRectangles(required, resolved) {
  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const segments = deriveHistogramSegments({
    ...required,
    resolvedScales: resolved.resolvedScales
  });
  const existing = resolved.graphicSpec.objects[required.layer.id].children;
  const layout = resolveBarColorLayout(required.layer);
  const config = resolved.markConfigs[required.layer.id] ?? {};
  const appearance = config.barAppearance ?? {};

  return segments.map((segment, index) => {
    const [x1, x2] = mapContinuousScaleValues(
      [segment.start, segment.end],
      xScale
    );
    const [y1, y2] = mapContinuousScaleValues(
      [segment.stackStart, segment.stackEnd],
      yScale
    );
    const binStart = Math.min(x1, x2);
    const binWidth = Math.abs(x2 - x1);
    const groupedWidth = layout === "group"
      ? binWidth / segment.categoryCount
      : binWidth;
    const groupedX = layout === "group"
      ? binStart + groupedWidth * segment.category
      : binStart;
    return {
      x: groupedX,
      y: Math.min(y1, y2),
      width: groupedWidth,
      height: Math.abs(y2 - y1),
      fill:
        segment.color ??
        appearance.fill ??
        config.fill ??
        existing[index]?.properties.fill ??
        DEFAULT_BAR_FILL,
      stroke:
        appearance.stroke === false
          ? "transparent"
          : appearance.stroke ?? config.stroke ??
            existing[index]?.properties.stroke ??
            DEFAULT_BAR_STROKE,
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
