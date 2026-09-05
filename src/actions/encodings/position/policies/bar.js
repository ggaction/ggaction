import {
  validateAggregate,
  validateAggregateFieldType
} from "../../../../grammar/aggregate.js";
import {
  BAR_ORIENTATIONS,
  BAR_GRAINS,
  resolveBarGrain,
  resolveBarOffsetChannel,
  resolveBarOrientation
} from "../../../../grammar/bars/policy.js";
import { resolveBin, validateStack } from "./common.js";

function resolveBarChannelPolicy({
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
    if (stack === "center") {
      throw new Error("Centered bars are not supported.");
    }
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
    stack = Object.hasOwn(args, "stack") ? args.stack : opposite === undefined ? undefined : null;
    if (aggregate !== undefined) {
      aggregate = validateAggregate(aggregate);
      validateAggregateFieldType(aggregate, fieldType);
    }
    if (stack !== undefined) stack = validateStack(stack, `Bar ${channel} encoding`);
    if (stack === "center") {
      throw new Error("Centered bars are not supported.");
    }
  } else {
    throw new Error(
      "Bar position requires quantitative, temporal, ordinal, or nominal fields."
    );
  }

  return { bin, aggregate, stack };
}

export function resolveBarPositionPolicy(context) {
  const { program, layer, channel, field, fieldType } = context;
  const policy = resolveBarChannelPolicy(context);
  const oppositeChannel = channel === "x" ? "y" : "x";
  const opposite = layer.encoding?.[oppositeChannel];
  const pendingBoxRange = program.markConfigs[layer.id]?.boxPlot !== undefined;
  const candidate = {
    ...layer,
    encoding: {
      ...layer.encoding,
      [channel]: { field, fieldType, ...policy }
    }
  };
  // The same channel policy owns a measure whether it is authored first or last.
  // Absence of an aggregate/stack is sufficient to represent an unresolved role.
  let companion;
  if (
    !pendingBoxRange && resolveBarGrain(layer) === undefined &&
    opposite?.fieldType === "quantitative" && opposite.bin === undefined
  ) {
    const resolved = resolveBarChannelPolicy({
      ...context,
      layer: candidate,
      channel: oppositeChannel,
      field: opposite.field,
      fieldType: opposite.fieldType,
      args: opposite
    });
    candidate.encoding[oppositeChannel] = { ...opposite, ...resolved };
    if (
      (opposite.aggregate === undefined && resolved.aggregate !== undefined) ||
      opposite.stack !== resolved.stack
    ) {
      companion = { channel: oppositeChannel, encoding: candidate.encoding[oppositeChannel] };
    }
  }
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
  if (
    program.markConfigs[layer.id]?.barWidth !== undefined &&
    resolveBarGrain(candidate) === BAR_GRAINS.histogram
  ) {
    throw new Error("A saved Bar width requires an aggregate or ranged category slot and cannot be applied to histogram bins.");
  }
  return companion === undefined ? policy : { ...policy, companion };
}
