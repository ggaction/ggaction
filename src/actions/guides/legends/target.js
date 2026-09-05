import { validateUserId } from "../../../core/identifiers.js";
import { LEGEND_CHANNELS } from "../../../core/vocabulary.js";

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
