import { isPlainObject } from "../../core/immutable.js";
import {
  resolveOptionalUserId,
  validateUserId
} from "../../core/identifiers.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { findDataset } from "../../selectors/datasets.js";
import { hasLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";

const CHANNEL_OPTIONS = Object.freeze([
  "field", "fieldType", "scale", "center", "extent", "level", "lower", "upper"
]);
const INTERVAL_PARAMETER_KEYS = Object.freeze([
  "center", "extent", "level", "lower", "upper"
]);
const FIELD_TYPES = Object.freeze([
  "quantitative", "temporal", "ordinal", "nominal"
]);

function requireObject(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const unknown = Object.keys(value).find(key => !CHANNEL_OPTIONS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} option "${unknown}".`);
  }
  return value;
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function hasCompleteFieldPositions(layer) {
  const x = layer.encoding?.x;
  const y = layer.encoding?.y;
  return (
    typeof layer.data === "string" &&
    typeof layer.coordinate === "string" &&
    typeof x?.field === "string" &&
    typeof y?.field === "string" &&
    typeof x.scale === "string" &&
    typeof y.scale === "string" &&
    FIELD_TYPES.includes(x.fieldType) &&
    FIELD_TYPES.includes(y.fieldType)
  );
}

function resolveSourceLayer(program, args, operation) {
  if (args.target === undefined && args.x !== undefined && args.y !== undefined) {
    return undefined;
  }
  const target = args.target === undefined
    ? undefined
    : validateUserId(args.target, `${operation} source layer id`);
  return resolveEligibleLayer(program, {
    target,
    predicate: hasCompleteFieldPositions,
    label: operation
  });
}

function resolveDataset(program, args, sourceLayer, operation, resourceLabel) {
  const requested = args.data ?? sourceLayer?.data ?? program.context.currentData;
  let dataset;
  if (requested !== undefined) {
    const id = validateUserId(requested, `${resourceLabel} dataset id`);
    dataset = findDataset(program, id);
    if (dataset === undefined) {
      throw new Error(`Unknown ${resourceLabel} dataset "${id}".`);
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
  return dataset;
}

function scaleOptions(program, value, inferredId, defaults = {}) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError("Interval scale must be a plain object.");
  }
  const id = value?.id ?? inferredId;
  const usesExisting = id !== undefined && findSemanticScale(program, id) !== undefined;
  return {
    ...(usesExisting ? {} : defaults),
    ...(value ?? {}),
    ...(value?.id === undefined && inferredId !== undefined
      ? { id: inferredId }
      : {})
  };
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
  const explicitBounds = ["x", "y"].filter(channel =>
    hasAny(channels[channel], ["lower", "upper"])
  );
  if (explicitBounds.length > 1) {
    throw new Error(`${operation} requires exactly one interval channel.`);
  }
  if (explicitBounds.length === 1) return explicitBounds[0];

  const statisticalHints = ["x", "y"].filter(channel =>
    hasAny(channels[channel], ["center", "extent", "level"])
  );
  if (statisticalHints.length > 1) {
    throw new Error(`${operation} requires exactly one interval channel.`);
  }
  if (statisticalHints.length === 1) return statisticalHints[0];

  const effectiveTypes = Object.fromEntries(["x", "y"].map(channel => [
    channel,
    channels[channel]?.fieldType ?? sourceLayer?.encoding?.[channel]?.fieldType
  ]));
  const quantitative = ["x", "y"].filter(channel =>
    effectiveTypes[channel] === "quantitative"
  );
  const positional = ["x", "y"].filter(channel =>
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
  return {
    channel,
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
      explicit.level !== undefined
    ) {
      throw new Error(
        `Explicit ${operation} ${channel} interval cannot combine field, extent, or level.`
      );
    }
    const fields = {
      center: requireField(explicit.center, `${operation} ${channel} center`),
      lower: requireField(explicit.lower, `${operation} ${channel} lower`),
      upper: requireField(explicit.upper, `${operation} ${channel} upper`)
    };
    if (new Set(Object.values(fields)).size !== 3) {
      throw new Error("Explicit interval center, lower, and upper fields must be distinct.");
    }
    for (const field of Object.values(fields)) {
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

function resolveOwner(program, requested, {
  defaultId,
  ownerLabel,
  operation
}) {
  const defaultOccupied = hasLayer(program, defaultId) ||
    program.graphicSpec.objects[defaultId] !== undefined ||
    findDataset(program, `${defaultId}IntervalData`) !== undefined;
  return resolveOptionalUserId(requested, {
    defaultId,
    label: ownerLabel,
    operation,
    ambiguous: defaultOccupied
  });
}

export function resolveIntervalComposite(program, args, policy) {
  const channels = {
    x: args.x === undefined
      ? undefined
      : requireObject(args.x, `${policy.operation} x`),
    y: args.y === undefined
      ? undefined
      : requireObject(args.y, `${policy.operation} y`)
  };
  const sourceLayer = resolveSourceLayer(program, args, policy.operation);
  const dataset = resolveDataset(
    program,
    args,
    sourceLayer,
    policy.operation,
    policy.resourceLabel
  );
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
  const id = resolveOwner(program, args.id, policy);
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
      `${policy.resourceLabel} coordinate id`
    ),
    orientation: intervalChannel === "y" ? "vertical" : "horizontal",
    position,
    interval,
    fields,
    groupField: grouping.groupField,
    groupBy: grouping.transformGroupBy
  };
}
