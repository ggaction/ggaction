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
    validateOptionObject(placement, ["at", "position", "align", "offset"], "Legend group placement");
    if (Object.hasOwn(placement, "at")) {
      if (Object.keys(placement).length !== 1) throw new Error("Legend group at cannot coexist with an edge anchor.");
      validateOptionObject(placement.at, ["x", "y"], "Legend group at");
      if (!Number.isFinite(placement.at.x) || !Number.isFinite(placement.at.y)) throw new Error("Legend group at requires finite x and y.");
    } else {
      if (Object.keys(placement).length !== 3 || !LEGEND_POSITIONS.includes(placement.position)) {
        throw new Error("Legend group requires a complete edge placement.");
      }
      if (!["left", "center", "right"].includes(placement.align)) throw new Error("Unsupported legend group alignment.");
      if ((PLOT_LEGEND_POSITIONS.includes(placement.position) || ["left", "right"].includes(placement.position)) && placement.align !== "center") {
        throw new Error("Side and in-plot legend groups require center alignment.");
      }
      validateNonNegativeFinite(placement.offset, "Legend group offset");
    }
  }
  return groups;
}

export function localLegendPosition(config) {
  const positions = Object.values(config?.blockOverrides ?? {}).map(value => value.position).filter(value => value !== undefined);
  if (positions.length > 1) throw new Error("Legend family has ambiguous local positions.");
  if (positions.length && !LEGEND_POSITIONS.includes(positions[0])) throw new Error("Invalid local legend position.");
  return positions[0];
}

export function localLegendPlacement(config) {
  const position = localLegendPosition(config);
  if (position === undefined) return undefined;
  return { position,
    align: ["top", "bottom"].includes(position) ? config.align ?? "center" : "center",
    offset: PLOT_LEGEND_POSITIONS.includes(position) ? 8 : config.offset ?? (config.channels === undefined ? 30 : 8),
    inferredOffset: config.inferredOffset ?? true };
}
