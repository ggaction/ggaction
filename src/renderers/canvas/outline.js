import { applyCanvasStroke } from "./stroke.js";
import { paintColorCSS } from "../../grammar/color.js";

export function drawCanvasOutline(context, properties, draw) {
  const outline = properties.outline;
  if (!(outline?.width > 0)) return;
  context.save();
  try {
    applyCanvasStroke(context, { ...properties,
      stroke: paintColorCSS(outline.color), strokeWidth: outline.width });
    draw();
  } finally { context.restore(); }
}

export function preflightCanvasOutlineCapabilities(objects, context) {
  const text = objects.some(object => [object, ...(object.items ?? [])].some(item =>
    (item.type ?? object.type) === "text" && item.properties?.outline?.width > 0));
  if (text && typeof context.strokeText !== "function") {
    throw new TypeError("Text outline requires Canvas strokeText().");
  }
}
