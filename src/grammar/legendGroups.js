import { validateOptionObject, validateNonNegativeFinite } from "../core/validation.js";
import { validateUserId } from "../core/identifiers.js";
import { PLOT_LEGEND_POSITIONS, LEGEND_POSITIONS, LEGEND_BLOCK_LAYOUTS } from "../core/vocabulary.js";

export function validateLegendGroupState(groups) {
  validateOptionObject(groups, undefined, "Legend groups");
  for (const [target, group] of Object.entries(groups)) {
    validateUserId(target, "Legend group target");
    validateOptionObject(group, ["placement", "blockLayout", "inferredOffset"], "Legend group");
    if (!LEGEND_BLOCK_LAYOUTS.includes(group.blockLayout)) {
      throw new Error("Legend group blockLayout must be row, column or wrap.");
    }
    if (group.inferredOffset !== undefined && typeof group.inferredOffset !== "boolean") throw new TypeError("Legend group inferredOffset must be boolean.");
    const placement = group.placement;
    validateOptionObject(placement, ["at", "position", "align", "offset", "alongOffset"], "Legend group placement");
    if (Object.hasOwn(placement, "at")) {
      if (Object.keys(placement).length !== 1) throw new Error("Legend group at cannot coexist with an edge anchor.");
      validateOptionObject(placement.at, ["x", "y"], "Legend group at");
      if (!Number.isFinite(placement.at.x) || !Number.isFinite(placement.at.y)) throw new Error("Legend group at requires finite x and y.");
    } else {
      if (![3, 4].includes(Object.keys(placement).length) || !LEGEND_POSITIONS.includes(placement.position)) {
        throw new Error("Legend group requires a complete edge placement.");
      }
      if (!["left", "center", "right"].includes(placement.align)) throw new Error("Unsupported legend group alignment.");
      if ((PLOT_LEGEND_POSITIONS.includes(placement.position) || ["left", "right"].includes(placement.position)) && placement.align !== "center") {
        throw new Error("Side and in-plot legend groups require center alignment.");
      }
      validateNonNegativeFinite(placement.offset, "Legend group offset");
      if (placement.alongOffset !== undefined && !Number.isFinite(placement.alongOffset)) throw new TypeError("Legend alongOffset must be finite.");
    }
  }
  return groups;
}

export function localLegendPosition(config) {
  for (const value of Object.values(config?.blockOverrides ?? {})) {
    if (value.alongOffset !== undefined && !Number.isFinite(value.alongOffset)) throw new TypeError("Legend alongOffset must be finite.");
  }
  const positions = Object.values(config?.blockOverrides ?? {}).map(value => value.position ?? (value.alongOffset === undefined ? undefined : config.position)).filter(value => value !== undefined);
  if (positions.length > 1) throw new Error("Legend family has ambiguous local positions.");
  if (positions.length && !LEGEND_POSITIONS.includes(positions[0])) throw new Error("Invalid local legend position.");
  return positions[0];
}

export function localLegendPlacement(config) {
  const position = localLegendPosition(config);
  if (position === undefined) return undefined;
  const offsets = Object.values(config.blockOverrides ?? {}).flatMap(value => value.alongOffset === undefined ? [] : [value.alongOffset]);
  if (offsets.length > 1 || offsets.some(value => !Number.isFinite(value))) throw new TypeError("Legend alongOffset requires one finite block value.");
  return { position, ...(offsets.length ? { alongOffset: offsets[0] } : {}),
    align: ["top", "bottom"].includes(position) ? config.align ?? "center" : "center",
    offset: PLOT_LEGEND_POSITIONS.includes(position) && position !== config.position && config.inferredOffset === true
      ? 8 : config.offset ?? (PLOT_LEGEND_POSITIONS.includes(position) ? 8 : config.channels === undefined ? 30 : 8),
    inferredOffset: config.inferredOffset ?? true };
}

// A fine adjustment on the same edge retains its packing slot, so dragging one
// block does not pull its siblings into the space it just occupied.
export function retainsLegendSlot(config, anchor = config.position) {
  return localLegendPosition(config) === anchor && Object.values(config.blockOverrides ?? {}).some(value => value.alongOffset !== undefined);
}
