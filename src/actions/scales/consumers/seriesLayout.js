import { deriveBarAggregates } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import {
  countHistogramBins,
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../../grammar/histogram.js";
import { deriveDensityAreaSeries } from "../../../grammar/areaSeries.js";
import {
  resolveSeriesLayoutDomainValues
} from "../../../grammar/seriesLayout.js";
import {
  readNominalField,
  readQuantitativeField,
  resolveOrdinalDomain
} from "../../../grammar/scales/index.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findScale } from "./common.js";

export function resolveHistogramCountValues(program, consumer) {
  const xEncoding = consumer.layer.encoding?.x;
  const xScale = xEncoding?.scale === undefined
    ? undefined
    : findScale(program, xEncoding.scale);
  const dataset = findDataset(program, consumer.layer.data);
  if (xEncoding?.bin === undefined || xScale === undefined) {
    throw new Error(
      `Histogram mark "${consumer.layer.id}" requires a binned x scale.`
    );
  }
  if (dataset === undefined) {
    throw new Error(
      `Histogram mark "${consumer.layer.id}" requires an existing dataset.`
    );
  }
  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    bin: xEncoding.bin,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  return countHistogramBins(xValues, bins.boundaries);
}

function resolveHistogramPartitions(program, consumer) {
  const layer = consumer.layer;
  const dataset = findDataset(program, layer.data);
  const xEncoding = layer.encoding.x;
  const xScale = findScale(program, xEncoding.scale);
  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    bin: xEncoding.bin,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  const colorEncoding = layer.encoding?.color;
  if (colorEncoding?.scale === undefined) {
    return countHistogramBins(xValues, bins.boundaries).map(value => [value]);
  }
  const colorScale = findScale(program, colorEncoding.scale);
  const colorValues = readNominalField(dataset.values, colorEncoding.field);
  const colorDomain = resolveOrdinalDomain(colorScale.domain, colorValues);
  const colorIndex = new Map(colorDomain.map((value, index) => [value, index]));
  const partitions = bins.boundaries.slice(0, -1).map(() =>
    colorDomain.map(() => 0)
  );
  for (let index = 0; index < xValues.length; index += 1) {
    const bin = findHistogramBinIndex(xValues[index], bins.boundaries);
    const color = colorIndex.get(colorValues[index]);
    if (bin !== -1 && color !== undefined) partitions[bin][color] += 1;
  }
  return partitions;
}

function resolveAggregatePartitions(program, consumer) {
  const layer = consumer.layer;
  const dataset = findDataset(program, layer.data);
  const derived = deriveBarAggregates(dataset.values, layer);
  const channels = resolveBarChannels(layer);
  const categoryEncoding = layer.encoding[channels.category];
  const categoryScale = findScale(program, categoryEncoding.scale);
  const categoryValues = channels.category === "x"
    ? derived.xValues
    : derived.yValues;
  const categoryDomain = resolveOrdinalDomain(categoryScale.domain, categoryValues);
  const colorEncoding = layer.encoding?.color;
  if (
    colorEncoding?.scale === undefined ||
    colorEncoding.fieldType === "quantitative"
  ) {
    const byCategory = new Map(derived.values.map(value => [
      value[channels.category],
      value[channels.measure]
    ]));
    return categoryDomain.map(value => [byCategory.get(value) ?? 0]);
  }
  const colorScale = findScale(program, colorEncoding.scale);
  const colorValues = readNominalField(dataset.values, colorEncoding.field);
  const colorDomain = resolveOrdinalDomain(colorScale.domain, colorValues);
  const cells = new Map(derived.values.map(value => [
    JSON.stringify([value[channels.category], value.color]),
    value[channels.measure]
  ]));
  return categoryDomain.map(category => colorDomain.map(color =>
    cells.get(JSON.stringify([category, color])) ?? 0
  ));
}

function resolveAreaPartitions(program, consumer) {
  const layer = consumer.layer;
  const dataset = findDataset(program, layer.data);
  const transform = dataset?.transform?.length === 1 &&
    dataset.transform[0].type === "density"
    ? dataset.transform[0]
    : undefined;
  if (transform === undefined) return undefined;
  const derived = deriveDensityAreaSeries(dataset.values, layer, transform);
  if (derived.mode !== "y-density") return undefined;
  const sampleCount = derived.series[0].values.length;
  if (derived.series.some(series => series.values.length !== sampleCount)) {
    throw new Error(`Area mark "${layer.id}" requires aligned layout samples.`);
  }
  return Array.from({ length: sampleCount }, (_, index) =>
    derived.series.map(series => series.values[index].y)
  );
}

export function resolveSeriesLayoutScaleValues(program, consumer) {
  if (consumer.layer.mark?.type === "bar") {
    const grain = resolveBarGrain(consumer.layer);
    const channels = resolveBarChannels(consumer.layer);
    if (consumer.channel !== channels?.measure) return undefined;
    const partitions = grain === BAR_GRAINS.histogram
      ? resolveHistogramPartitions(program, consumer)
      : grain === BAR_GRAINS.aggregate
        ? resolveAggregatePartitions(program, consumer)
        : undefined;
    if (partitions === undefined) return undefined;
    const layout = resolveBarColorLayout(consumer.layer);
    return {
      layout,
      values: resolveSeriesLayoutDomainValues(partitions, layout)
    };
  }
  if (consumer.channel !== "y") return undefined;
  if (consumer.layer.mark?.type === "area") {
    const layout = consumer.layer.encoding?.color?.layout;
    if (layout === undefined || layout === "overlay") return undefined;
    const partitions = resolveAreaPartitions(program, consumer);
    if (partitions === undefined) {
      throw new Error(
        `Area layout "${layout}" currently requires vertical density series.`
      );
    }
    return {
      layout,
      values: resolveSeriesLayoutDomainValues(partitions, layout)
    };
  }
  return undefined;
}
