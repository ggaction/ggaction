import { normalizeRuleDatum } from "../../../grammar/rules.js";
import {
  findScale,
  isDirectCategoricalConsumer,
  readConsumerFieldValues,
  requireConsumerDataset
} from "./common.js";
import { resolveMarkFamilyConsumerValues } from "./families.js";
import { resolveCategoryOrder } from "../../../grammar/categoryOrder.js";

export { findScale, findScaleConsumers } from "./common.js";
export {
  resolveHistogramCountValues,
  resolveSeriesLayoutScaleValues
} from "./seriesLayout.js";

export function resolveConsumerValues(program, consumer) {
  const dataset = requireConsumerDataset(program, consumer);
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
    throw new Error(
      "strokeDash scale materialization requires a line mark or rule mark."
    );
  }
  const scale = findScale(program, consumer.encoding.scale);
  if (isDirectCategoricalConsumer(consumer)) {
    return readConsumerFieldValues(program, consumer, dataset, scale);
  }
  const family = resolveMarkFamilyConsumerValues(program, consumer, dataset);
  return family.matched
    ? family.values
    : readConsumerFieldValues(program, consumer, dataset, scale);
}

export function resolveConsumerCategoryOrder(program, consumer) {
  const order = consumer.encoding.categoryOrder;
  if (order === undefined) return undefined;
  const dataset = requireConsumerDataset(program, consumer);
  return resolveCategoryOrder(dataset.values, consumer.encoding.field, order);
}
