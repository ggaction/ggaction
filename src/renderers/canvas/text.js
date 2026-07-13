import { requireFiniteProperty, requireStringProperty } from "./validation.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";

function drawText(context, child, collectionId) {
  const properties = child.properties ?? {};
  const graphicId = child.id ?? collectionId;
  validateConcreteGraphicProperties("text", properties);
  const x = requireFiniteProperty(properties, "x", graphicId);
  const y = requireFiniteProperty(properties, "y", graphicId);
  const fontSize = requireFiniteProperty(properties, "fontSize", graphicId);
  const rotation = properties.rotation ?? 0;
  const opacity = properties.opacity ?? 1;
  const text = requireStringProperty(properties, "text", graphicId);
  const fill = requireStringProperty(properties, "fill", graphicId);
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
    context.fillStyle = fill;
    context.globalAlpha = opacity;
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;
    context.translate(x, y);
    context.rotate(rotation);
    context.fillText(text, 0, 0);
  } finally {
    context.restore();
  }
}

export function drawTextGraphic(context, id, graphic) {
  if (graphic.children) {
    for (const child of graphic.children) {
      drawText(context, child, id);
    }
    return;
  }

  drawText(context, { id, properties: graphic.properties }, id);
}
