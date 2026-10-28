import { tracePath } from "./pathTrace.js";
export { tracePath } from "./pathTrace.js";
import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";
import { resolvePathCommandBounds } from "../../grammar/schemas/graphicBounds.js";
import { fillCanvasPath } from "./fill.js";
import { applyCanvasStroke } from "./stroke.js";

function drawPath(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("path", properties);
  const commands = properties.commands;

  if (!Array.isArray(commands)) {
    throw new Error(
      `Graphic "${graphicId}" requires concrete path commands.`
    );
  }

  const hasFill = properties.fill !== undefined;
  const hasStroke = properties.stroke !== undefined;
  if (!hasFill && !hasStroke) {
    throw new Error(`Graphic "${graphicId}" requires a fill or stroke property.`);
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
  tracePath(context, commands);

  if (hasFill) {
    const bounds = resolvePathCommandBounds(commands);
    if (bounds === undefined) {
      throw new Error(`Graphic "${graphicId}" requires finite path fill bounds.`);
    }
    fillCanvasPath(context, properties.fill, bounds, graphicId,
      () => tracePath(context, commands), properties.fillRule);
  }
  if (hasStroke && strokeWidth > 0) {
    applyCanvasStroke(context, properties, strokeDash);
    context.stroke();
  }
}

export function drawPathGraphic(context, id, graphic) {
  if (graphic.items) {
    for (const item of graphic.items) {
      drawPath(context, item, id);
    }
    return;
  }

  drawPath(context, { id, properties: graphic.properties }, id);
}

