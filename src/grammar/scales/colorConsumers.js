import { BAR_GRAINS, resolveBarChannels, resolveBarGrain } from "../bars/policy.js";
import { validateAggregate, validateAggregateFieldType } from "../aggregate.js";
import { isDiscretizedColorScaleType } from "./types.js";

export function validateContinuousColorConsumer(layer, encoding, scale, { inferAggregate = false } = {}) {
  const kind = layer.mark?.type;
  if (!["point", "bar", "rect"].includes(kind)) {
    throw new Error("Continuous color requires a Point, aggregate Bar, or Rect consumer.");
  }
  if (!["quantitative", "temporal"].includes(encoding.fieldType) ||
    (isDiscretizedColorScaleType(scale.type) && encoding.fieldType !== "quantitative")) {
    throw new Error(`Scale type "${scale.type}" has an incompatible color field type.`);
  }
  if (Object.hasOwn(scale, "unknown") && kind !== "point") {
    throw new Error("Continuous color scale unknown currently requires a row-owned point mark.");
  }
  if (kind !== "bar") {
    if (encoding.aggregate !== undefined) throw new Error(`${kind} continuous color does not support aggregate.`);
    return undefined;
  }
  if (["nominal", "ordinal"].includes(layer.encoding?.color?.fieldType)) {
    throw new Error("Continuous bar color cannot replace an existing nominal color layout.");
  }
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Aggregate bar color currently requires a quantitative field.");
  }
  if (resolveBarGrain(layer) !== BAR_GRAINS.aggregate) {
    throw new Error("Continuous bar color requires a complete categorical aggregate bar.");
  }
  const measure = layer.encoding?.[resolveBarChannels(layer).measure];
  const aggregate = encoding.aggregate ?? (inferAggregate && measure?.field === encoding.field ? measure.aggregate : undefined);
  if (aggregate === undefined) {
    throw new Error("Continuous bar color requires aggregate when its field differs from the measure field.");
  }
  validateAggregate(aggregate);
  validateAggregateFieldType(aggregate, encoding.fieldType);
  return aggregate;
}
