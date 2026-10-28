import { drawCanvasOutline } from "./outline.js";
import { isPatternPaint, isRadialGradientPaint } from "../../grammar/paint.js";
import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";
import { applyCanvasFill, fillCanvasPath } from "./fill.js";
import { applyCanvasStroke } from "./stroke.js";

function drawRect(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("rect", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const width = requireFiniteProperty(properties, "width", graphicId);
  const height = requireFiniteProperty(properties, "height", graphicId);
  const strokeWidth = requireFiniteProperty(
    properties,
    "strokeWidth",
    graphicId
  );

  if (width < 0 || height < 0 || strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires non-negative rect dimensions and strokeWidth.`
    );
  }
  if (properties.fill === undefined) {
    throw new Error(`Graphic "${graphicId}" requires a fill property.`);
  }
  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const opacity = properties.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.globalAlpha = opacity;
  const bounds = { left: x, right: x + width, top: y, bottom: y + height };
  drawCanvasOutline(context, properties, () => {
    context.beginPath(); context.moveTo(x, y); context.lineTo(x + width, y);
    context.lineTo(x + width, y + height); context.lineTo(x, y + height);
    context.closePath(); context.stroke();
  });
  if (isPatternPaint(properties.fill) || isRadialGradientPaint(properties.fill)) {
    const trace = () => {
      context.moveTo(x, y); context.lineTo(x + width, y);
      context.lineTo(x + width, y + height); context.lineTo(x, y + height); context.closePath();
    };
    context.beginPath(); trace();
    fillCanvasPath(context, properties.fill, bounds, graphicId, trace);
  } else {
    applyCanvasFill(context, properties.fill, bounds, graphicId);
    context.fillRect(x, y, width, height);
  }
  // Canvas ignores lineWidth = 0 and would retain a previous nonzero width.
  if (strokeWidth > 0 && properties.outline === undefined) {
    applyCanvasStroke(context, properties);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    context.stroke();
  }
}

export function drawRectGraphic(context, id, graphic) {
  if (graphic.items) {
    for (const item of graphic.items) drawRect(context, item, id);
    return;
  }
  drawRect(context, { id, properties: graphic.properties }, id);
}
