import { requireFiniteProperty } from "./validation.js";

export function drawImageGraphic(context, id, graphic, options) {
  const p = graphic.properties;
  const image = options.images.get(p.image.contentHash).image;
  const x = requireFiniteProperty(p, "x", id), y = requireFiniteProperty(p, "y", id);
  const width = requireFiniteProperty(p, "width", id), height = requireFiniteProperty(p, "height", id);
  if (width === 0 || height === 0) return;
  context.save();
  try {
    context.globalAlpha = p.opacity ?? 1;
    context.drawImage(image, x, y, width, height);
  } finally { context.restore(); }
}
