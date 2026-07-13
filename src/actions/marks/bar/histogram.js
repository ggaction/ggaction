import {
  countHistogramBins,
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../../grammar/histogram.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField
} from "../../../grammar/scales.js";
import {
  DEFAULT_BAR_FILL,
  DEFAULT_BAR_STROKE,
  DEFAULT_BAR_STROKE_WIDTH
} from "./resolve.js";

function deriveSegments({
  dataset,
  layer,
  xEncoding,
  xScale,
  resolvedScales
}) {
  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    maxBins: xEncoding.bin.maxBins,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  const colorEncoding = layer.encoding?.color;

  if (colorEncoding?.scale === undefined) {
    return countHistogramBins(xValues, bins.boundaries)
      .map((count, index) => ({
        bin: index,
        start: bins.boundaries[index],
        end: bins.boundaries[index + 1],
        stackStart: 0,
        stackEnd: count
      }))
      .filter(segment => segment.stackEnd > 0);
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
    let stackStart = 0;
    for (let category = 0; category < counts[bin].length; category += 1) {
      const count = counts[bin][category];
      if (count === 0) continue;
      const stackEnd = stackStart + count;
      segments.push({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        stackStart,
        stackEnd,
        color: mapOrdinalValues(
          [colorScale.domain[category]],
          colorScale.domain,
          colorScale.range
        )[0]
      });
      stackStart = stackEnd;
    }
  }
  return segments;
}

export function deriveHistogramRectangles(required, resolved) {
  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const segments = deriveSegments({
    ...required,
    resolvedScales: resolved.resolvedScales
  });
  const existing = resolved.graphicSpec.objects[required.layer.id].children;

  return segments.map((segment, index) => {
    const [x1, x2] = mapLinearValues(
      [segment.start, segment.end],
      xScale.domain,
      xScale.range
    );
    const [y1, y2] = mapLinearValues(
      [segment.stackStart, segment.stackEnd],
      yScale.domain,
      yScale.range
    );
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      fill:
        segment.color ??
        existing[index]?.properties.fill ??
        DEFAULT_BAR_FILL,
      stroke:
        existing[index]?.properties.stroke ?? DEFAULT_BAR_STROKE,
      strokeWidth:
        existing[index]?.properties.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH
    };
  });
}
