import { canonicalJSON } from "../../core/contentDigest.js";
import { aggregateRows } from "../../grammar/aggregate.js";
import { resolveBarCellOpacities } from "./resolve.js";
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

export function resolveHistogramInput(dataset, xEncoding, yEncoding) {
  const allValues = readQuantitativeField(dataset.values, xEncoding.field);
  if (xEncoding.weight === undefined) {
    return {
      rows: dataset.values,
      values: allValues,
      entries: dataset.values.map((row, index) => ({ row, index })),
      mass(entries) {
        if (yEncoding?.aggregate !== undefined && yEncoding.aggregate !== "count") {
          // Empty/insufficient samples have no visible segment, just like zero
          // count bins. Use the same native aggregate owner as category bars.
          return aggregateRows(entries.map(entry => entry.row), yEncoding.field, yEncoding.aggregate) ?? 0;
        }
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

export function deriveHistogramCells({ dataset, layer, xEncoding, xScale, resolvedScales = {}, colorDomain }) {
  const input = resolveHistogramInput(dataset, xEncoding, layer.encoding.y);
  const { rows, values: xValues, entries } = input;
  const bins = resolveHistogramBins({ values: xValues, bin: xEncoding.bin, domain: xScale.domain,
    nice: xScale.nice ?? true, zero: xScale.zero ?? false });
  const colorEncoding = layer.encoding?.color;
  const identity = layer.encoding?.group === undefined ? undefined : readSeriesIdentity(rows, layer);
  const colors = colorEncoding === undefined ? undefined : readNominalField(rows, colorEncoding.field);
  const domain = identity?.domain ?? (colorEncoding === undefined ? [undefined]
    : colorDomain ?? resolvedScales[colorEncoding.scale]?.domain);
  if (domain === undefined) throw new Error(`Bar mark "${layer.id}" requires a resolved color scale.`);
  const keys = identity?.values ?? colors ?? rows.map(() => undefined);
  const categoryIndices = new Map(domain.map((value, index) => [value, index]));
  const partitions = bins.boundaries.slice(0, -1).map(() => domain.map(() => []));
  xValues.forEach((value, index) => {
    const bin = findHistogramBinIndex(value, bins.boundaries), category = categoryIndices.get(keys[index]);
    if (bin !== -1 && category !== undefined) partitions[bin][category].push(entries[index]);
  });
  return partitions.flatMap((cells, bin) => cells.map((cell, category) => {
    const members = cell.map(entry => entry.row);
    let colorValue;
    if (colorEncoding !== undefined) {
      const values = readNominalField(members, colorEncoding.field);
      if (new Set(values).size > 1) throw new Error("Histogram color requires one value within each bin/series cell.");
      colorValue = identity === undefined ? domain[category] : values[0];
    }
    return { bin, start: bins.boundaries[bin], end: bins.boundaries[bin + 1], category, categoryCount: domain.length,
      mass: input.mass(cell), members, sourceIndices: cell.map(entry => entry.index),
      ...(identity === undefined ? {} : { series: domain[category] }),
      ...(colorEncoding === undefined ? {} : { colorValue }) };
  }));
}

export function deriveHistogramSegmentsFromCells(cells, layer, resolvedScales, { mapColor = true } = {}) {
  const layout = resolveBarColorLayout(layer), bins = new Map();
  for (const cell of cells) {
    if (!bins.has(cell.bin)) bins.set(cell.bin, []);
    bins.get(cell.bin).push(cell);
  }
  return [...bins.values()].flatMap(partition => layoutSeriesPartition(partition.map(cell => cell.mass), layout).map(segment => {
    const cell = partition[segment.index], colorEncoding = layer.encoding?.color;
    const scale = resolvedScales[colorEncoding?.scale];
    const color = colorEncoding === undefined || !mapColor ? undefined : mapOrdinalValues([cell.colorValue], scale.domain, scale.range)[0];
    const { mass: _mass, sourceIndices: _sourceIndices, ...result } = cell;
    return { ...result, stackStart: segment.start, stackEnd: segment.end, ...(color === undefined ? {} : { color }) };
  }));
}

export function deriveHistogramSegments(options) {
  return deriveHistogramSegmentsFromCells(deriveHistogramCells(options), options.layer, options.resolvedScales);
}

export function deriveHistogramRectangles(required, resolved) {
  const xScale = resolved.resolvedScales[required.xEncoding.scale];
  const yScale = resolved.resolvedScales[required.yEncoding.scale];
  const segments = required.conditional?.segments ?? deriveHistogramSegments({
    ...required,
    resolvedScales: resolved.resolvedScales
  });
  const opacities = resolveBarCellOpacities(resolved, required.layer, segments.map(segment => segment.members));
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
    const selected = required.conditional?.bindings.get(canonicalJSON([segment.bin, segment.category]));
    const xScale = resolved.resolvedScales[selected?.x.binding.scale ?? required.xEncoding.scale];
    const yScale = resolved.resolvedScales[selected?.y.binding.scale ?? required.yEncoding.scale];
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
      ...(strokes === undefined ? {} : { stroke: strokes[index] }),
      ...(opacities === undefined ? {} : { opacity: opacities[index] })
    };
  });
}
