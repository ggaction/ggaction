import {
  validateAggregate,
  validateAggregateFieldType
} from "../../../../grammar/aggregate.js";
import {
  BAR_ORIENTATIONS,
  resolveBarOffsetChannel,
  resolveBarOrientation
} from "../../../../grammar/bars/policy.js";
import { resolveBin, validateStack } from "./common.js";

export function resolveBarPositionPolicy({
  program,
  layer,
  channel,
  args,
  fieldType,
  field
}) {
  let bin;
  let aggregate;
  let stack;
  const xEncoding = layer.encoding?.x;
  const opposite = layer.encoding?.[channel === "x" ? "y" : "x"];
  const pendingBoxRange = program.markConfigs[layer.id]?.boxPlot !== undefined;

  if (["nominal", "ordinal", "temporal"].includes(fieldType)) {
    if (args.aggregate !== undefined || args.bin !== undefined || args.stack !== undefined) {
      throw new Error(
        "Categorical bar position does not support bin or aggregate; a binned bar requires a quantitative field."
      );
    }
  } else if (fieldType === "quantitative" && channel === "x" && args.bin !== undefined) {
    if (args.aggregate !== undefined || args.stack !== undefined) {
      throw new Error("Binned bar x encoding does not support aggregate or stack.");
    }
    bin = resolveBin(args.bin);
  } else if (
    fieldType === "quantitative" &&
    channel === "y" &&
    xEncoding?.bin !== undefined
  ) {
    if (args.bin !== undefined) {
      throw new Error("Histogram bar y encoding does not support bin.");
    }
    if (field !== xEncoding.field) {
      throw new Error("Bar y field must match the binned x field.");
    }
    aggregate = args.aggregate ?? "count";
    stack = Object.hasOwn(args, "stack") ? args.stack : "zero";
    if (aggregate !== "count") {
      throw new Error('Histogram bar y aggregate must be "count".');
    }
    stack = validateStack(stack, "Histogram bar y encoding");
  } else if (fieldType === "quantitative") {
    if (args.bin !== undefined) {
      throw new Error(
        channel === "y"
          ? "Bar y does not support bin; histogram y requires a binned x encoding."
          : "Quantitative bar measure encoding does not support bin."
      );
    }
    aggregate = args.aggregate ?? (
      ["nominal", "ordinal", "temporal"].includes(opposite?.fieldType) &&
      !pendingBoxRange
        ? "mean"
        : undefined
    );
    if (pendingBoxRange && args.aggregate === undefined) {
      return { bin, aggregate, stack };
    }
    if (aggregate === undefined) {
      throw new Error(
        channel === "x"
          ? "Quantitative bar x encoding requires bin or aggregate."
          : "Bar y encoding requires a binned quantitative or ordinal x category, temporal x category, or aggregate."
      );
    }
    stack = Object.hasOwn(args, "stack") ? args.stack : null;
    aggregate = validateAggregate(aggregate);
    validateAggregateFieldType(aggregate, fieldType);
    stack = validateStack(stack, `Bar ${channel} encoding`);
  } else {
    throw new Error(
      "Bar position requires quantitative, temporal, ordinal, or nominal fields."
    );
  }

  const candidate = {
    ...layer,
    encoding: {
      ...layer.encoding,
      [channel]: { field, fieldType, bin, aggregate, stack }
    }
  };
  const orientation = resolveBarOrientation(candidate);
  if (opposite !== undefined && orientation === undefined && !pendingBoxRange) {
    throw new Error(
      `Bar ${channel} encoding requires a quantitative field opposite a categorical position.`
    );
  }
  const expectedOffset = resolveBarOffsetChannel(candidate);
  const incompatibleOffset = orientation === BAR_ORIENTATIONS.horizontal
    ? "xOffset"
    : orientation === BAR_ORIENTATIONS.vertical
      ? "yOffset"
      : undefined;
  if (incompatibleOffset !== undefined && candidate.encoding?.[incompatibleOffset] !== undefined) {
    throw new Error(
      `${orientation} bars require ${expectedOffset}; remove the incompatible ${incompatibleOffset} encoding.`
    );
  }
  return { bin, aggregate, stack };
}
