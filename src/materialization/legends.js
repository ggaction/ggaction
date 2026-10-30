import {colorSizeScaleIds} from "../grammar/colorSizeLegend.js";
import { findLegendLayer as findLayer } from "../materialization/legendEncodings.js";
import { LEGEND_CONFIG_KINDS } from "../core/vocabulary.js";

export function isOpacityLegendLayer(layer) {
  return ["point", "line", "area", "bar", "rect"].includes(layer.mark?.type) &&
    layer.encoding?.opacity?.scale !== undefined;
}

export function legendSampleFill(program, target) {
  const graphic = program.graphicSpec.objects[target];
  const properties = graphic?.items?.[0]?.properties ?? graphic?.properties;
  return properties?.fill;
}

export function hasMaterializedLegend(program) {
  return LEGEND_CONFIG_KINDS.some(kind => {
    const config = program.guideConfigs?.legend?.[kind];
    if (config === undefined) return false;
    if (["series", "color", "stroke"].includes(kind)) {
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
    return (kind === "colorSize" ? colorSizeScaleIds(config).includes(id) : config.scale === id || config.scales?.includes(id)) || linkedScale === id;
  });
}

export function legendSampleStrokeWidth(program, target) {
  const config = program.markConfigs[target] ?? {};
  return config.barAppearance?.strokeWidth ?? config.strokeWidth ?? ({
    point: 1,
    line: 2,
    area: 1,
    bar: 0.5,
    rect: 1,
    arc: 1,
    rule: 2,
    tick: 2
  }[findLayer(program, target)?.mark?.type] ?? 1);
}
