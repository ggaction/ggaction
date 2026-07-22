import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { legendGraphicIds, legendResourcePolicy } from
  "../../../materialization/guides/resources.js";
import { LEGEND_CHANNELS } from "../../../core/vocabulary.js";
import { resolveLegendTarget } from "./target.js";

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

function validateRequestedChannels(channels) {
  if (!Array.isArray(channels)) {
    throw new TypeError("removeLegend channels must be an array.");
  }
  if (channels.length === 0) {
    throw new Error("removeLegend channels must select at least one channel.");
  }
  const seen = new Set();
  for (const channel of channels) {
    if (!LEGEND_CHANNELS.includes(channel)) {
      throw new Error(`Unsupported legend channel "${channel}".`);
    }
    if (seen.has(channel)) {
      throw new Error(`removeLegend channels contains duplicate "${channel}".`);
    }
    seen.add(channel);
  }
}

function resolveRequestedKinds(program, target, channels) {
  validateRequestedChannels(channels);
  const requested = new Set(channels);
  const matched = new Set();
  const kinds = [];
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    if (config?.target !== target) continue;
    const owned = legendKindChannels(kind, config);
    const overlap = owned.filter(channel => requested.has(channel));
    if (overlap.length > 0 && overlap.length !== owned.length) {
      throw new Error(
        `Legend channels ${owned.map(channel => `"${channel}"`).join(", ")} ` +
        "belong to one combined block and must be removed together."
      );
    }
    if (overlap.length === owned.length) {
      kinds.push(kind);
      for (const channel of owned) matched.add(channel);
    }
  }
  const missing = channels.filter(channel => !matched.has(channel));
  if (missing.length > 0) {
    throw new Error(
      `Legend target "${target}" has no complete block for channel "${missing[0]}".`
    );
  }
  return kinds;
}

export function removeLegendKinds(program, kinds) {
  const removed = new Set(kinds);
  const retainedSemanticKinds = new Set(
    Object.entries(program.guideConfigs.legend ?? {})
      .filter(([kind]) => !removed.has(kind))
      .map(([kind]) => legendResourcePolicy(kind).semanticKind)
  );
  const semanticKinds = new Set(
    kinds.map(kind => legendResourcePolicy(kind).semanticKind)
  );
  let next = program;
  for (const kind of semanticKinds) {
    if (
      !retainedSemanticKinds.has(kind) &&
      next.semanticSpec.guides.legend?.[kind] !== undefined
    ) {
      next = next.editSemantic({
        property: `guide.legend.${kind}`,
        remove: true
      });
    }
  }
  for (const id of new Set(kinds.flatMap(legendGraphicIds))) {
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  }
  for (const kind of kinds) {
    next = next._withoutMaterializationConfig(["guides", "legend", kind]);
  }
  return next;
}

export const removeLegend = action(
  { op: "removeLegend", description: "Remove every legend block owned by one mark." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "removeLegend");
    const target = resolveLegendTarget(this, args.target, "removeLegend");
    const targetKinds = Object.entries(this.guideConfigs.legend ?? {})
      .filter(([, config]) => config?.target === target)
      .map(([kind]) => kind);
    const kinds = args.channels === undefined
      ? targetKinds
      : resolveRequestedKinds(this, target, args.channels);
    let next = removeLegendKinds(this, kinds);
    if (args.channels === undefined) return next;
    const remainingTargetKinds = targetKinds.filter(kind => !kinds.includes(kind));
    const removedCategorical = kinds.some(kind => ["series", "color"].includes(kind));
    if (
      removedCategorical &&
      remainingTargetKinds.includes("size") &&
      next.guideConfigs.legend.size.inheritAppearance === true
    ) {
      next = next._withLegendConfig("size", {
        ...next.guideConfigs.legend.size,
        inheritAppearance: false
      });
    }
    return Object.keys(next.guideConfigs.legend ?? {}).length === 0
      ? next
      : next.rematerializeLegend();
  }
);
