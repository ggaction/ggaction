import { findLayer } from "../selectors/layers.js";
import { LEGEND_CONFIG_KINDS } from "../core/vocabulary.js";

export function isOpacityLegendLayer(layer) {
  return ["point", "line"].includes(layer.mark?.type) &&
    layer.encoding?.opacity?.scale !== undefined;
}

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
    const order = program.semanticSpec.guides.legend?.[kind]?.order;
    const linkedScale = order?.channel === undefined ? undefined
      : findLayer(program, config.target)?.encoding?.[order.channel]?.scale;
    return config.scale === id || config.scales?.includes(id) || linkedScale === id;
  });
}
