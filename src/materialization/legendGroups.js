import { localLegendPosition, localLegendPlacement } from "../grammar/legendGroups.js";
export { localLegendPosition, localLegendPlacement };
import { LEGEND_POSITIONS } from "../core/vocabulary.js";
import { PLOT_LEGEND_POSITIONS } from "../layout/legend.js";

export function legendGroup(program, target) {
  return program.guideConfigs.legendGroups?.[target];
}

// A group's anchor is owned once. Family materializers receive a temporary
// intrinsic frame; they never write that derived frame back into stored intent.
export function intrinsicLegendConfig(program, config) {
  const local = localLegendPlacement(config);
  const group = local === undefined ? legendGroup(program, config.target) ??
    (program.context.facetLegendIntrinsic === true ? { placement: { position: config.position } } : undefined) : {placement: local};
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
