import { drawCanvasOutline } from "./outline.js";
import { applyCanvasFill } from "./fill.js";
import { applyCanvasTextPattern } from "./textPaint.js";
import { requireFiniteProperty, requireStringProperty } from "./validation.js";
import { validateConcreteGraphicProperties, validateConcreteGraphicValue } from
  "../../grammar/schemas/concreteGraphic.js";
import { normalizeRendererFontWeight } from "../text.js";

function drawText(context, child, collectionId, { resolveFontFamily, textPaint } = {}) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("text", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const fontSize = requireFiniteProperty(properties, "fontSize", graphicId);
  const rotation = properties.rotation ?? 0;
  const opacity = properties.opacity ?? 1;
  const text = properties.text;
  validateConcreteGraphicValue("text", "text", text);
  const fill = properties.fill;
  const fontFamily = requireStringProperty(
    properties,
    "fontFamily",
    graphicId
  );
  const textAlign = requireStringProperty(
    properties,
    "textAlign",
    graphicId
  );
  const textBaseline = requireStringProperty(
    properties,
    "textBaseline",
    graphicId
  );
  const fontWeight = properties.fontWeight ?? "normal";

  if (fontSize <= 0) {
    throw new Error(`Graphic "${graphicId}" requires a positive fontSize.`);
  }

  if (!Number.isFinite(rotation)) {
    throw new Error(`Graphic "${graphicId}" requires a finite rotation.`);
  }

  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error(`Graphic "${graphicId}" requires opacity from 0 to 1.`);
  }

  if (
    !(
      (typeof fontWeight === "string" && fontWeight.length > 0) ||
      Number.isFinite(fontWeight)
    )
  ) {
    throw new Error(`Graphic "${graphicId}" requires a valid fontWeight.`);
  }

  if (!["left", "right", "center", "start", "end"].includes(textAlign)) {
    throw new Error(`Graphic "${graphicId}" has invalid textAlign.`);
  }

  if (
    ![
      "top",
      "hanging",
      "middle",
      "alphabetic",
      "ideographic",
      "bottom"
    ].includes(textBaseline)
  ) {
    throw new Error(`Graphic "${graphicId}" has invalid textBaseline.`);
  }

  context.save();

  try {
    context.globalAlpha = opacity;
    const rendererFontWeight = normalizeRendererFontWeight(fontWeight);
    context.font = `${properties.fontStyle === "italic" ? "italic " : ""}${rendererFontWeight} ${fontSize}px ${resolveFontFamily?.(fontFamily) ?? fontFamily}`;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;
    context.translate(x, y);
    context.rotate(rotation);
    const bounds = properties.fillBounds;
    const localBounds = bounds && { left: bounds.left - x, right: bounds.right - x, top: bounds.top - y, bottom: bounds.bottom - y };
    if (fill?.type === "pattern" || fill?.type === "radial-gradient") applyCanvasTextPattern(context, fill, bounds, properties, graphicId, textPaint);
    else applyCanvasFill(context, fill, localBounds, graphicId);
    drawCanvasOutline(context, properties, () => {
      if (properties.lines === undefined) context.strokeText(text, 0, 0);
      else for (const line of properties.lines) context.strokeText(line.text, line.x, line.y);
    });
    if (properties.lines === undefined) context.fillText(text, 0, 0);
    else for (const line of properties.lines) context.fillText(line.text, line.x, line.y);
  } finally {
    context.restore();
  }
}

export function drawTextGraphic(context, id, graphic, options) {
  if (graphic.items) {
    for (const item of graphic.items) {
      drawText(context, item, id, options);
    }
    return;
  }

  drawText(context, { id, properties: graphic.properties }, id, options);
}
