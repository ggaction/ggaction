import { deriveBarMeans } from "../../grammar/barAggregate.js";
import { countHistogramBins, resolveHistogramBins } from "../../grammar/histogram.js";
import { deriveLineSeries } from "../../grammar/lineSeries.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField
} from "../../grammar/scales.js";
import { findDataset } from "../../selectors/datasets.js";
import { requireSemanticScale } from "../../selectors/scales.js";

export function findScale(program, id) {
  return requireSemanticScale(program, id);
}

export function findScaleConsumers(program, id) {
  const consumers = [];
  for (const layer of program.semanticSpec.layers) {
    for (const channel of [
      "x", "y", "y2", "xOffset", "color", "strokeDash", "size", "shape"
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

  if (["color", "strokeDash", "xOffset", "shape"].includes(consumer.channel)) {
    if (
      consumer.channel === "strokeDash" &&
      consumer.layer.mark?.type !== "line"
    ) {
      throw new Error("strokeDash scale materialization currently requires a line mark.");
    }
    if (consumer.encoding.fieldType !== "nominal") {
      throw new Error(
        `${consumer.channel} scale materialization requires a nominal encoding on mark "${consumer.layer.id}".`
      );
    }
    return readNominalField(dataset.values, consumer.encoding.field);
  }

  if (
    consumer.layer.mark?.type === "line" &&
    consumer.layer.encoding?.y?.aggregate === "mean"
  ) {
    const derived = deriveLineSeries(dataset.values, consumer.layer);
    return consumer.channel === "x" ? derived.xValues : derived.yValues;
  }

  if (
    consumer.layer.mark?.type === "bar" &&
    consumer.layer.encoding?.x?.fieldType === "ordinal" &&
    consumer.layer.encoding?.y?.aggregate === "mean" &&
    consumer.layer.encoding.y.stack === null
  ) {
    const derived = deriveBarMeans(dataset.values, consumer.layer);
    return consumer.channel === "x" ? derived.xValues : derived.yValues;
  }

  if (consumer.encoding.fieldType === "temporal") {
    return readTemporalField(dataset.values, consumer.encoding.field);
  }
  if (consumer.encoding.fieldType === "ordinal") {
    return readNominalField(dataset.values, consumer.encoding.field);
  }
  if (consumer.encoding.fieldType !== "quantitative") {
    throw new Error(
      `Scale materialization requires a quantitative encoding on mark "${consumer.layer.id}".`
    );
  }
  return readQuantitativeField(dataset.values, consumer.encoding.field);
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
    maxBins: xEncoding.bin.maxBins,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  return countHistogramBins(xValues, bins.boundaries);
}
