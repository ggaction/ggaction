import { drawCanvasOutline } from "./outline.js";
import { fillCanvasPath } from "./fill.js";
import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";
import { applyCanvasStroke } from "./stroke.js";

function drawCircle(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("circle", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const radius = requireFiniteProperty(properties, "radius", graphicId);

  if (radius < 0) {
    throw new Error(`Graphic "${graphicId}" requires a non-negative radius.`);
  }

  if (properties.fill === undefined) throw new Error(`Graphic "${graphicId}" requires a fill property.`);

  const opacity = properties.opacity ?? 1;

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.globalAlpha = opacity;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  drawCanvasOutline(context, properties, () => context.stroke());
  fillCanvasPath(context, properties.fill, { left: x - radius, right: x + radius,
    top: y - radius, bottom: y + radius }, graphicId,
    () => context.arc(x, y, radius, 0, Math.PI * 2));
  if (properties.stroke !== undefined) {
    if (typeof properties.stroke !== "string") {
      throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
    }
    const strokeWidth = requireFiniteProperty(
      properties,
      "strokeWidth",
      graphicId
    );
    if (strokeWidth < 0) {
      throw new Error(
        `Graphic "${graphicId}" requires a non-negative strokeWidth.`
      );
    }
    if (strokeWidth > 0 && properties.outline === undefined) {
      applyCanvasStroke(context, properties);
      context.stroke();
    }
  }
}

export function drawCircleGraphic(context, id, graphic) {
  if (graphic.items) {
    for (const item of graphic.items) {
      drawCircle(context, item, id);
    }
    return;
  }

  drawCircle(context, { id, properties: graphic.properties }, id);
}
