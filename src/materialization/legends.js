import { isLinearGradientPaint, isPatternPaint, isRadialGradientPaint } from "../grammar/paint.js";
import { mapOrdinalValues } from "../grammar/scales/index.js";
import { DEFAULT_COLORS } from "../theme/defaults.js";
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

export function resolveCategoricalLegendAppearance(program, config, patternFills) {
  const target = findLayer(program, config.target);
  const fallbackPaint = program.markConfigs[target?.id]?.barAppearance?.fill ?? program.markConfigs[target?.id]?.fill;
  const gradientFallback = ["area", "bar", "point", "rect", "arc", "text"].includes(target?.mark?.type) &&
    target.encoding.color === undefined &&
    !config.channels.includes("color") &&
    (isLinearGradientPaint(fallbackPaint) || isPatternPaint(fallbackPaint) || isRadialGradientPaint(fallbackPaint));
  const fixedLineStroke = target?.mark?.type === "line" &&
    config.channels.includes("strokeDash")
    ? program.markConfigs[target.id]?.stroke : undefined;
  const fallback = gradientFallback
    ? fallbackPaint : fixedLineStroke ?? DEFAULT_COLORS.mark;
  let colors = config.domain.map(() => fallback);
  let strokes = config.domain.map(() => "white");
  let dashes = config.domain.map(() => []);
  let shapes = config.domain.map(() => "circle");
  for (let index = 0; index < config.channels.length; index += 1) {
    const scale = program.resolvedScales[config.scales[index]];
    const values = mapOrdinalValues(config.domain, scale.domain, scale.range);
    if (config.channels[index] === "color") colors = patternFills
      ?.map((fill, item) => fill ?? values[item]) ?? values;
    if (config.channels[index] === "stroke") strokes = values;
    if (config.channels[index] === "strokeDash") dashes = values;
    if (config.channels[index] === "shape") shapes = values;
  }
  return { colors, strokes, dashes, shapes, ...(config.combine === "size-shape" ? {areas: config.sizeAreas} : {}),
    ...(gradientFallback ? { opacity: program.markConfigs[target.id].barAppearance?.opacity ?? program.markConfigs[target.id].opacity } : {}) };
}
