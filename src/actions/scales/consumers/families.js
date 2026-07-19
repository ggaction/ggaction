import { deriveBarAggregates } from "../../../grammar/bars/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import { deriveLineSeries } from "../../../grammar/lineSeries.js";
import { isAggregate } from "../../../grammar/aggregate.js";
import {
  resolveRectConsumerValues
} from "../../../materialization/rect.js";

export function resolveMarkFamilyConsumerValues(consumer, dataset) {
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
    isAggregate(consumer.layer.encoding?.y?.aggregate)
  ) {
    const derived = deriveLineSeries(dataset.values, consumer.layer);
    return {
      matched: true,
      values: consumer.channel === "x" ? derived.xValues : derived.yValues
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
