import { validateUserId } from "../../../core/identifiers.js";
import {
  LEGEND_CHANNELS,
  LEGEND_CONFIG_KINDS
} from "../../../core/vocabulary.js";
import { isEnumeratedSizeScaleType } from "../../../grammar/scales/index.js";

export function validateLegendChannels(channels, operation) {
  if (!Array.isArray(channels)) throw new TypeError(`${operation} channels must be an array.`);
  if (channels.length === 0) throw new Error(`${operation} channels must select at least one channel.`);
  const seen = new Set();
  for (const channel of channels) {
    if (!LEGEND_CHANNELS.includes(channel)) throw new Error(`Unsupported legend channel "${channel}".`);
    if (seen.has(channel)) throw new Error(`${operation} channels contains duplicate "${channel}".`);
    seen.add(channel);
  }
}

export function legendTargets(program) {
  return [...new Set(Object.values(program.guideConfigs.legend ?? {})
    .map(config => config?.target)
    .filter(Boolean))];
}

export function resolveLegendTarget(program, requested, operation) {
  const targets = legendTargets(program);
  if (requested !== undefined) {
    const target = validateUserId(requested, "Legend target id");
    if (!targets.includes(target)) {
      throw new Error(`Unknown legend target "${target}".`);
    }
    return target;
  }
  if (operation === "removeLegend" && targets.length === 0) {
    throw new Error("removeLegend requires an existing legend.");
  }
  if (targets.length !== 1) {
    throw new Error(`${operation} requires target when the legend is ambiguous.`);
  }
  return targets[0];
}

const CATEGORICAL_KINDS = Object.freeze(["series", "color", "stroke"]);
const SINGLE_CHANNELS = Object.freeze({
  size: "size",
  opacity: "opacity",
  strokeWidth: "strokeWidth",
  gradient: "color",
  interval: "color",
  strokeGradient: "stroke",
  strokeInterval: "stroke"
});

const asciiCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

export function legendBlockChannels(kind, config) {
  const channels = CATEGORICAL_KINDS.includes(kind)
    ? config?.channels
    : SINGLE_CHANNELS[kind] === undefined
      ? undefined
      : [SINGLE_CHANNELS[kind]];
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error(`Legend block ${kind} requires at least one channel.`);
  }
  validateLegendChannels(channels, `Legend block ${kind}`);
  return Object.freeze([...channels].sort(asciiCompare));
}

export function legendBlockKey(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("Legend block key requires a non-empty channel array.");
  }
  return JSON.stringify([...channels].sort(asciiCompare));
}

export function describeLegendBlock(program, kind, config) {
  if (!LEGEND_CONFIG_KINDS.includes(kind)) {
    throw new Error(`Unknown legend block kind "${kind}".`);
  }
  const channels = legendBlockChannels(kind, config);
  const scaleIds = CATEGORICAL_KINDS.includes(kind)
    ? config?.scales
    : [config?.scale];
  if (!Array.isArray(scaleIds) || scaleIds.length === 0 ||
    scaleIds.some(id => typeof id !== "string" || program.resolvedScales[id] === undefined)) {
    throw new Error(`Legend block ${kind} requires resolved scales.`);
  }
  const family = CATEGORICAL_KINDS.includes(kind)
    ? "categorical"
    : kind === "size"
      ? isEnumeratedSizeScaleType(program.resolvedScales[scaleIds[0]].type)
        ? "discrete-size"
        : "sampled"
      : ["opacity", "strokeWidth"].includes(kind)
        ? "sampled"
        : ["gradient", "strokeGradient"].includes(kind)
          ? "gradient"
          : "interval";
  return Object.freeze({
    target: config.target,
    kind,
    family,
    key: legendBlockKey(channels),
    channels,
    scaleIds: Object.freeze([...scaleIds]),
    config
  });
}

export function legendBlockDescriptors(program, target) {
  const requested = validateUserId(target, "Legend target id");
  const descriptors = LEGEND_CONFIG_KINDS.flatMap(kind => {
    const config = program.guideConfigs.legend?.[kind];
    return config?.target === requested
      ? [describeLegendBlock(program, kind, config)]
      : [];
  });
  const seen = new Set();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.key)) {
      throw new Error(
        `Legend target "${requested}" has ambiguous block key ${descriptor.key}.`
      );
    }
    seen.add(descriptor.key);
  }
  return Object.freeze(descriptors);
}

export function resolveLegendBlock(program, { target, channel }, operation = "editLegendBlock") {
  const requested = resolveLegendTarget(program, target, operation);
  if (!LEGEND_CHANNELS.includes(channel)) {
    throw new Error(`${operation} has unsupported legend channel "${channel}".`);
  }
  const matches = legendBlockDescriptors(program, requested)
    .filter(descriptor => descriptor.channels.includes(channel));
  if (matches.length === 0) {
    throw new Error(
      `${operation} target "${requested}" has no legend block for channel "${channel}".`
    );
  }
  if (matches.length !== 1) {
    throw new Error(
      `${operation} target "${requested}" has ambiguous channel "${channel}".`
    );
  }
  return matches[0];
}
