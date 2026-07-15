import { isPlainObject } from "../../core/immutable.js";
import {
  resolveOptionalUserId,
  validateUserId
} from "../../core/identifiers.js";
import { readQuantitativeField } from "../../grammar/scales.js";
import { findDataset } from "../../selectors/datasets.js";
import { hasLayer, resolveEligibleLayer } from "../../selectors/layers.js";

const POSITION_TYPES = Object.freeze(["nominal", "ordinal", "temporal"]);
const CHANNEL_OPTIONS = Object.freeze([
  "field", "fieldType", "scale", "center", "extent", "level", "lower", "upper"
]);
const INTERVAL_PARAMETER_KEYS = Object.freeze([
  "center", "extent", "level", "lower", "upper"
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
    [...POSITION_TYPES, "quantitative"].includes(x.fieldType) &&
    [...POSITION_TYPES, "quantitative"].includes(y.fieldType)
  );
}

function resolveSourceLayer(program, args) {
  if (args.target === undefined && args.x !== undefined && args.y !== undefined) {
    return undefined;
  }
  const target = args.target === undefined
    ? undefined
    : validateUserId(args.target, "Error-bar source layer id");
  return resolveEligibleLayer(program, {
    target,
    predicate: hasCompleteFieldPositions,
    label: "createErrorBar"
  });
}

function resolveDataset(program, args, sourceLayer) {
  const requested = args.data ?? sourceLayer?.data ?? program.context.currentData;
  let dataset;
  if (requested !== undefined) {
    const id = validateUserId(requested, "Error-bar dataset id");
    dataset = findDataset(program, id);
    if (dataset === undefined) {
      throw new Error(`Unknown error-bar dataset "${id}".`);
    }
  } else if (program.semanticSpec.datasets.length === 1) {
    dataset = program.semanticSpec.datasets[0];
  }
  if (dataset === undefined) {
    throw new Error("createErrorBar requires data or one uniquely inferable dataset.");
  }
  return dataset;
}

function scaleOptions(value, inferredId, defaults = {}) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError("Error-bar scale must be a plain object.");
  }
  return {
    ...defaults,
    ...(value ?? {}),
    ...(value?.id === undefined && inferredId !== undefined
      ? { id: inferredId }
      : {})
  };
}

function hasAny(value, keys) {
  return keys.some(key => Object.hasOwn(value ?? {}, key));
}

function resolveIntervalChannel(channels, sourceLayer) {
  const explicitBounds = ["x", "y"].filter(channel =>
    hasAny(channels[channel], ["lower", "upper"])
  );
  if (explicitBounds.length > 1) {
    throw new Error("createErrorBar requires exactly one interval channel.");
  }
  if (explicitBounds.length === 1) return explicitBounds[0];

  const statisticalHints = ["x", "y"].filter(channel =>
    hasAny(channels[channel], ["center", "extent", "level"])
  );
  if (statisticalHints.length > 1) {
    throw new Error("createErrorBar requires exactly one interval channel.");
  }
  if (statisticalHints.length === 1) return statisticalHints[0];

  const effectiveTypes = Object.fromEntries(["x", "y"].map(channel => [
    channel,
    channels[channel]?.fieldType ?? sourceLayer?.encoding?.[channel]?.fieldType
  ]));
  const positional = ["x", "y"].filter(channel =>
    POSITION_TYPES.includes(effectiveTypes[channel])
  );
  const quantitative = ["x", "y"].filter(channel =>
    effectiveTypes[channel] === "quantitative"
  );
  if (positional.length === 1 && quantitative.length === 1) {
    return quantitative[0];
  }
  if (positional.length === 1) {
    return positional[0] === "x" ? "y" : "x";
  }
  if (sourceLayer !== undefined) {
    throw new Error(
      "createErrorBar requires one quantitative interval axis and one nominal, ordinal, or temporal position axis."
    );
  }
  return "y";
}

function resolvePosition(channel, explicit, inferred) {
  if (hasAny(explicit, INTERVAL_PARAMETER_KEYS)) {
    throw new Error(`createErrorBar ${channel} position does not accept interval options.`);
  }
  const fieldType = explicit?.fieldType ?? inferred?.fieldType ?? "nominal";
  if (!POSITION_TYPES.includes(fieldType)) {
    throw new Error(
      `createErrorBar ${channel} position requires a nominal, ordinal, or temporal field.`
    );
  }
  return {
    channel,
    field: requireField(
      explicit?.field ?? inferred?.field,
      `createErrorBar ${channel} field`
    ),
    fieldType,
    scale: scaleOptions(explicit?.scale, inferred?.scale)
  };
}

function resolveInterval(channel, explicit, inferred, dataset) {
  if (explicit?.fieldType !== undefined) {
    throw new Error(`createErrorBar ${channel} interval does not accept fieldType.`);
  }
  if (inferred !== undefined && inferred.fieldType !== "quantitative") {
    throw new Error(`createErrorBar ${channel} interval requires a quantitative field.`);
  }
  const hasLower = Object.hasOwn(explicit ?? {}, "lower");
  const hasUpper = Object.hasOwn(explicit ?? {}, "upper");
  const explicitMode = hasLower || hasUpper;
  const scale = scaleOptions(
    explicit?.scale,
    inferred?.scale,
    inferred === undefined ? { nice: true, zero: false } : {}
  );
  if (explicitMode) {
    if (!hasLower || !hasUpper || !Object.hasOwn(explicit, "center")) {
      throw new Error(
        `Explicit createErrorBar ${channel} interval requires center, lower, and upper fields.`
      );
    }
    if (
      explicit.field !== undefined ||
      explicit.extent !== undefined ||
      explicit.level !== undefined
    ) {
      throw new Error(
        `Explicit createErrorBar ${channel} interval cannot combine field, extent, or level.`
      );
    }
    const fields = {
      center: requireField(explicit.center, `createErrorBar ${channel} center`),
      lower: requireField(explicit.lower, `createErrorBar ${channel} lower`),
      upper: requireField(explicit.upper, `createErrorBar ${channel} upper`)
    };
    if (new Set(Object.values(fields)).size !== 3) {
      throw new Error("Explicit error-bar center, lower, and upper fields must be distinct.");
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
      `createErrorBar ${channel} field`
    ),
    center: explicit?.center,
    extent: explicit?.extent,
    level: explicit?.level,
    scale
  };
}

function resolveGroupBy(args, sourceLayer, independentField, mode) {
  if (mode === "explicit") {
    if (args.groupBy !== undefined) {
      throw new Error("Explicit createErrorBar intervals do not accept groupBy.");
    }
    return undefined;
  }
  const inferred = sourceLayer?.encoding?.group?.field;
  const requested = args.groupBy ?? inferred;
  if (requested === undefined || requested === independentField) {
    return [independentField];
  }
  return [
    independentField,
    requireField(requested, "createErrorBar groupBy")
  ];
}

function resolveOwner(program, requested) {
  const defaultId = "errorBar";
  const defaultOccupied = hasLayer(program, defaultId) ||
    program.graphicSpec.objects[defaultId] !== undefined ||
    findDataset(program, `${defaultId}IntervalData`) !== undefined;
  return resolveOptionalUserId(requested, {
    defaultId,
    label: "Error-bar id",
    operation: "createErrorBar",
    ambiguous: defaultOccupied
  });
}

export function resolveErrorBar(program, args) {
  const channels = {
    x: args.x === undefined ? undefined : requireObject(args.x, "createErrorBar x"),
    y: args.y === undefined ? undefined : requireObject(args.y, "createErrorBar y")
  };
  const sourceLayer = resolveSourceLayer(program, args);
  const dataset = resolveDataset(program, args, sourceLayer);
  const intervalChannel = resolveIntervalChannel(channels, sourceLayer);
  const positionChannel = intervalChannel === "x" ? "y" : "x";
  const position = resolvePosition(
    positionChannel,
    channels[positionChannel],
    sourceLayer?.encoding?.[positionChannel]
  );
  const interval = resolveInterval(
    intervalChannel,
    channels[intervalChannel],
    sourceLayer?.encoding?.[intervalChannel],
    dataset
  );
  const id = resolveOwner(program, args.id);
  const generatedFields = {
    center: `__${id}_center`,
    lower: `__${id}_lower`,
    upper: `__${id}_upper`
  };
  const fields = interval.mode === "explicit" ? interval.fields : generatedFields;

  return {
    id,
    sourceLayer,
    source: dataset.id,
    dataId: interval.mode === "statistical" ? `${id}IntervalData` : dataset.id,
    coordinate: validateUserId(
      args.coordinate ?? sourceLayer?.coordinate ?? "main",
      "Error-bar coordinate id"
    ),
    orientation: intervalChannel === "y" ? "vertical" : "horizontal",
    position,
    interval,
    fields,
    groupBy: resolveGroupBy(args, sourceLayer, position.field, interval.mode),
    lowerCapId: `${id}LowerCap`,
    upperCapId: `${id}UpperCap`
  };
}
