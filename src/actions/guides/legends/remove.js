import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import {
  removeLegendKinds,
  resolveCategoricalLegendRevision,
  createCategoricalLegendFromConfig
} from "./lifecycle.js";
import { resolveLegendTarget, validateLegendChannels } from "./target.js";

export { removeLegendKinds } from "./lifecycle.js";

const OPTIONS = Object.freeze(["target", "channels"]);

function legendKindChannels(kind, config) {
  if (["series", "color"].includes(kind)) return config.channels;
  return {
    size: ["size"],
    gradient: ["color"],
    interval: ["color"],
    opacity: ["opacity"],
    strokeWidth: ["strokeWidth"]
  }[kind];
}

function resolveRequestedRemoval(program, target, channels) {
  validateLegendChannels(channels, "removeLegend");
  const requested = new Set(channels);
  const matched = new Set();
  const kinds = [];
  let partial;
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    if (config?.target !== target) continue;
    const owned = legendKindChannels(kind, config);
    const overlap = owned.filter(channel => requested.has(channel));
    if (overlap.length === 0) continue;
    kinds.push(kind);
    for (const channel of overlap) matched.add(channel);
    if (overlap.length !== owned.length) {
      partial = { kind, config, channels: owned.filter(channel => !requested.has(channel)) };
    }
  }
  const missing = channels.filter(channel => !matched.has(channel));
  if (missing.length > 0) {
    throw new Error(`Legend target "${target}" has no complete block for channel "${missing[0]}".`);
  }
  // Remove departing sibling configs from the immutable layout preflight view.
  const view = kinds.reduce((next, kind) =>
    next._withoutMaterializationConfig(["guides", "legend", kind]), program);
  const revision = partial === undefined ? undefined
    : resolveCategoricalLegendRevision(view, partial.kind, partial.config, partial.channels);
  return { kinds, revision };
}

export function removeOwnedColorLegends(program, target) {
  const kinds = Object.entries(program.guideConfigs.legend ?? {})
    .filter(([kind, config]) => config?.target === target && (
      config.channels?.includes("color") || ["gradient", "interval"].includes(kind)
    )).map(([kind]) => kind);
  return kinds.length === 0 ? program : removeLegendKinds(program, kinds);
}

export const removeLegend = action(
  { op: "removeLegend", description: "Remove selected legend content or every block owned by one mark." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "removeLegend");
    const target = resolveLegendTarget(this, args.target, "removeLegend");
    const targetKinds = Object.entries(this.guideConfigs.legend ?? {})
      .filter(([, config]) => config?.target === target)
      .map(([kind]) => kind);
    const { kinds, revision } = args.channels === undefined
      ? { kinds: targetKinds }
      : resolveRequestedRemoval(this, target, args.channels);
    let next = removeLegendKinds(this, kinds);
    if (revision !== undefined) {
      next = createCategoricalLegendFromConfig(next, revision.config, revision.order);
    }
    const retainedKinds = Object.keys(next.guideConfigs.legend ?? {});
    if (args.channels === undefined) {
      return retainedKinds.length === 0
        ? next
        : next.rematerializeLegend();
    }
    const remainingTargetKinds = targetKinds.filter(kind => !kinds.includes(kind));
    const removedCategorical = kinds.some(kind => ["series", "color"].includes(kind));
    if (
      removedCategorical && revision === undefined &&
      remainingTargetKinds.includes("size") &&
      next.guideConfigs.legend.size.inheritAppearance === true
    ) {
      next = next._withLegendConfig("size", {
        ...next.guideConfigs.legend.size,
        inheritAppearance: false
      });
    }
    return retainedKinds.length === 0
      ? next
      : next.rematerializeLegend();
  }
);
