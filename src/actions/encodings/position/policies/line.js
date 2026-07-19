import {
  validateAggregate,
  validateAggregateFieldType
} from "../../../../grammar/aggregate.js";
import { emptyPositionPolicy } from "./common.js";

function rejectSharedOptions(args, channel) {
  if (args.bin !== undefined) {
    throw new Error(`Line ${channel} encoding does not support bin.`);
  }
  if (args.stack !== undefined) {
    throw new Error(`Line ${channel} encoding does not support stack.`);
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
    rejectSharedOptions(args, channel);
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

  if (channel === "x") {
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
        "Line x encoding requires a temporal field or a compatible derived quantitative field."
      );
    }
    if (args.aggregate !== undefined) {
      throw new Error("Line x encoding does not support aggregate.");
    }
    rejectSharedOptions(args, "x");
    return emptyPositionPolicy();
  }

  rejectSharedOptions(args, "y");
  const quantitativePair =
    fieldType === "quantitative" &&
    layer.encoding?.x?.fieldType === "quantitative";
  const prospectiveDirect =
    args.aggregate === undefined &&
    (fieldType === "temporal" ||
      (fieldType === "quantitative" &&
        (layer.encoding?.x === undefined || quantitativePair)));
  if (interval || prospectiveDirect) {
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

  if (
    layer.encoding?.x !== undefined &&
    layer.encoding.x.fieldType !== "temporal"
  ) {
    throw new Error("Aggregate line y encoding requires a temporal x encoding.");
  }

  const aggregate = validateAggregate(args.aggregate);
  validateAggregateFieldType(aggregate, fieldType);
  return { bin: undefined, aggregate, stack: undefined };
}
