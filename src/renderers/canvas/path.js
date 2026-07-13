import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";

function drawPath(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("path", properties);
  const points = properties.points;

  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new Error(
      `Graphic "${graphicId}" requires at least two finite path points.`
    );
  }

  const closed = properties.closed ?? false;
  if (typeof closed !== "boolean") {
    throw new Error(`Graphic "${graphicId}" requires a boolean closed property.`);
  }
  const hasFill = properties.fill !== undefined;
  const hasStroke = properties.stroke !== undefined;
  if (!hasFill && !hasStroke) {
    throw new Error(`Graphic "${graphicId}" requires a fill or stroke property.`);
  }
  if (hasFill && typeof properties.fill !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string fill property.`);
  }
  if (hasFill && !closed) {
    throw new Error(`Graphic "${graphicId}" requires closed: true when filled.`);
  }
  if (hasStroke && typeof properties.stroke !== "string") {
    throw new Error(`Graphic "${graphicId}" requires a string stroke property.`);
  }

  const strokeWidth = hasStroke
    ? requireFiniteProperty(properties, "strokeWidth", graphicId)
    : undefined;
  if (hasStroke && strokeWidth < 0) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative strokeWidth.`
    );
  }

  const strokeDash = properties.strokeDash ?? [];
  if (
    !Array.isArray(strokeDash) ||
    !strokeDash.every(value => Number.isFinite(value) && value >= 0)
  ) {
    throw new Error(
      `Graphic "${graphicId}" requires a non-negative finite strokeDash array.`
    );
  }

  const opacity = properties.opacity ?? 1;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  context.globalAlpha = opacity;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  if (closed) context.closePath();
  if (hasFill) {
    context.fillStyle = properties.fill;
    context.fill();
  }
  if (hasStroke) {
    context.strokeStyle = properties.stroke;
    context.lineWidth = strokeWidth;
    context.setLineDash(strokeDash);
    context.stroke();
  }
}

export function drawPathGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawPath(context, child, id);
    }
    return;
  }

  drawPath(context, { id, properties: graphic.properties }, id);
}
