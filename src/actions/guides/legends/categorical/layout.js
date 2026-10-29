import { themePatternForValues } from "../../../theme/palettes.js";
import { validateLegendOverflow, categoricalLegendView } from "../../../../grammar/legendOverflow.js";
import{validateLegendClip,clippedSampleBounds}from"../../../../grammar/legendClip.js";
import {categoricalLegendSymbolId as symbolGraphic}from"../../../../grammar/legendBlocks.js";
export {symbolGraphic};
export { categoricalLegendView } from "../../../../grammar/legendOverflow.js";
import { findLegendLayer as findLayer } from "../../../../materialization/legendEncodings.js";
import { isLinearGradientPaint, isPatternPaint, isRadialGradientPaint } from "../../../../grammar/paint.js";
import { intrinsicLegendConfig } from "../../../../materialization/legendGroups.js";
import { validateOptionObject } from "../../../../core/validation.js";
import { mapOrdinalValues } from "../../../../grammar/scales/index.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import { formatVisibleText } from "../../../../core/textMetrics.js";
import {
  assertLegendBoundsInsideCanvas,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds
} from "../continuous/common.js";
import { resolveLegendItemLayout } from "../../../../layout/legendItems.js";
import { createPointShapeGraphic } from "../../../../grammar/pointShapes.js";
import { resolveConcreteGraphicBounds } from "../../../../grammar/schemas/graphicBounds.js";
import { resolveEffectiveLegendBlockConfig } from "../blocks.js";
import { resolveDisplayLabel } from "../../../../grammar/displayLabels.js";
import {
  materializeRectItem,
  requestedRectStyleDetails
} from "../../../../grammar/roundedRect.js";
import { requestedStrokeDetails } from "../../../../grammar/strokeStyle.js";

const CATEGORICAL_KINDS = Object.freeze(["series", "color", "stroke"]);

export function activeConfig(program, requested) {
  if (requested !== undefined && !CATEGORICAL_KINDS.includes(requested)) {
    throw new Error(`Unknown categorical legend kind "${requested}".`);
  }
  const kinds = CATEGORICAL_KINDS
    .filter(kind => program.guideConfigs.legend?.[kind] !== undefined);
  if (requested !== undefined) {
    if (!kinds.includes(requested)) {
      throw new Error(`Missing categorical legend config "${requested}".`);
    }
    return {
      kind: requested,
      config: resolveEffectiveLegendBlockConfig(
        program,
        requested,
        program.guideConfigs.legend[requested]
      )
    };
  }
  if (kinds.length !== 1) {
    throw new Error("Legend component requires one categorical legend config.");
  }
  const kind = kinds[0];
  return {
    kind,
    config: resolveEffectiveLegendBlockConfig(
      program,
      kind,
      program.guideConfigs.legend[kind]
    )
  };
}

function prefix(config) {
  return `${config.kind}Legend`;
}


export function graphic(config, component) {
  return `${prefix(config)}${component}`;
}

export function symbolWidth(config) {
  return Math.max(...config.symbol.layers.map(layer => {
    if (layer.type === "line") return layer.length;
    if (layer.type === "point") return config.combine === "size-shape" ? 2 * Math.sqrt(Math.max(...config.sizeAreas) / Math.PI) : layer.size * 2;
    return layer.width;
  }));
}


export function categoricalLegendLabels(config) {
  config = categoricalLegendView(config);
  const visible = config.hiddenCount > 0 ? config.domain.slice(0, config.overflow.maxItems) : config.domain;
  const labels = visible.map(value => resolveDisplayLabel(
    value,
    [...(config.labelMap ?? []), ...(config.defaultLabelMap ?? [])],
    formatVisibleText
  ));
  return config.hiddenCount > 0 ? [...labels, `…${config.hiddenCount} entries`] : labels;
}

function resolveSampleBounds(program, config, width) {
  const appearance = resolveAppearance(program, config);
  return config.domain.map((_, index) => {
    const items = config.symbol.layers.map(layer => {
      if (layer.type === "line") {
        const x = (width - layer.length) / 2;
        return { type: "line", properties: { x1: x, x2: x + layer.length, y1: 0, y2: 0,
          stroke: layer.stroke ?? (config.channels.includes("stroke")
            ? appearance.strokes[index]
            : appearance.colors[index]),
          strokeWidth: layer.lineWidth, opacity: layer.opacity ?? appearance.opacity,
          ...requestedStrokeDetails(layer, "Legend line symbol") } };
      }
      if (layer.type === "swatch") {
        const details = requestedRectStyleDetails(layer, "Legend swatch symbol");
        return materializeRectItem({ x: (width - layer.width) / 2, y: -layer.height / 2,
          width: layer.width, height: layer.height, strokeWidth: layer.strokeWidth,
          stroke: config.channels.includes("stroke")
            ? appearance.strokes[index]
            : layer.stroke,
          opacity: layer.opacity ?? appearance.opacity,
          ...requestedStrokeDetails(details, "Legend swatch symbol")
        }, details);
      }
      if (config.channels.includes("shape")) {
        return createPointShapeGraphic({ shape: appearance.shapes[index], x: width / 2, y: 0,
          area: appearance.areas?.[index] ?? Math.PI * layer.size ** 2, fill: layer.fill ?? appearance.colors[index],
          stroke: layer.stroke, strokeWidth: layer.strokeWidth, opacity: layer.opacity ?? appearance.opacity,
          ...requestedStrokeDetails(layer, "Legend point symbol") });
      }
      return { type: "circle", properties: { x: width / 2, y: 0, radius: layer.size,
        stroke: config.channels.includes("stroke")
          ? appearance.strokes[index]
          : layer.stroke,
        strokeWidth: layer.strokeWidth, opacity: layer.opacity ?? appearance.opacity,
        ...requestedStrokeDetails(layer, "Legend point symbol") } };
    });
    return clippedSampleBounds(items.map((item, itemIndex) => {
      const { outline, shadow } = config.symbol.layers[itemIndex];
      item = { ...item, properties: { ...item.properties, ...(outline === undefined ? {} : { outline }),
        ...(shadow === undefined ? {} : { shadow }) } };
      const bounds = resolveConcreteGraphicBounds({
        objects: { sample: item },
        order: ["sample"]
      }, "sample");
      if (config.symbol.layers[itemIndex].type !== "line") return bounds;
      const extent = config.symbol.layers[itemIndex].lineWidth / 2;
      return {
        ...bounds,
        left: bounds.left - extent,
        right: bounds.right + extent
      };
    }).reduce((result, bounds) => result === undefined
      ? bounds
      : {
          left: Math.min(result.left, bounds.left),
          right: Math.max(result.right, bounds.right),
          top: Math.min(result.top, bounds.top),
          bottom: Math.max(result.bottom, bounds.bottom)
        }, undefined),config.clipHeight);
  });
}

export function resolveLayout(program, config) {
  validateLegendOverflow(config.kind, config);
  validateLegendClip(config.kind,config);
  config = intrinsicLegendConfig(program, config);
  config = categoricalLegendView(config);
  const { plot, canvas } = resolveContinuousBounds(program,
    "Legend layout requires Canvas bounds, width, and height.");
  const width = symbolWidth(config);
  const layout = resolveLegendItemLayout(plot, config, categoricalLegendLabels(config), {
    width, height: 0, itemBounds: resolveSampleBounds(program, config, width)
  }, canvas, program.materializationConfigs.textMetrics);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Categorical legend layout", config);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas,
    "Categorical legend", config);
  return { ...layout, titleX: layout.title.x, titleY: layout.title.y, background };
}

export function resolveAppearance(program, config) {
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
    if (config.channels[index] === "color") colors = themePatternForValues(program, target, config.domain, config.scales[index])
      ?.map((fill, item) => fill ?? values[item]) ?? values;
    if (config.channels[index] === "stroke") strokes = values;
    if (config.channels[index] === "strokeDash") dashes = values;
    if (config.channels[index] === "shape") shapes = values;
  }
  return { colors, strokes, dashes, shapes, ...(config.combine === "size-shape" ? {areas: config.sizeAreas} : {}),
    ...(gradientFallback ? { opacity: program.markConfigs[target.id].barAppearance?.opacity ?? program.markConfigs[target.id].opacity } : {}) };
}

export function noOptions(args, operation) {
  validateOptionObject(args, ["kind"], operation);
  if (args.kind !== undefined && !CATEGORICAL_KINDS.includes(args.kind)) {
    throw new Error(`Unknown categorical legend kind "${args.kind}".`);
  }
}

export function layerFor(config, type) {
  const layer = config.symbol.layers.find(item => item.type === type);
  if (layer === undefined) {
    throw new Error(`Legend recipe does not contain a ${type} layer.`);
  }
  return layer;
}


export function resolveSymbolLayout(program, config) {
  const view = categoricalLegendView(config);
  const layout = resolveLayout(program, view);
  return { ...layout, symbolX: layout.symbolX.slice(0, view.domain.length),
    itemY: layout.itemY.slice(0, view.domain.length) };
}
