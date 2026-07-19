import { validateAggregate } from "../../../../grammar/aggregate.js";
import { validateNonEmptyString } from "../../../../core/validation.js";
import { emptyPositionPolicy } from "./common.js";

export function resolveArcPositionPolicy({ channel, args, fieldType }) {
  if (args.bin !== undefined) {
    throw new Error(`Arc ${channel} encoding does not support bin.`);
  }
  if (args.stack !== undefined) {
    throw new Error(`Arc ${channel} encoding does not support stack.`);
  }
  if (channel === "radius") {
    if (args.aggregate !== undefined) {
      throw new Error("Arc radius encoding does not support aggregate.");
    }
    if (args.weight !== undefined) {
      throw new Error("Arc radius encoding does not support weight.");
    }
    return emptyPositionPolicy();
  }
  if (!["ordinal", "nominal"].includes(fieldType)) {
    throw new Error("Arc theta encoding requires an ordinal or nominal field.");
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
