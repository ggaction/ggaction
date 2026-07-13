import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";

function drawLine(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("line", properties);
  const x1 = requireFiniteProperty(properties, "x1", graphicId);
  const y1 = requireFiniteProperty(properties, "y1", graphicId);
  const x2 = requireFiniteProperty(properties, "x2", graphicId);
  const y2 = requireFiniteProperty(properties, "y2", graphicId);
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

  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const opacity = properties.opacity ?? 1;

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.strokeStyle = properties.stroke;
  context.lineWidth = strokeWidth;
  context.globalAlpha = opacity;
  context.setLineDash(properties.strokeDash ?? []);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

export function drawLineGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawLine(context, child, id);
    }
    return;
  }

  drawLine(context, { id, properties: graphic.properties }, id);
}
