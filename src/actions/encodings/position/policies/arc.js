import { validateRadialMapping } from "../../../../grammar/scales/radial.js";
import { validateAggregate } from "../../../../grammar/aggregate.js";
import { validateNonEmptyString } from "../../../../core/validation.js";
import { emptyPositionPolicy } from "./common.js";

export function resolveArcPositionPolicy({ channel, args, fieldType, layer }) {
  if (args.bin !== undefined) {
    throw new Error(`Arc ${channel} encoding does not support bin.`);
  }
  if (args.stack !== undefined) {
    throw new Error(`Arc ${channel} encoding does not support stack.`);
  }
  if (channel === "radius") {
    if (layer.encoding?.theta?.fieldType === "quantitative") {
      throw new Error(
        "Arc radius encoding cannot be combined with quantitative theta."
      );
    }
    if (args.mapping !== undefined) {
      validateRadialMapping(args.mapping);
      if (fieldType !== "quantitative" || !["count", "sum"].includes(args.aggregate)) {
        throw new Error("Measured radius requires quantitative count or sum aggregation.");
      }
      if (args.aggregate === "count" && Object.hasOwn(args, "field")) {
        throw new Error("Measured radius count does not accept a field.");
      }
      if (layer.encoding?.theta?.aggregate !== undefined) {
        throw new Error("Measured radius requires equal-angle theta without aggregation.");
      }
      return { ...emptyPositionPolicy(), aggregate: args.aggregate };
    }
    if (args.aggregate !== undefined) {
      throw new Error("Arc radius encoding does not support aggregate.");
    }
    if (args.weight !== undefined) {
      throw new Error("Arc radius encoding does not support weight.");
    }
    return emptyPositionPolicy();
  }
  if (fieldType === "quantitative") {
    if (layer.encoding?.radius !== undefined) {
      throw new Error(
        "Quantitative arc theta cannot be combined with radius encoding."
      );
    }
    if (args.aggregate !== undefined) {
      throw new Error("Quantitative arc theta does not support aggregate.");
    }
    if (args.weight !== undefined) {
      throw new Error("Quantitative arc theta does not support weight.");
    }
    return emptyPositionPolicy();
  }
  if (!["ordinal", "nominal"].includes(fieldType)) {
    throw new Error(
      "Arc theta encoding requires a quantitative, ordinal, or nominal field."
    );
  }
  if (args.aggregate === undefined) {
    if (args.weight !== undefined) {
      throw new Error('Arc theta weight requires aggregate: "sum".');
    }
    return emptyPositionPolicy();
  }
  const aggregate = validateAggregate(args.aggregate);
  if (!["count", "sum"].includes(aggregate)) {
    throw new Error('Arc theta aggregate supports only "count" or "sum".');
  }
  if (aggregate === "count") {
    if (args.weight !== undefined) {
      throw new Error('Arc theta weight requires aggregate: "sum".');
    }
    return { bin: undefined, aggregate, stack: undefined, weight: undefined };
  }
  if (args.weight === undefined) {
    throw new Error('Arc theta aggregate "sum" requires weight.');
  }
  return {
    bin: undefined,
    aggregate,
    stack: undefined,
    weight: validateNonEmptyString(args.weight, "Arc theta weight")
  };
}
