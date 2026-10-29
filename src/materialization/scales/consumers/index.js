import { unfilteredMarkDataset } from "../../../selectors/datasets.js";
import { waterfallScaleValues } from "../../waterfall/plot.js";
import { ohlcScaleValues } from "../../ohlc/plot.js";
import { geoScaleValues } from "../../geo/appearance.js";
import { findMarkFilterDataset } from "../../../selectors/datasets.js";
import { readNominalField } from "../../../grammar/scales/fields.js";
import { calendarScaleValues } from "../../calendar/scaleValues.js";
import { resolveConditionalAreaConsumer, resolveConditionalBarConsumer, resolveConditionalArcConsumer } from "../../conditionalValues.js";
import { conditionalPositionTemplate } from "../../../core/encodingBindings.js";
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
import { contourScaleValues } from "../../contour/scaleValues.js";
import { CATEGORY_ORDER_CHANNELS, resolveCategoryOrder } from "../../../grammar/categoryOrder.js";
import { resolveHistogramInput } from
  "../../bars/histogram.js";

export { findScale, findScaleConsumers } from "./common.js";
export {
  resolveHistogramCountValues,
  resolveSeriesLayoutScaleValues
} from "./seriesLayout.js";

export function resolveConsumerValuesForDataset(program, consumer, dataset) {
  if (consumer.layer.mark.type === "waterfall") return waterfallScaleValues(dataset, consumer.layer, consumer.encoding, consumer.channel);
  if (consumer.layer.mark.type === "ohlc") return ohlcScaleValues(dataset, consumer.layer, consumer.encoding);
  const arc = resolveConditionalArcConsumer(program, consumer.layer, consumer.encoding, consumer.channel);
  if (arc !== undefined) return arc;
  const bar = resolveConditionalBarConsumer(program, consumer.layer, consumer.encoding, consumer.channel);
  if (bar !== undefined) return bar.values;
  const area = resolveConditionalAreaConsumer(program, consumer.layer, consumer.encoding, consumer.channel);
  if (area !== undefined) return area.values;
  if (consumer.role === "conditional") return readConsumerFieldValues(program, consumer, dataset);
  if (["line", "bar", "arc"].includes(consumer.layer.mark.type) && consumer.layer.conditionals !== undefined) consumer = { ...consumer, layer: conditionalPositionTemplate(consumer.layer, ["x", "y", "x2", "y2", "xOffset", "yOffset", "theta", "radius"]) };
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
  if (
    consumer.layer.mark.type === "bar" &&
    consumer.channel === "x" &&
    consumer.encoding.bin !== undefined &&
    consumer.encoding.weight !== undefined
  ) {
    return resolveHistogramInput(dataset, consumer.encoding).values;
  }
  if (isDirectCategoricalConsumer(consumer)) {
    return readConsumerFieldValues(program, consumer, dataset, scale);
  }
  const family = resolveMarkFamilyConsumerValues(program, consumer, dataset);
  return family.matched
    ? family.values
    : readConsumerFieldValues(program, consumer, dataset, scale);
}

export function resolveConsumerValues(program, consumer) {
  if (consumer.layer.mark.type === "geo") return geoScaleValues(program, consumer);
  if (consumer.layer.mark.type === "calendar") return calendarScaleValues(program, consumer);
  if (consumer.layer.mark.type === "contour") return contourScaleValues(program, consumer);
  return resolveConsumerValuesForDataset(
    program,
    consumer,
    requireConsumerDataset(program, consumer)
  );
}

export function resolveConsumerCategoryOrder(program, consumer) {
  const order = consumer.encoding.categoryOrder;
  if (order === undefined) return undefined;
  if (!CATEGORY_ORDER_CHANNELS.includes(consumer.channel) ||
    !["nominal", "ordinal"].includes(consumer.encoding.fieldType)) {
    throw new Error("Remove category order before assigning a non-categorical position.");
  }
  const dataset = requireConsumerDataset(program, consumer);
  if (order.values !== undefined && findMarkFilterDataset(program, consumer.layer) !== undefined) {
    const source = unfilteredMarkDataset(program, consumer.layer);
    const authored = resolveCategoryOrder(source.values, consumer.encoding.field, order);
    const visible = new Set(readNominalField(dataset.values, consumer.encoding.field));
    return Object.freeze(authored.filter(value => visible.has(value)));
  }
  return resolveCategoryOrder(dataset.values, consumer.encoding.field, order);
}
