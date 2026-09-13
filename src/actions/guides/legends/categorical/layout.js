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

export function symbolGraphic(config, type) {
  const onlyDefault = config.symbol.layers.length === 1 &&
    ((config.kind === "series" && type === "line") ||
      (["color", "stroke"].includes(config.kind) && type === "swatch"));
  if (onlyDefault) return `${prefix(config)}Symbols`;
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  return `${prefix(config)}Symbol${suffix}`;
}

export function graphic(config, component) {
  return `${prefix(config)}${component}`;
}

export function symbolWidth(config) {
  return Math.max(...config.symbol.layers.map(layer => {
    if (layer.type === "line") return layer.length;
    if (layer.type === "point") return layer.size * 2;
    return layer.width;
  }));
}

export function categoricalLegendLabels(config) {
  return config.domain.map(value => resolveDisplayLabel(
    value,
    config.labelMap,
    formatVisibleText
  ));
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
          strokeWidth: layer.lineWidth, opacity: layer.opacity } };
      }
      if (layer.type === "swatch") {
        return { type: "rect", properties: { x: (width - layer.width) / 2, y: -layer.height / 2,
          width: layer.width, height: layer.height, strokeWidth: layer.strokeWidth,
          stroke: config.channels.includes("stroke")
            ? appearance.strokes[index]
            : layer.stroke,
          opacity: layer.opacity } };
      }
      if (config.channels.includes("shape")) {
        return createPointShapeGraphic({ shape: appearance.shapes[index], x: width / 2, y: 0,
          area: Math.PI * layer.size ** 2, fill: layer.fill ?? appearance.colors[index],
          stroke: layer.stroke, strokeWidth: layer.strokeWidth, opacity: layer.opacity });
      }
      return { type: "circle", properties: { x: width / 2, y: 0, radius: layer.size,
        stroke: config.channels.includes("stroke")
          ? appearance.strokes[index]
          : layer.stroke,
        strokeWidth: layer.strokeWidth, opacity: layer.opacity } };
    });
    return items.map((item, itemIndex) => {
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
        }, undefined);
  });
}

export function resolveLayout(program, config) {
  const { plot, canvas } = resolveContinuousBounds(program,
    "Legend layout requires Canvas bounds, width, and height.");
  const width = symbolWidth(config);
  const layout = resolveLegendItemLayout(plot, config, categoricalLegendLabels(config), {
    width, height: 0, itemBounds: resolveSampleBounds(program, config, width)
  }, canvas);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Categorical legend layout", config);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas,
    "Categorical legend", config);
  return { ...layout, titleX: layout.title.x, titleY: layout.title.y, background };
}

export function resolveAppearance(program, config) {
  let colors = config.domain.map(() => DEFAULT_COLORS.mark);
  let strokes = config.domain.map(() => "white");
  let dashes = config.domain.map(() => []);
  let shapes = config.domain.map(() => "circle");
  for (let index = 0; index < config.channels.length; index += 1) {
    const scale = program.resolvedScales[config.scales[index]];
    const values = mapOrdinalValues(config.domain, scale.domain, scale.range);
    if (config.channels[index] === "color") colors = values;
    if (config.channels[index] === "stroke") strokes = values;
    if (config.channels[index] === "strokeDash") dashes = values;
    if (config.channels[index] === "shape") shapes = values;
  }
  return { colors, strokes, dashes, shapes };
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
