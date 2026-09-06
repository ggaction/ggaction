import { readAreaEndpoint } from "../../../grammar/areaEndpoints.js";
import { normalizeRuleDatum } from "../../../grammar/rules.js";
import { normalizePositionDatum } from "../../../grammar/positionDatum.js";
import {
  findScale,
  isDirectCategoricalConsumer,
  readConsumerFieldValues,
  requireConsumerDataset
} from "./common.js";
import { resolveMarkFamilyConsumerValues } from "./families.js";
import { CATEGORY_ORDER_CHANNELS, resolveCategoryOrder } from "../../../grammar/categoryOrder.js";

export { findScale, findScaleConsumers } from "./common.js";
export {
  resolveHistogramCountValues,
  resolveSeriesLayoutScaleValues
} from "./seriesLayout.js";

export function resolveConsumerValues(program, consumer) {
  const dataset = requireConsumerDataset(program, consumer);
  if (consumer.layer.mark.type === "rect") return resolveMarkFamilyConsumerValues(program, consumer, dataset).values;
  if (Object.hasOwn(consumer.encoding, "datum")) {
    if (consumer.layer.mark.type === "area") {
      readAreaEndpoint(dataset.values, consumer.encoding, consumer.layer.mark.missing);
      return [consumer.encoding.datum];
    }
    if (consumer.layer.mark.type === "text") {
      return [normalizePositionDatum(
        consumer.encoding.datum,
        consumer.encoding.fieldType,
        consumer.channel,
        consumer.encoding.temporalUnit,
        "Text"
      )];
    }
    return [normalizeRuleDatum(
      consumer.encoding.datum,
      consumer.encoding.fieldType,
      consumer.channel,
      consumer.encoding.temporalUnit
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
  if (!CATEGORY_ORDER_CHANNELS.includes(consumer.channel) ||
    !["nominal", "ordinal"].includes(consumer.encoding.fieldType)) {
    throw new Error("Remove category order before assigning a non-categorical position.");
  }
  const dataset = requireConsumerDataset(program, consumer);
  return resolveCategoryOrder(dataset.values, consumer.encoding.field, order);
}
