import { noOptions } from "../../../../core/validation.js";
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

export function activeConfig(program) {
  const kinds = ["series", "color"]
    .filter(kind => program.guideConfigs.legend?.[kind] !== undefined);
  if (kinds.length !== 1) {
    throw new Error("Legend component requires one categorical legend config.");
  }
  const kind = kinds[0];
  return { kind, config: program.guideConfigs.legend[kind] };
}

function prefix(config) {
  return config.kind === "series" ? "seriesLegend" : "colorLegend";
}

export function symbolGraphic(config, type) {
  const onlyDefault = config.symbol.layers.length === 1 &&
    ((config.kind === "series" && type === "line") ||
      (config.kind === "color" && type === "swatch"));
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

function resolveSampleBounds(program, config, width) {
  const appearance = resolveAppearance(program, config);
  return config.domain.map((_, index) => {
    const items = config.symbol.layers.map(layer => {
      if (layer.type === "line") {
        const x = (width - layer.length) / 2;
        return { type: "line", properties: { x1: x, x2: x + layer.length, y1: 0, y2: 0,
          strokeWidth: layer.lineWidth } };
      }
      if (layer.type === "swatch") {
        return { type: "rect", properties: { x: (width - layer.width) / 2, y: -layer.height / 2,
          width: layer.width, height: layer.height, strokeWidth: layer.strokeWidth } };
      }
      if (config.channels.includes("shape")) {
        return createPointShapeGraphic({ shape: appearance.shapes[index], x: width / 2, y: 0,
          area: Math.PI * layer.size ** 2, fill: layer.fill ?? appearance.colors[index],
          stroke: layer.stroke, strokeWidth: layer.strokeWidth });
      }
      return { type: "circle", properties: { x: width / 2, y: 0, radius: layer.size,
        strokeWidth: layer.strokeWidth } };
    });
    return resolveConcreteGraphicBounds({ objects: { sample: { type: "collection", items } }, order: ["sample"] }, "sample");
  });
}

export function resolveLayout(program, config) {
  const { plot, canvas } = resolveContinuousBounds(program,
    "Legend layout requires Canvas bounds, width, and height.");
  const width = symbolWidth(config);
  const layout = resolveLegendItemLayout(plot, config, config.domain.map(formatVisibleText), {
    width, height: 0, itemBounds: resolveSampleBounds(program, config, width)
  }, canvas);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Categorical legend layout", config);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas,
    "Categorical legend", config);
  return { ...layout, titleX: layout.title.x, titleY: layout.title.y, background };
}

export function resolveAppearance(program, config) {
  let colors = config.domain.map(() => DEFAULT_COLORS.mark);
  let dashes = config.domain.map(() => []);
  let shapes = config.domain.map(() => "circle");
  for (let index = 0; index < config.channels.length; index += 1) {
    const scale = program.resolvedScales[config.scales[index]];
    const values = mapOrdinalValues(config.domain, scale.domain, scale.range);
    if (config.channels[index] === "color") colors = values;
    if (config.channels[index] === "strokeDash") dashes = values;
    if (config.channels[index] === "shape") shapes = values;
  }
  return { colors, dashes, shapes };
}

export { noOptions };

export function layerFor(config, type) {
  const layer = config.symbol.layers.find(item => item.type === type);
  if (layer === undefined) {
    throw new Error(`Legend recipe does not contain a ${type} layer.`);
  }
  return layer;
}
