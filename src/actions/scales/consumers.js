import { deriveBarAggregates } from "../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import {
  countHistogramBins,
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../grammar/histogram.js";
import { deriveDensityAreaSeries } from "../../grammar/areaSeries.js";
import { deriveLineSeries } from "../../grammar/lineSeries.js";
import { resolveSeriesLayoutDomainValues } from "../../grammar/seriesLayout.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveOrdinalDomain
} from "../../grammar/scales.js";
import { findDataset } from "../../selectors/datasets.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { isAggregate } from "../../grammar/aggregate.js";
import { normalizeRuleDatum } from "../../grammar/rules.js";

export function findScale(program, id) {
  return requireSemanticScale(program, id);
}

export function findScaleConsumers(program, id) {
  const consumers = [];
  for (const layer of program.semanticSpec.layers) {
    for (const channel of [
      "x", "y", "x2", "y2", "xOffset", "color", "strokeDash", "size", "shape",
      "opacity"
    ]) {
      const encoding = layer.encoding?.[channel];
      if (encoding?.scale === id) consumers.push({ layer, channel, encoding });
    }
  }
  return consumers;
}

export function resolveConsumerValues(program, consumer) {
  const dataset = findDataset(program, consumer.layer.data);
  if (dataset === undefined) {
    throw new Error(
      `Mark "${consumer.layer.id}" references unknown dataset "${consumer.layer.data}".`
    );
  }

  if (Object.hasOwn(consumer.encoding, "datum")) {
    return [normalizeRuleDatum(
      consumer.encoding.datum,
      consumer.encoding.fieldType,
      consumer.channel
    )];
  }

  if (
    consumer.channel === "strokeDash" &&
    !["line", "rule"].includes(consumer.layer.mark?.type)
  ) {
    throw new Error("strokeDash scale materialization requires a line mark or rule mark.");
  }
  const scale = findScale(program, consumer.encoding.scale);
  const allowUnknown = Object.hasOwn(scale, "unknown");

  if (
    ["color", "strokeDash", "xOffset", "shape"].includes(consumer.channel) &&
    consumer.encoding.fieldType === "nominal"
  ) {
    return allowUnknown
      ? readScaleField(
          dataset.values,
          consumer.encoding.field,
          consumer.encoding.fieldType,
          { allowUnknown: true }
        )
      : readNominalField(dataset.values, consumer.encoding.field);
  }

  if (
    consumer.layer.mark?.type === "line" &&
    isAggregate(consumer.layer.encoding?.y?.aggregate)
  ) {
    const derived = deriveLineSeries(dataset.values, consumer.layer);
    return consumer.channel === "x" ? derived.xValues : derived.yValues;
  }

  if (
    resolveBarGrain(consumer.layer) === BAR_GRAINS.aggregate
  ) {
    const derived = deriveBarAggregates(dataset.values, consumer.layer);
    if (consumer.channel === "color") {
      return derived.values.map(value => value.color);
    }
    return consumer.channel === "x" ? derived.xValues : derived.yValues;
  }

  if (consumer.encoding.fieldType === "temporal") {
    return allowUnknown
      ? readScaleField(dataset.values, consumer.encoding.field, "temporal", {
          allowUnknown: true
        })
      : readTemporalField(dataset.values, consumer.encoding.field);
  }
  if (["nominal", "ordinal"].includes(consumer.encoding.fieldType)) {
    if (!["ordinal", "band", "point"].includes(scale.type)) {
      throw new Error(
        `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
      );
    }
    return allowUnknown
      ? readScaleField(
          dataset.values,
          consumer.encoding.field,
          consumer.encoding.fieldType,
          { allowUnknown: true }
        )
      : readNominalField(dataset.values, consumer.encoding.field);
  }
  if (consumer.encoding.fieldType !== "quantitative") {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }
  return allowUnknown
    ? readScaleField(dataset.values, consumer.encoding.field, "quantitative", {
        allowUnknown: true
      })
    : readQuantitativeField(dataset.values, consumer.encoding.field);
}

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
