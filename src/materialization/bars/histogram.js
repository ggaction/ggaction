import { readSeriesIdentity } from "../../grammar/pathSeries.js";
import {
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../grammar/histogram.js";
import {
  mapContinuousScaleValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField,
  readScaleField
} from "../../grammar/scales/index.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { resolveBarColorLayout } from "../../grammar/bars/policy.js";
import { layoutSeriesPartition } from "../../grammar/seriesLayout.js";
import {
  DEFAULT_BAR_FILL,
  resolveBarAppearance
} from "./resolve.js";
import {
  readStatisticalWeights,
  sumEntryWeights,
  summarizeStatisticalWeights,
  validateWeightedNumericFields
} from "../../grammar/weightedStatistics.js";

export function resolveHistogramInput(dataset, xEncoding) {
  const allValues = readQuantitativeField(dataset.values, xEncoding.field);
  if (xEncoding.weight === undefined) {
    return {
      rows: dataset.values,
      values: allValues,
      entries: dataset.values.map((row, index) => ({ row, index })),
      mass(entries) {
        return entries.length;
      }
    };
  }
  const weights = readStatisticalWeights(
    dataset.values,
    xEncoding.weight,
    "Histogram"
  );
  validateWeightedNumericFields(weights.entries, [xEncoding.field], "Histogram");
  const summary = summarizeStatisticalWeights(
    weights.entries,
    weights.definition.kind,
    "Histogram data"
  );
  return {
    rows: summary.positive.map(entry => entry.row),
    values: summary.positive.map(entry => entry.row[xEncoding.field]),
    entries: summary.positive,
    mass(entries) {
      return sumEntryWeights(entries, summary, "Histogram bin mass");
    }
  };
}

export function deriveHistogramSegments({
  dataset,
  layer,
  xEncoding,
  xScale,
  resolvedScales
}) {
  const input = resolveHistogramInput(dataset, xEncoding);
  const { rows, values: xValues, entries } = input;
  const bins = resolveHistogramBins({
    values: xValues,
    bin: xEncoding.bin,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  const colorEncoding = layer.encoding?.color;
  const layout = resolveBarColorLayout(layer);

  if (layer.encoding?.group !== undefined) {
    const identity = readSeriesIdentity(rows, layer);
    const cellRows = bins.boundaries.slice(0, -1).map(() => identity.domain.map(() => []));
    const index = new Map(identity.domain.map((value, i) => [value, i]));
    xValues.forEach((value, i) => { const bin = findHistogramBinIndex(value, bins.boundaries);
      if (bin !== -1) cellRows[bin][index.get(identity.values[i])].push(entries[i]); });
    return cellRows.flatMap((cells, bin) => layoutSeriesPartition(cells.map(input.mass), layout).map(segment => {
      const members = cells[segment.index].map(entry => entry.row);
      let color, colorValue;
      if (colorEncoding !== undefined) {
        const values = readNominalField(members, colorEncoding.field);
        if (new Set(values).size !== 1) throw new Error("Histogram color requires one value within each bin/series cell.");
        colorValue = values[0];
        const scale = resolvedScales[colorEncoding.scale];
        color = mapOrdinalValues([colorValue], scale.domain, scale.range)[0];
      }
      return { bin, start: bins.boundaries[bin], end: bins.boundaries[bin + 1],
        category: segment.index, categoryCount: identity.domain.length,
        stackStart: segment.start, stackEnd: segment.end, members,
        ...(color === undefined ? {} : { color, colorValue }) };
    }));
  }

  if (colorEncoding?.scale === undefined) {
    const cellRows = bins.boundaries.slice(0, -1).map(() => []);
    xValues.forEach((value, index) => {
      const bin = findHistogramBinIndex(value, bins.boundaries);
      if (bin !== -1) cellRows[bin].push(entries[index]);
    });
    return cellRows.flatMap((cell, bin) =>
      layoutSeriesPartition([input.mass(cell)], layout).map(segment => ({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        category: segment.index,
        categoryCount: 1,
        stackStart: segment.start,
        stackEnd: segment.end,
        members: cell.map(entry => entry.row)
      }))
    );
  }

  const colorScale = resolvedScales[colorEncoding.scale];
  if (colorScale === undefined) {
    throw new Error(
      `Bar mark "${layer.id}" requires a resolved color scale.`
    );
  }
  const colorValues = readNominalField(rows, colorEncoding.field);
  mapOrdinalValues(colorValues, colorScale.domain, colorScale.range);
  const categoryIndex = new Map(
    colorScale.domain.map((value, index) => [value, index])
  );
  const cells = bins.boundaries.slice(0, -1).map(() =>
    colorScale.domain.map(() => [])
  );

  for (let index = 0; index < xValues.length; index += 1) {
    const bin = findHistogramBinIndex(xValues[index], bins.boundaries);
    const category = categoryIndex.get(colorValues[index]);
    if (bin !== -1 && category !== undefined) cells[bin][category].push(entries[index]);
  }

  const segments = [];
  for (let bin = 0; bin < cells.length; bin += 1) {
    const partition = layoutSeriesPartition(cells[bin].map(input.mass), layout);
    for (const segment of partition) {
      const category = segment.index;
      segments.push({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        category,
        categoryCount: cells[bin].length,
        stackStart: segment.start,
        stackEnd: segment.end,
        members: cells[bin][category].map(entry => entry.row),
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
  const existing = resolved.graphicSpec.objects[required.layer.id].items;
  const layout = resolveBarColorLayout(required.layer);
  const config = resolved.markConfigs[required.layer.id] ?? {};
  const appearance = config.barAppearance ?? {};
  const stroke = required.layer.encoding?.stroke;
  const strokeValues = stroke === undefined ? undefined : segments.map(segment => {
    const values = readScaleField(
      segment.members,
      stroke.field,
      stroke.fieldType,
      { temporalUnit: stroke.temporalUnit }
    );
    if (new Set(values).size !== 1) {
      throw new Error("Histogram stroke requires one value within each bin/series cell.");
    }
    return values[0];
  });
  const strokes = strokeValues === undefined ? undefined : mapScaleConsumerValues(
    strokeValues,
    resolved.resolvedScales[stroke.scale],
    "stroke"
  );

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
      ...resolveBarAppearance(config, existing[index]?.properties),
      ...(strokes === undefined ? {} : { stroke: strokes[index] })
    };
  });
}
