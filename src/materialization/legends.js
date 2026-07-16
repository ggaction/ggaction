import { LEGEND_CONFIG_KINDS } from "../core/vocabulary.js";

export function hasMaterializedLegend(program) {
  return LEGEND_CONFIG_KINDS.some(kind => {
    const config = program.guideConfigs?.legend?.[kind];
    if (config === undefined) return false;
    if (kind === "series" || kind === "color") {
      return program.semanticSpec.guides.legend?.[kind] !== undefined;
    }
    return true;
  });
}

export function materializedLegendUsesScale(program, id) {
  return LEGEND_CONFIG_KINDS.some(kind => {
    const config = program.guideConfigs?.legend?.[kind];
    if (config === undefined) return false;
    return config.scale === id || config.scales?.includes(id);
  });
}
