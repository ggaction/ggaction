import { requireFiniteProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";
import { resolvePathCommandBounds } from "../../grammar/schemas/graphicBounds.js";
import { applyCanvasFill } from "./fill.js";
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
  if (hasFill && commands.at(-1).op !== "Z") {
    throw new Error(`Graphic "${graphicId}" requires a final Z command when filled.`);
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
  for (const command of commands) {
    if (command.op === "M") {
      context.moveTo(command.x, command.y);
    } else if (command.op === "L") {
      context.lineTo(command.x, command.y);
    } else if (command.op === "C") {
      context.bezierCurveTo(
        command.x1,
        command.y1,
        command.x2,
        command.y2,
        command.x,
        command.y
      );
    } else {
      context.closePath();
    }
  }

  if (hasFill) {
    const bounds = resolvePathCommandBounds(commands);
    if (bounds === undefined) {
      throw new Error(`Graphic "${graphicId}" requires finite path fill bounds.`);
    }
    applyCanvasFill(context, properties.fill, bounds, graphicId);
    context.fill();
  }
  if (hasStroke) {
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
