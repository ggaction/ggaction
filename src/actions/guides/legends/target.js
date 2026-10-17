import { validateUserId } from "../../../core/identifiers.js";
import {
  LEGEND_CHANNELS,
  LEGEND_CONFIG_KINDS
} from "../../../core/vocabulary.js";
import { validateLegendChannels, describeLegendBlock } from "../../../grammar/legendBlocks.js";
export { validateLegendChannels, describeLegendBlock, legendBlockKey, legendBlockChannels } from "../../../grammar/legendBlocks.js";

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
