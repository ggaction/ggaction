import { deriveMeasuredArcValues } from "../../../grammar/arcs.js";
import { deriveBarAggregates } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import {
  deriveLineSeries,
  resolveLineBins
} from "../../../grammar/lineSeries.js";
import { derivePathSeriesFieldValues } from "../../../grammar/pathSeries.js";
import { isAggregate } from "../../../grammar/aggregate.js";
import {
  resolveRectConsumerValues
} from "../../../materialization/rect.js";
import { findScale } from "./common.js";

function lineDerivationOptions(program, consumer, dataset) {
  const x = consumer.layer.encoding?.x;
  if (x?.bin === undefined) return undefined;
  const bins = resolveLineBins(
    dataset.values,
    consumer.layer,
    findScale(program, x.scale)
  );
  return { xBinBoundaries: bins.boundaries };
}

export function resolveMarkFamilyConsumerValues(program, consumer, dataset) {
  if (consumer.layer.mark?.type === "arc" && consumer.channel === "radius" &&
    findScale(program, consumer.encoding.scale).radialMapping !== undefined) {
    return { matched: true, values: deriveMeasuredArcValues(dataset.values, consumer.layer).map(item => item.radius) };
  }

  if (consumer.layer.mark?.type === "rect") {
    return {
      matched: true,
      values: resolveRectConsumerValues(
        consumer.layer,
        dataset,
        consumer.channel
      )
    };
  }
  const { layer, channel } = consumer;
  const encoding = layer.encoding ?? {};
  const appearance = ["strokeWidth", "opacity"].includes(channel);
  if (
    layer.mark?.type === "line" &&
    ((["x", "y"].includes(channel) && encoding.x !== undefined &&
      isAggregate(encoding.y?.aggregate) &&
      !(channel === "x" &&
        encoding.x?.bin !== undefined)) ||
      appearance) &&
    encoding.parallel === undefined &&
    ((encoding.x !== undefined && encoding.y !== undefined) ||
      (encoding.theta !== undefined && encoding.radius !== undefined))
  ) {
    const derived = deriveLineSeries(
      dataset.values,
      layer,
      lineDerivationOptions(program, consumer, dataset)
    );
    return {
      matched: true,
      values: appearance
        ? derivePathSeriesFieldValues(
            dataset.values,
            derived.series,
            consumer.encoding.field,
            channel
          )
        : channel === "x" ? derived.xValues : derived.yValues
    };
  }
  if (resolveBarGrain(consumer.layer) === BAR_GRAINS.aggregate) {
    const derived = deriveBarAggregates(dataset.values, consumer.layer);
    if (consumer.channel === "color") {
      return {
        matched: true,
        values: derived.values.map(value => value.color)
      };
    }
    return {
      matched: true,
      values: consumer.channel === "x" ? derived.xValues : derived.yValues
    };
  }
  return { matched: false };
}
