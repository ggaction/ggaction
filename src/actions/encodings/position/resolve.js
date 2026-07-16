import { validateUserId } from "../../../core/identifiers.js";
import { STACK_MODES } from "../../../core/vocabulary.js";
import { getPositionCoordinateDefaults } from "../../../grammar/coordinates.js";
import { normalizeHistogramBin } from "../../../grammar/histogram.js";
import {
  isTransformedScaleType,
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateFieldType,
  validatePositionChannel
} from "../../../grammar/scales.js";
import { resolvePositionScaleDefinition } from "../../scales/definitions.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import {
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "../shared.js";
import {
  isAggregate,
  validateAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues,
} from "../../../grammar/aggregate.js";
import {
  BAR_ORIENTATIONS,
  resolveBarOrientation
} from "../../../grammar/bars/policy.js";
import { validatePositionFieldCompatibility } from
  "../../../grammar/positionCompatibility.js";
import { normalizeRuleDatum } from "../../../grammar/rules.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate",
  "aggregate", "bin", "stack"
]);

function resolveCoordinate(program, channel, layer, requestedId) {
  const defaults = getPositionCoordinateDefaults(channel);
  const existingId = layer.coordinate;
  if (requestedId !== undefined) validateUserId(requestedId, "Coordinate id");
  if (existingId !== undefined && requestedId !== undefined && existingId !== requestedId) {
    throw new Error(`Layer "${layer.id}" already uses coordinate "${existingId}".`);
  }
  const id = existingId ?? requestedId ?? defaults.id;
  const coordinate = findCoordinate(program, id);
  if (coordinate !== undefined && coordinate.type !== defaults.type) {
    throw new Error(
      `${channel} encoding requires a ${defaults.type} coordinate, but "${id}" is ${coordinate.type}.`
    );
  }
  return { id, type: defaults.type };
}

function resolveBin(bin) {
  return normalizeHistogramBin(bin);
}

function validateStack(stack, label) {
  if (stack !== null && !STACK_MODES.includes(stack)) {
    throw new Error(`${label} has unsupported stack "${stack}".`);
  }
  return stack;
}

function validateMarkPolicy(program, layer, dataset, channel, args, fieldType, field) {
  let bin;
  let aggregate;
  let stack;
  const xEncoding = layer.encoding?.x;
  validatePositionFieldCompatibility(layer.mark.type, channel, fieldType);

  if (layer.mark.type === "rule") {
    if (!["quantitative", "temporal", "ordinal", "nominal"].includes(fieldType)) {
      throw new Error("Rule position encoding requires a supported field type.");
    }
    if (args.aggregate !== undefined) {
      throw new Error("Rule position encoding does not support aggregate.");
    }
    if (args.bin !== undefined) {
      throw new Error("Rule position encoding does not support bin.");
    }
    if (args.stack !== undefined) {
      throw new Error("Rule position encoding does not support stack.");
    }
  } else if (layer.mark.type === "point") {
    if (!["quantitative", "temporal", "ordinal", "nominal"].includes(fieldType)) {
      throw new Error("Point position encoding requires quantitative, temporal, ordinal, or nominal fields.");
    }
    if (args.aggregate !== undefined) throw new Error("Point position encoding does not support aggregate.");
    if (args.bin !== undefined) throw new Error("Point position encoding does not support bin.");
    if (args.stack !== undefined) throw new Error("Point position encoding does not support stack.");
  } else if (layer.mark.type === "area") {
    const validAreaPosition = fieldType === "quantitative" ||
      fieldType === "temporal";
    if (!validAreaPosition) {
      throw new Error(
        "Area position encoding requires quantitative or temporal fields."
      );
    }
    if (args.aggregate !== undefined || args.bin !== undefined) {
      throw new Error("Area position encoding does not support aggregate or bin.");
    }
    if (args.stack !== undefined) {
      if (
        channel !== "y" ||
        !dataset.transform?.some(transform => transform.type === "density")
      ) {
        throw new Error("Area stack currently requires a density y encoding.");
      }
      stack = validateStack(args.stack, "Area y encoding");
    }
  } else if (layer.mark.type === "line" && channel === "x") {
    const regression = dataset.transform?.some(item => item.type === "regression");
    const interval = dataset.transform?.some(item => item.type === "interval");
    const horizontalDirect =
      layer.encoding?.y?.fieldType === "temporal" &&
      fieldType === "quantitative";
    if (
      fieldType !== "temporal" &&
      !((regression || interval || horizontalDirect) &&
        fieldType === "quantitative")
    ) {
      throw new Error(
        "Line x encoding requires a temporal field or a compatible derived quantitative field."
      );
    }
    if (args.aggregate !== undefined) throw new Error("Line x encoding does not support aggregate.");
    if (args.bin !== undefined) throw new Error("Line x encoding does not support bin.");
    if (args.stack !== undefined) throw new Error("Line x encoding does not support stack.");
  } else if (layer.mark.type === "line") {
    if (args.bin !== undefined) throw new Error("Line y encoding does not support bin.");
    const regression = dataset.transform?.some(item => item.type === "regression");
    const interval = dataset.transform?.some(item => item.type === "interval");
    const prospectiveDirect =
      args.aggregate === undefined &&
      (fieldType === "temporal" ||
        (fieldType === "quantitative" && layer.encoding?.x === undefined));
    if (interval || prospectiveDirect) {
      if (!["quantitative", "temporal"].includes(fieldType)) {
        throw new Error(
          "Direct line y encoding requires a quantitative or temporal field."
        );
      }
      if (args.aggregate !== undefined) {
        throw new Error("Direct line y encoding does not support aggregate.");
      }
      if (args.stack !== undefined) {
        throw new Error("Line y encoding does not support stack.");
      }
      return { bin, aggregate, stack };
    }
    if (regression && fieldType !== "quantitative") {
      throw new Error(regression
        ? "Regression line y encoding requires a quantitative field."
        : "Line y encoding requires a supported aggregate field type.");
    }
    if (regression && args.aggregate !== undefined) {
      throw new Error(regression
        ? "Regression line y encoding does not support aggregate."
        : "Line y encoding requires a supported aggregate.");
    }
    if (!regression) {
      aggregate = validateAggregate(args.aggregate);
      validateAggregateFieldType(aggregate, fieldType);
    }
    if (args.stack !== undefined) throw new Error("Line y encoding does not support stack.");
  } else {
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
      if (args.bin !== undefined) throw new Error("Histogram bar y encoding does not support bin.");
      if (field !== xEncoding.field) throw new Error("Bar y field must match the binned x field.");
      aggregate = args.aggregate ?? "count";
      stack = Object.hasOwn(args, "stack") ? args.stack : "zero";
      if (aggregate !== "count") throw new Error('Histogram bar y aggregate must be "count".');
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
      throw new Error("Bar position requires quantitative, temporal, ordinal, or nominal fields.");
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
    if (
      orientation === BAR_ORIENTATIONS.horizontal &&
      candidate.encoding?.xOffset !== undefined
    ) {
      throw new Error("Horizontal grouped bars require yOffset support, which is not available yet.");
    }
  }
  return { bin, aggregate, stack };
}

export function resolvePositionEncoding(program, channel, args, operation) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "line", "bar", "area", "rule"]
  );
  const hasField = Object.hasOwn(args, "field");
  const hasDatum = Object.hasOwn(args, "datum");
  if (layer.mark.type === "rule") {
    if (hasField === hasDatum) {
      throw new Error(`${operation} requires exactly one of field or datum for a rule mark.`);
    }
    if (args.fieldType === undefined) {
      throw new Error(`${operation} requires fieldType for a rule mark.`);
    }
  } else if (hasDatum) {
    throw new Error(`${operation} does not support datum for a ${layer.mark.type} mark.`);
  }
  const previous = layer.encoding?.[channel];
  const requestedFieldType =
    args.fieldType ?? previous?.fieldType ?? "quantitative";
  const fieldType = requestedFieldType === "nominal"
    ? "nominal"
    : validateFieldType(requestedFieldType);
  const xEncoding = layer.encoding?.x;
  const field = layer.mark.type === "bar" && channel === "y" &&
    xEncoding?.bin !== undefined && args.field === undefined
    ? xEncoding.field
    : args.field;
  const datum = args.datum;
  const effectiveArgs = { ...args };
  for (const property of ["aggregate", "bin", "stack"]) {
    if (!Object.hasOwn(effectiveArgs, property) && previous !== undefined &&
      Object.hasOwn(previous, property)) {
      effectiveArgs[property] = previous[property];
    }
  }
  const policy = validateMarkPolicy(
    program,
    layer,
    dataset,
    channel,
    effectiveArgs,
    fieldType,
    field
  );
  const usesField = layer.mark.type !== "rule" || hasField;
  if (usesField && (typeof field !== "string" || field.length === 0)) {
    throw new TypeError(`${operation} field must be a non-empty string.`);
  }

  const aggregateOutput = isAggregate(policy.aggregate);
  if (layer.mark.type === "rule" && hasDatum) {
    normalizeRuleDatum(datum, fieldType, channel);
  } else if (aggregateOutput) {
    validateAggregateFieldType(policy.aggregate, fieldType);
    validateAggregateFieldValues(dataset.values, field, fieldType);
  } else if (program.markConfigs[target]?.boxPlot !== undefined) {
    for (const [index, row] of dataset.values.entries()) {
      const value = row[field];
      if (value === undefined || value === null || value === "") continue;
      if (fieldType === "quantitative" && !Number.isFinite(value)) {
        throw new TypeError(`Field "${field}" must contain a finite number at row ${index}.`);
      }
    }
  } else if (fieldType === "temporal") readTemporalField(dataset.values, field);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else readQuantitativeField(dataset.values, field);

  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    Object.hasOwn(args, "scale") ? args.scale : {}
  );
  const scale = resolvePositionScaleDefinition(
    program,
    channel,
    aggregateOutput ? "quantitative" : fieldType,
    requestedScale,
    layer.mark.type === "bar"
      ? program.markConfigs[target]?.boxPlot !== undefined && fieldType === "quantitative"
        ? { nice: true, zero: false }
        : fieldType === "quantitative"
        ? policy.bin !== undefined || policy.stack === null
          ? { nice: true, zero: false }
          : { nice: true, zero: true }
        : fieldType === "temporal"
          ? { nice: true }
          : { discreteType: "band" }
      : ["ordinal", "nominal"].includes(fieldType)
        ? { discreteType: "point" }
        : {}
  );
  if (
    layer.mark.type === "bar" &&
    ["ordinal", "nominal"].includes(fieldType) &&
    scale.type === "point"
  ) {
    throw new Error("Categorical bar positions require a band scale.");
  }
  if (isTransformedScaleType(scale.type) && layer.mark.type !== "point") {
    throw new Error(
      "Transformed position scales currently require a point mark."
    );
  }
  return {
    target,
    layer,
    previous,
    requestedScale,
    field,
    datum,
    hasField: usesField,
    fieldType,
    scale,
    coordinate: resolveCoordinate(program, channel, layer, args.coordinate),
    ...policy
  };
}
