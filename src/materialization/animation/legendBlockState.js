import { encodeValue } from "../../core/valueEncoding.js";
import { normalizeCategoricalLegendLayout, resolveCategoricalLegendEntries, prepareCategoricalLegendInterpolation, sampleCategoricalLegendInterpolation } from "./categoricalLegendState.js";
import { normalizeSizeLegendLayout, resolveSizeLegendEntries, prepareSizeLegendInterpolation, sampleSizeLegendInterpolation } from "./sizeLegendState.js";
import { normalizeLegendLayout, resolveLegendEntries, prepareLegendInterpolation, sampleLegendInterpolation } from "./legendState.js";

export const legendAnimationFamily = kind => ["color", "series", "stroke"].includes(kind)
  ? { kind: "categorical-legend", normalize: normalizeCategoricalLegendLayout, entries: resolveCategoricalLegendEntries, prepare: prepareCategoricalLegendInterpolation, sample: sampleCategoricalLegendInterpolation }
  : kind === "size" ? { kind: "size-legend", normalize: normalizeSizeLegendLayout, entries: resolveSizeLegendEntries, prepare: prepareSizeLegendInterpolation, sample: sampleSizeLegendInterpolation }
    : ["gradient", "strokeGradient"].includes(kind) ? { kind: "legend", normalize: normalizeLegendLayout, entries: resolveLegendEntries, prepare: prepareLegendInterpolation, sample: sampleLegendInterpolation } : undefined;

export function legendBlockEntryProperties(kind, layout, entry) {
  const config = layout.config;
  let style;
  if (entry.type === "text") style = entry.component === "legend-title" ? config.titleStyle : config.labels;
  else if (legendAnimationFamily(kind).kind === "categorical-legend") {
    const layer = config.symbol.layers.find(layer => layer.type === entry.sample[2]);
    const at = config.domain.findIndex(value => JSON.stringify(encodeValue(value)) === JSON.stringify(encodeValue(entry.sample[1])));
    const stroke = layer.type === "line" ? layer.stroke ?? (config.channels.includes("stroke") ? layout.appearance.strokes[at] : layout.appearance.colors[at])
      : config.channels.includes("stroke") ? layout.appearance.strokes[at] : layer.stroke;
    style = { ...layer, stroke, strokeWidth: layer.lineWidth ?? layer.strokeWidth };
  } else style = { stroke: "black", strokeWidth: kind === "size" ? layout.symbolStrokeWidth : entry.type === "line" ? 1 : layout.stripStrokeWidth };
  return { ...style, ...entry.properties };
}
