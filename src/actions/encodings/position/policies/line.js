import {
  validateAggregate,
  validateAggregateFieldType
} from "../../../../grammar/aggregate.js";
import { emptyPositionPolicy, resolveBin } from "./common.js";

function rejectStack(args, channel) {
  if (args.stack !== undefined) {
    throw new Error(`Line ${channel} encoding does not support stack.`);
  }
}

function rejectBin(args, channel) {
  if (args.bin !== undefined) {
    throw new Error(`Line ${channel} encoding does not support bin.`);
  }
}

export function resolveLinePositionPolicy({
  program,
  layer,
  dataset,
  channel,
  args,
  fieldType
}) {
  const polar = ["theta", "radius"].includes(channel);
  const config = program.markConfigs[layer.id] ?? {};
  if (polar) {
    if (config.curve !== undefined && config.curve !== "linear") {
      throw new Error("Polar line position currently requires curve \"linear\".");
    }
    rejectBin(args, channel);
    rejectStack(args, channel);
    if (args.aggregate !== undefined) {
      throw new Error(`Line ${channel} encoding does not support aggregate.`);
    }
    return emptyPositionPolicy();
  }
  if (config.closed === true) {
    throw new Error("Line closed requires theta/radius Polar position encodings.");
  }
  const regression = dataset.transform?.some(item => item.type === "regression");
  const interval = dataset.transform?.some(item => item.type === "interval");
  const windowOutput = dataset.transform?.some(item =>
    item.type === "window" &&
    item.operations?.some(operation => operation.as === args.field)
  );

  if (channel === "x") {
    rejectStack(args, "x");
    if (args.aggregate !== undefined) {
      throw new Error("Line x encoding does not support aggregate.");
    }
    if (args.bin !== undefined) {
      if (fieldType !== "quantitative") {
        throw new Error("Binned line x encoding requires a quantitative field.");
      }
      if (
        layer.encoding?.y !== undefined &&
        layer.encoding.y.aggregate === undefined
      ) {
        throw new Error("Binned line x encoding requires an aggregate y encoding.");
      }
      return {
        bin: resolveBin(args.bin),
        aggregate: undefined,
        stack: undefined
      };
    }
    if (["nominal", "ordinal"].includes(fieldType)) {
      if (layer.encoding?.y !== undefined && layer.encoding.y.aggregate === undefined &&
          layer.encoding.y.fieldType !== "quantitative") {
        throw new Error("Categorical line x requires a quantitative value or aggregate y encoding.");
      }
      return emptyPositionPolicy();
    }
    const directPair =
      layer.encoding?.y?.aggregate === undefined &&
      ["quantitative", "temporal"].includes(layer.encoding?.y?.fieldType) &&
      fieldType === "quantitative";
    const pendingQuantitativePair =
      layer.encoding?.y === undefined && fieldType === "quantitative";
    if (
      fieldType !== "temporal" &&
      !(
        (regression || interval || directPair || pendingQuantitativePair) &&
        fieldType === "quantitative"
      )
    ) {
      throw new Error(
        "Line x encoding requires a categorical or temporal field, or a compatible quantitative field."
      );
    }
    return emptyPositionPolicy();
  }

  rejectBin(args, "y");
  rejectStack(args, "y");
  if (layer.encoding?.x?.bin !== undefined && args.aggregate === undefined) {
    throw new Error("Binned line x encoding requires an aggregate y encoding.");
  }
  if (["nominal", "ordinal"].includes(layer.encoding?.x?.fieldType) &&
      args.aggregate === undefined && fieldType !== "quantitative") {
    throw new Error("Categorical line x requires a quantitative value or aggregate y encoding.");
  }
  const continuousPair =
    fieldType === "quantitative" &&
    ["quantitative", "temporal", "nominal", "ordinal"].includes(layer.encoding?.x?.fieldType) &&
    layer.encoding.x.bin === undefined;
  const prospectiveDirect =
    args.aggregate === undefined &&
    (fieldType === "temporal" ||
      (fieldType === "quantitative" &&
        (layer.encoding?.x === undefined || continuousPair)));
  if (interval || (windowOutput && args.aggregate === undefined) || prospectiveDirect) {
    if (!["quantitative", "temporal"].includes(fieldType)) {
      throw new Error(
        "Direct line y encoding requires a quantitative or temporal field."
      );
    }
    if (args.aggregate !== undefined) {
      throw new Error("Direct line y encoding does not support aggregate.");
    }
    return emptyPositionPolicy();
  }
  if (regression) {
    if (fieldType !== "quantitative") {
      throw new Error("Regression line y encoding requires a quantitative field.");
    }
    if (args.aggregate !== undefined) {
      throw new Error("Regression line y encoding does not support aggregate.");
    }
    return emptyPositionPolicy();
  }

  if (layer.encoding?.x !== undefined) {
    const compatibleAggregateX =
      ["temporal", "nominal", "ordinal"].includes(layer.encoding.x.fieldType) ||
      (layer.encoding.x.fieldType === "quantitative" &&
        layer.encoding.x.bin !== undefined);
    if (!compatibleAggregateX) {
      throw new Error(
        "Aggregate line y encoding requires a temporal, categorical, or binned quantitative x encoding."
      );
    }
  }

  const aggregate = validateAggregate(args.aggregate);
  validateAggregateFieldType(aggregate, fieldType);
  return { bin: undefined, aggregate, stack: undefined };
}
