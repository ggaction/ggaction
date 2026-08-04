import { validateStack, emptyPositionPolicy } from "./common.js";
import { deriveCenteredAreaSeries } from "../../../../grammar/areaSeries.js";
import { readQuantitativeField } from "../../../../grammar/scales/index.js";

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
  const stack = validateStack(args.stack, "Area y encoding");
  if (stack === "center") {
    if (channel !== "y") {
      throw new Error("Area center stack requires a y encoding.");
    }
    if (layer.encoding?.group?.fieldType !== "nominal") {
      throw new Error("Area center stack requires a nominal group encoding.");
    }
    if (
      layer.encoding?.color?.layout !== undefined &&
      layer.encoding.color.layout !== "center"
    ) {
      throw new Error("Area center stack requires a matching center color layout.");
    }
    const values = readQuantitativeField(dataset.values, field);
    if (values.some(value => value < 0)) {
      throw new RangeError("Area center stack requires non-negative values.");
    }
    if (layer.encoding?.x !== undefined) {
      deriveCenteredAreaSeries(dataset.values, {
        ...layer,
        encoding: {
          ...layer.encoding,
          y: { field, fieldType, stack: "center" }
        }
      });
    }
    return { bin: undefined, aggregate: undefined, stack };
  }
  if (
    channel !== "y" ||
    density === undefined
  ) {
    throw new Error("Area stack currently requires a density y encoding.");
  }
  return {
    bin: undefined,
    aggregate: undefined,
    stack
  };
}
