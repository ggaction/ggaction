import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";

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
  if (typeof properties.fill !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string fill property.`);
  }
  if (typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const opacity = properties.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.globalAlpha = opacity;
  context.fillStyle = properties.fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = properties.stroke;
  context.lineWidth = strokeWidth;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y);
  context.stroke();
}

export function drawRectGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) drawRect(context, child, id);
    return;
  }
  drawRect(context, { id, properties: graphic.properties }, id);
}
