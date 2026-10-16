import { legendResourcePolicy } from "../../../materialization/guides/resources.js";
import { LEGEND_POSITIONS, LEGEND_BLOCK_LAYOUTS } from "../../../core/vocabulary.js";
import { validateLegendGroupState } from "../../../grammar/legendGroups.js";
import { validateOptionObject, validateNonNegativeFinite } from "../../../core/validation.js";
import { PLOT_LEGEND_POSITIONS } from "../../../layout/legend.js";
import { legendGroup } from "../../../materialization/legendGroups.js";

const EDGES = LEGEND_POSITIONS;

export function validateLegendGroupOptions(args) {
  if (Object.hasOwn(args, "at")) {
    validateOptionObject(args.at, ["x", "y"], "Legend at");
    if (!Number.isFinite(args.at.x) || !Number.isFinite(args.at.y)) {
      throw new TypeError("Legend at requires finite x and y coordinates.");
    }
    if (["position", "align", "offset"].some(key => Object.hasOwn(args, key))) {
      throw new Error("Legend at conflicts with position, align and offset in the same call.");
    }
  }
  if (Object.hasOwn(args, "blockLayout") && !LEGEND_BLOCK_LAYOUTS.includes(args.blockLayout)) {
    throw new Error("Legend blockLayout must be row, column or wrap.");
  }
}

function sameAnchor(a, b) {
  return a.at !== undefined || b.at !== undefined
    ? a.at !== undefined && b.at !== undefined && a.at.x === b.at.x && a.at.y === b.at.y
    : a.position === b.position && a.align === b.align && a.offset === b.offset;
}

export function prepareLegendGroup(program, args, target, { creation = false, corner = false, nativeOffset = 30 } = {}) {
  validateLegendGroupOptions(args);
  const previous = legendGroup(program, target);
  const opted = previous !== undefined || args.at !== undefined || args.blockLayout !== undefined || corner;
  const { at: _at, blockLayout: _layout, ...options } = args;
  if (!opted) return { program, options, grouped: false };
  const entries = Object.entries(program.guideConfigs.legend ?? {}).filter(([, config]) => config.target === target);
  const configs = entries.map(([, config]) => config);
  const categorical = entries.find(([kind]) => ["series", "color", "stroke"].includes(kind));
  const nativeDefaultOffset = categorical?.[1].offset ?? nativeOffset;
  if (configs.some(config => config.layout === "legacy-bottom") || args.layout === "legacy-bottom") {
    throw new Error("Legend groups require edge layout.");
  }
  let placement;
  if (args.at !== undefined) placement = { at: { ...args.at } };
  else if (args.position !== undefined) {
    if (!EDGES.includes(args.position)) throw new Error(`Unsupported legend position "${args.position}".`);
    const inside = PLOT_LEGEND_POSITIONS.includes(args.position);
    const same = previous?.placement.position === args.position;
    placement = { position: args.position,
      align: args.align ?? (same ? previous.placement.align : "center"),
      offset: args.offset ?? (same ? previous.placement.offset : inside ? 8 : nativeDefaultOffset) };
  } else if (previous !== undefined) {
    placement = previous.placement.at === undefined
      ? { ...previous.placement,
          ...(args.align === undefined ? {} : { align: args.align }),
          ...(args.offset === undefined ? {} : { offset: args.offset }) }
      : previous.placement;
    if (previous.placement.at !== undefined && (args.align !== undefined || args.offset !== undefined)) {
      throw new Error("Free legend placement requires position before align or offset.");
    }
  } else {
    const anchors = configs.map(config => ({ position: config.position,
      align: config.align, offset: config.offset }));
    if (anchors.length > 1 && !anchors.every(anchor => sameAnchor(anchor, anchors[0]))) {
      throw new Error("Legend blockLayout requires an explicit anchor when existing blocks disagree.");
    }
    placement = anchors[0] ?? { position: "right", align: "center", offset: nativeDefaultOffset };
  }
  if (placement.position !== undefined) {
    if (!["left", "center", "right"].includes(placement.align)) throw new Error("Unsupported legend group alignment.");
    if ((PLOT_LEGEND_POSITIONS.includes(placement.position) || ["left", "right"].includes(placement.position)) && placement.align !== "center") {
      throw new Error("Side and in-plot legend groups require center alignment.");
    }
    validateNonNegativeFinite(placement.offset, "Legend group offset");
  }
  if (creation && previous !== undefined && (args.at !== undefined || args.position !== undefined || args.align !== undefined || args.offset !== undefined) && !sameAnchor(placement, previous.placement)) {
    throw new Error("New legend block anchor conflicts with its target group.");
  }
  if (creation && previous !== undefined && args.blockLayout !== undefined && args.blockLayout !== previous.blockLayout) {
    throw new Error("New legend blockLayout conflicts with its target group.");
  }
  const blockLayout = args.blockLayout ?? previous?.blockLayout ??
    (placement.at !== undefined ? "column" : PLOT_LEGEND_POSITIONS.includes(placement.position) ? "row" : "wrap");
  const group = { placement, blockLayout };
  validateLegendGroupState({ [target]: group });
  const next = program._withMaterializationConfig(["guides", "legendGroups", target], group);
  // An omitted member placement inherits the group. Normalized family defaults
  // are not conflicting explicit caller inputs.
  if (placement.position !== undefined) {
    options.position = placement.position;
    options.offset = placement.offset;
    options.align = placement.align;
  }
  return { program: next, options, grouped: true };
}

export function creationLegendTarget(program, args) {
  if (args.target !== undefined) return args.target;
  const channels = args.channels;
  const candidates = program.semanticSpec.layers.filter(layer =>
    channels === undefined
      ? Object.keys(layer.encoding ?? {}).some(channel => ["color", "stroke", "shape", "strokeDash", "size", "opacity", "strokeWidth"].includes(channel) && layer.encoding[channel]?.scale !== undefined)
      : channels.every(channel => layer.encoding?.[channel]?.scale !== undefined));
  if (candidates.length !== 1) throw new Error("Legend group requires one eligible target or an explicit target.");
  return candidates[0].id;
}


// Keep omission distinct from an explicit numeric offset, including the native
// default. Older snapshots have no marker and retain their fixed placement.
export function recordLegendOffsetIntent(before, after, args, { creation = false } = {}) {
  let next = after;
  for (const [kind, config] of Object.entries(after.guideConfigs.legend ?? {})) {
    const previous = before.guideConfigs.legend?.[kind];
    if (creation && previous !== undefined || !creation && config === previous) continue;
    const prior = previous ?? Object.entries(before.guideConfigs.legend ?? {}).find(([oldKind, old]) =>
      old.target === config.target && legendResourcePolicy(oldKind).semanticKind === legendResourcePolicy(kind).semanticKind)?.[1];
    const inferredOffset = args.offset !== undefined ? false : creation ? true : prior?.inferredOffset === true;
    next = next._withLegendConfig(kind, { ...config, inferredOffset });
  }
  for (const [target, group] of Object.entries(after.guideConfigs.legendGroups ?? {})) {
    if (group.placement.at !== undefined) {
      if (group.inferredOffset !== undefined) {
        const { inferredOffset: _inferred, ...fixed } = group;
        next = next._withMaterializationConfig(["guides", "legendGroups", target], fixed);
      }
      continue;
    }
    const previous = before.guideConfigs.legendGroups?.[target];
    if (group === previous) continue;
    const inferredOffset = args.offset !== undefined ? false
      : previous?.placement.at !== undefined ? true : previous !== undefined ? previous.inferredOffset === true
        : Object.values(next.guideConfigs.legend ?? {}).filter(c=>c.target === target).every(c=>c.inferredOffset === true);
    next = next._withMaterializationConfig(["guides", "legendGroups", target], { ...group, inferredOffset });
  }
  return next;
}
