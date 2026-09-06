import { isPlainObject } from "../../core/immutable.js";
import {
  resolveOptionalUserId,
  validateUserId
} from "../../core/identifiers.js";
import {
  validateNonEmptyString as requireField,
  validateOptionObject
} from "../../core/validation.js";
import { readQuantitativeField, resolveTemporalUnit } from "../../grammar/scales/index.js";
import { findDataset } from "../../selectors/datasets.js";
import { hasLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";

const CHANNEL_OPTIONS = [
  "field", "fieldType", "scale", "center", "extent", "method", "level", "lower", "upper", "temporalUnit"
];
const INTERVAL_PARAMETER_KEYS = ["center", "extent", "method", "level", "lower", "upper"];
const POSITION_CHANNELS = ["x", "y"];
const FIELD_TYPES = [
  "quantitative", "temporal", "ordinal", "nominal"
];

function requireObject(value, label) {
  return validateOptionObject(value, CHANNEL_OPTIONS, label, {
    plainObjectMessage: `${label} must be a plain object.`
  });
}

function hasCompleteFieldPositions(layer) {
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;
  return (
    typeof layer.data === "string" &&
    typeof layer.coordinate === "string" &&
    [x, y].every(encoding =>
      typeof encoding?.field === "string" &&
      typeof encoding.scale === "string" &&
      FIELD_TYPES.includes(encoding.fieldType)
    )
  );
}

function scaleOptions(program, value, inferredId, defaults = {}) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError("Interval scale must be a plain object.");
  }
  const id = value?.id ?? inferredId;
  const scale = {
    ...(id !== undefined && findSemanticScale(program, id) !== undefined
      ? {}
      : defaults),
    ...(value ?? {}),
    ...(value?.id === undefined && inferredId !== undefined
      ? { id: inferredId }
      : {})
  };
  if (value?.type === "log" && value.zero === undefined) delete scale.zero;
  return scale;
}

function hasAny(value, keys) {
  return keys.some(key => Object.hasOwn(value ?? {}, key));
}

function resolveIntervalChannel(channels, sourceLayer, {
  operation,
  positionTypes,
  defaultIntervalChannel,
  ambiguousMessage
}) {
  for (const hints of [
    ["lower", "upper"],
    ["center", "extent", "method", "level"]
  ]) {
    const hinted = POSITION_CHANNELS.filter(channel =>
      hasAny(channels[channel], hints)
    );
    if (hinted.length > 1) {
      throw new Error(`${operation} requires exactly one interval channel.`);
    }
    if (hinted.length === 1) return hinted[0];
  }

  const effectiveTypes = {};
  for (const channel of POSITION_CHANNELS) {
    effectiveTypes[channel] = channels[channel]?.fieldType ??
      sourceLayer?.encoding?.[channel]?.fieldType;
  }
  const quantitative = POSITION_CHANNELS.filter(channel =>
    effectiveTypes[channel] === "quantitative"
  );
  const positional = POSITION_CHANNELS.filter(channel =>
    positionTypes.includes(effectiveTypes[channel])
  );
  if (quantitative.length === 1) {
    const positionChannel = quantitative[0] === "x" ? "y" : "x";
    if (positionTypes.includes(effectiveTypes[positionChannel])) {
      return quantitative[0];
    }
  }
  if (positional.length === 1) {
    return positional[0] === "x" ? "y" : "x";
  }
  if (sourceLayer !== undefined) {
    throw new Error(ambiguousMessage);
  }
  return defaultIntervalChannel;
}

function resolvePosition(program, channel, explicit, inferred, {
  operation,
  positionTypes,
  defaultPositionType,
  scaleDefaults
}) {
  if (hasAny(explicit, INTERVAL_PARAMETER_KEYS)) {
    throw new Error(`${operation} ${channel} position does not accept interval options.`);
  }
  const fieldType = explicit?.fieldType ?? inferred?.fieldType ?? defaultPositionType;
  if (!positionTypes.includes(fieldType)) {
    throw new Error(
      `${operation} ${channel} position requires ${positionTypes.join(", ")} field type.`
    );
  }
  const temporalUnit = resolveTemporalUnit({ ...explicit, field: explicit?.field ?? inferred?.field }, fieldType, inferred);
  return {
    channel,
    ...(temporalUnit === undefined ? {} : { temporalUnit }),
    field: requireField(
      explicit?.field ?? inferred?.field,
      `${operation} ${channel} field`
    ),
    fieldType,
    scale: scaleOptions(
      program,
      explicit?.scale,
      inferred?.scale,
      inferred === undefined ? scaleDefaults(fieldType) : {}
    )
  };
}

function resolveInterval(program, channel, explicit, inferred, dataset, {
  operation,
  intervalScaleDefaults
}) {
  if (Object.hasOwn(explicit ?? {}, "temporalUnit")) {
    throw new Error(`${operation} ${channel} interval does not accept temporalUnit.`);
  }
  if (explicit?.fieldType !== undefined) {
    throw new Error(`${operation} ${channel} interval does not accept fieldType.`);
  }
  if (inferred !== undefined && inferred.fieldType !== "quantitative") {
    throw new Error(`${operation} ${channel} interval requires a quantitative field.`);
  }
  const hasLower = Object.hasOwn(explicit ?? {}, "lower");
  const hasUpper = Object.hasOwn(explicit ?? {}, "upper");
  const explicitMode = hasLower || hasUpper;
  const scale = scaleOptions(
    program,
    explicit?.scale,
    inferred?.scale,
    inferred === undefined ? intervalScaleDefaults : {}
  );
  if (explicitMode) {
    if (!hasLower || !hasUpper || !Object.hasOwn(explicit, "center")) {
      throw new Error(
        `Explicit ${operation} ${channel} interval requires center, lower, and upper fields.`
      );
    }
    if (
      explicit.field !== undefined ||
      explicit.extent !== undefined ||
      explicit.method !== undefined ||
      explicit.level !== undefined
    ) {
      throw new Error(
        `Explicit ${operation} ${channel} interval cannot combine field, extent, method, or level.`
      );
    }
    const fields = {
      center: requireField(explicit.center, `${operation} ${channel} center`),
      lower: requireField(explicit.lower, `${operation} ${channel} lower`),
      upper: requireField(explicit.upper, `${operation} ${channel} upper`)
    };
    const fieldValues = Object.values(fields);
    if (new Set(fieldValues).size !== 3) {
      throw new Error("Explicit interval center, lower, and upper fields must be distinct.");
    }
    for (const field of fieldValues) {
      readQuantitativeField(dataset.values, field);
    }
    return { channel, mode: "explicit", fields, scale, title: fields.center };
  }
  return {
    channel,
    mode: "statistical",
    field: requireField(
      explicit?.field ?? inferred?.field,
      `${operation} ${channel} field`
    ),
    center: explicit?.center,
    extent: explicit?.extent,
    method: explicit?.method,
    level: explicit?.level,
    scale
  };
}

function resolveGrouping(args, sourceLayer, independentField, mode, {
  operation,
  allowExplicitGrouping
}) {
  if (mode === "explicit" && !allowExplicitGrouping && args.groupBy !== undefined) {
    throw new Error(`Explicit ${operation} intervals do not accept groupBy.`);
  }
  const inferred = sourceLayer?.encoding?.group?.field;
  const groupField = args.groupBy ?? inferred;
  const normalizedGroup = groupField === undefined
    ? undefined
    : requireField(groupField, `${operation} groupBy`);
  return {
    groupField: normalizedGroup,
    transformGroupBy: mode === "statistical"
      ? normalizedGroup === undefined || normalizedGroup === independentField
        ? [independentField]
        : [independentField, normalizedGroup]
      : undefined
  };
}

export function resolveIntervalComposite(program, args, policy) {
  const { operation, resourceLabel } = policy;
  const channels = {
    x: args.x === undefined
      ? undefined
      : requireObject(args.x, `${operation} x`),
    y: args.y === undefined
      ? undefined
      : requireObject(args.y, `${operation} y`)
  };
  let sourceLayer;
  if (!(args.target === undefined && args.x !== undefined && args.y !== undefined)) {
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, `${operation} source layer id`);
    sourceLayer = resolveEligibleLayer(program, {
      target,
      predicate: hasCompleteFieldPositions,
      label: operation
    });
  }
  const requested = args.data ?? sourceLayer?.data ?? program.context.currentData;
  let dataset;
  if (requested !== undefined) {
    const dataId = validateUserId(requested, `${resourceLabel} dataset id`);
    dataset = findDataset(program, dataId);
    if (dataset === undefined) {
      throw new Error(`Unknown ${resourceLabel} dataset "${dataId}".`);
    }
  } else if (program.semanticSpec.datasets.length === 1) {
    dataset = program.semanticSpec.datasets[0];
  }
  if (dataset === undefined) {
    throw new Error(`${operation} requires data or one uniquely inferable dataset.`);
  }
  if (sourceLayer !== undefined && dataset.id !== sourceLayer.data) {
    throw new Error(
      `${operation} data must match source layer "${sourceLayer.id}" data "${sourceLayer.data}".`
    );
  }
  const intervalChannel = resolveIntervalChannel(channels, sourceLayer, policy);
  const positionChannel = intervalChannel === "x" ? "y" : "x";
  const position = resolvePosition(
    program,
    positionChannel,
    channels[positionChannel],
    sourceLayer?.encoding?.[positionChannel],
    policy
  );
  const interval = resolveInterval(
    program,
    intervalChannel,
    channels[intervalChannel],
    sourceLayer?.encoding?.[intervalChannel],
    dataset,
    policy
  );
  const defaultId = policy.defaultId;
  const id = resolveOptionalUserId(args.id, {
    defaultId,
    label: policy.ownerLabel,
    operation,
    ambiguous: hasLayer(program, defaultId) ||
      program.graphicSpec.objects[defaultId] !== undefined ||
      findDataset(program, `${defaultId}IntervalData`) !== undefined
  });
  const generatedFields = {
    center: `__${id}_center`,
    lower: `__${id}_lower`,
    upper: `__${id}_upper`
  };
  const fields = interval.mode === "explicit" ? interval.fields : generatedFields;
  const grouping = resolveGrouping(
    args,
    sourceLayer,
    position.field,
    interval.mode,
    policy
  );

  return {
    id,
    sourceLayer,
    source: dataset.id,
    dataId: interval.mode === "statistical" ? `${id}IntervalData` : dataset.id,
    coordinate: validateUserId(
      args.coordinate ?? sourceLayer?.coordinate ?? "main",
      `${resourceLabel} coordinate id`
    ),
    orientation: intervalChannel === "y" ? "vertical" : "horizontal",
    position,
    interval,
    fields,
    groupField: grouping.groupField,
    groupBy: grouping.transformGroupBy
  };
}
