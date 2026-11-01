import { assertLegendBoundsInsideCanvas, resolveLegendBackgroundFromBounds } from "./legendLayout.js";
import { categoricalLegendLabels } from "./legendConfig.js";
import { clippedSampleBounds } from "../../grammar/legendClip.js";
import { resolveLegendItemLayout } from "../../layout/legendItems.js";
import { createPointShapeGraphic } from "../../grammar/pointShapes.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { materializeRectItem, requestedRectStyleDetails } from "../../grammar/roundedRect.js";
import { requestedStrokeDetails } from "../../grammar/strokeStyle.js";

export function symbolWidth(config) {
  return Math.max(...config.symbol.layers.map(layer => {
    if (layer.type === "line") return layer.length;
    if (layer.type === "point") return config.combine === "size-shape" ? 2 * Math.sqrt(Math.max(...config.sizeAreas) / Math.PI) : layer.size * 2;
    return layer.width;
  }));
}


function resolveSampleBounds(config, appearance, width) {
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

// Explicit native values are shared by authoring and prepared animation. The
// caller owns effective config, ordinal mapping, theme appearance and grouping.
export function resolveCategoricalLegendLayoutValues({ config, appearance, plot, canvas, profile }) {
  const width = symbolWidth(config);
  const layout = resolveLegendItemLayout(plot, config, categoricalLegendLabels(config), {
    width, height: 0, itemBounds: resolveSampleBounds(config, appearance, width)
  }, canvas, profile);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Categorical legend layout", config);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas,
    "Categorical legend", config);
  return { ...layout, titleX: layout.title.x, titleY: layout.title.y, background };
}
