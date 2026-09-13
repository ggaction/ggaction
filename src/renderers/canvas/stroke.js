import { resolveStrokeDetails } from "../../grammar/strokeStyle.js";

export function applyCanvasStroke(context, properties, strokeDash = []) {
  const details = resolveStrokeDetails(properties);
  context.strokeStyle = properties.stroke;
  context.lineWidth = properties.strokeWidth;
  context.lineCap = details.lineCap;
  context.lineJoin = details.lineJoin;
  context.miterLimit = details.miterLimit;
  context.setLineDash(strokeDash);
}
