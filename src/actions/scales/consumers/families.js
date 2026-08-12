import { deriveBarAggregates } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import {
  deriveLineSeries,
  deriveLineSeriesFieldValues,
  resolveLineBins
} from "../../../grammar/lineSeries.js";
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
  if (
    consumer.layer.mark?.type === "line" &&
    ((consumer.layer.encoding?.x !== undefined &&
      isAggregate(consumer.layer.encoding?.y?.aggregate) &&
      !(consumer.channel === "x" &&
        consumer.layer.encoding?.x?.bin !== undefined)) ||
      consumer.channel === "strokeWidth")
  ) {
    const derived = deriveLineSeries(
      dataset.values,
      consumer.layer,
      lineDerivationOptions(program, consumer, dataset)
    );
    return {
      matched: true,
      values: consumer.channel === "strokeWidth"
        ? deriveLineSeriesFieldValues(
            dataset.values,
            consumer.layer,
            derived,
            consumer.encoding.field
          )
        : consumer.channel === "x" ? derived.xValues : derived.yValues
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
