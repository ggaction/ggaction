import { LEGEND_POSITIONS } from "../core/vocabulary.js";
import { PLOT_LEGEND_POSITIONS } from "../layout/legend.js";

export function legendGroup(program, target) {
  return program.guideConfigs.legendGroups?.[target];
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

// A group's anchor is owned once. Family materializers receive a temporary
// intrinsic frame; they never write that derived frame back into stored intent.
export function intrinsicLegendConfig(program, config) {
  const local = localLegendPlacement(config);
  const group = local === undefined ? legendGroup(program, config.target) : {placement: local};
  if (group === undefined) return config;
  const anchor = group.placement.position;
  const corner = PLOT_LEGEND_POSITIONS.includes(anchor);
  const position = corner ? (config.direction === "horizontal" ? "top" : "right") : anchor ??
    (PLOT_LEGEND_POSITIONS.includes(config.position)
      ? config.direction === "horizontal" ? "top" : "right"
      : config.position ?? "right");
  return { ...config, ...(local === undefined ? {} : {blockLocalPosition: local.position}), position, offset: 0, align: "left", groupIntrinsic: true,
    ...(corner ? { groupCorner: true } : {}),
    ...(position === "right" ? { align: "center" } : {}) };
}
