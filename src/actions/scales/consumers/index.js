import { normalizeRuleDatum } from "../../../grammar/rules.js";
import {
  findScale,
  isDirectCategoricalConsumer,
  readConsumerFieldValues,
  requireConsumerDataset
} from "./common.js";
import { resolveMarkFamilyConsumerValues } from "./families.js";

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
  const family = resolveMarkFamilyConsumerValues(consumer, dataset);
  return family.matched
    ? family.values
    : readConsumerFieldValues(program, consumer, dataset, scale);
}
