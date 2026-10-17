import { PLOT_LEGEND_POSITIONS } from "../layout/legend.js";

export function legendGroup(program, target) {
  return program.guideConfigs.legendGroups?.[target];
}

// A group's anchor is owned once. Family materializers receive a temporary
// intrinsic frame; they never write that derived frame back into stored intent.
export function intrinsicLegendConfig(program, config) {
  const group = legendGroup(program, config.target);
  if (group === undefined) return config;
  const anchor = group.placement.position;
  const corner = PLOT_LEGEND_POSITIONS.includes(anchor);
  const position = corner ? (config.direction === "horizontal" ? "top" : "right") : anchor ??
    (PLOT_LEGEND_POSITIONS.includes(config.position)
      ? config.direction === "horizontal" ? "top" : "right"
      : config.position ?? "right");
  return { ...config, position, offset: 0, align: "left", groupIntrinsic: true,
    ...(corner ? { groupCorner: true } : {}),
    ...(position === "right" ? { align: "center" } : {}) };
}
