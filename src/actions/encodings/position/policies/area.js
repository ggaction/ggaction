import { validateStack, emptyPositionPolicy } from "./common.js";

export function isCategoricalDensityPosition({
  layer,
  dataset,
  channel,
  fieldType,
  field
}) {
  const density = dataset.transform?.find(transform => transform.type === "density");
  return layer.mark?.type === "area" &&
    ["nominal", "ordinal"].includes(fieldType) &&
    density?.placement?.type === "category" &&
    density.placement.channel === channel &&
    density.placement.categoryField === field;
}

export function resolveAreaPositionPolicy({
  dataset,
  layer,
  channel,
  args,
  fieldType,
  field
}) {
  const density = dataset.transform?.find(transform => transform.type === "density");
  if (["nominal", "ordinal"].includes(fieldType)) {
    if (
      density?.placement?.type !== "category" ||
      density.placement.channel !== channel ||
      density.placement.categoryField !== field
    ) {
      throw new Error(
        "Categorical area position requires a matching category density placement."
      );
    }
    if (args.aggregate !== undefined || args.bin !== undefined || args.stack !== undefined) {
      throw new Error("Categorical density position does not support aggregate, bin, or stack.");
    }
    return emptyPositionPolicy();
  }
  if (!["quantitative", "temporal"].includes(fieldType)) {
    throw new Error(
      "Area position encoding requires quantitative or temporal fields."
    );
  }
  if (args.aggregate !== undefined || args.bin !== undefined) {
    throw new Error("Area position encoding does not support aggregate or bin.");
  }
  if (args.stack === undefined) return emptyPositionPolicy();
  const stack = validateStack(args.stack, "Area position encoding");
  if (fieldType !== "quantitative") throw new Error("Area stack requires a quantitative measure.");
  if (stack === "center" && channel !== "y") throw new Error("Area center stack requires a y encoding.");
  return { bin: undefined, aggregate: undefined, stack };
}
