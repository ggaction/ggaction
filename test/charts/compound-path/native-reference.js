import { frame, paint, pixelCommands, underlay, shapeBounds } from "../../../examples/compound-path/data.js";
import { outer, hole, island, cubicCommands } from "../../../examples/compound-path/coordinates.js";

function trace(context, commands) {
  for (const c of commands) {
    if (c.op === "M") context.moveTo(c.x, c.y);
    else if (c.op === "L") context.lineTo(c.x, c.y);
    else if (c.op === "C") context.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else context.closePath();
  }
}

function referencePath(context, variant) {
  if (variant.kind === "points") return;
  if (variant.kind === "curve") {
    const [m, c] = cubicCommands;
    context.moveTo(m.x, m.y);
    context.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    context.moveTo(island[0][0], island[0][1]);
    context.lineTo(island[2][0], island[2][1]);
    return;
  }
  context.rect(outer[0][0], outer[0][1], outer[2][0] - outer[0][0], outer[2][1] - outer[0][1]);
  const reverse = variant.id === "nonzero-hole";
  context.rect(hole[0][0], reverse ? hole[2][1] : hole[0][1], hole[2][0] - hole[0][0],
    (hole[2][1] - hole[0][1]) * (reverse ? -1 : 1));
  context.rect(island[0][0], island[0][1], island[2][0] - island[0][0], island[2][1] - island[0][1]);
}

// Independent native commands complement the extension primitive/program pair.
export function drawPrimitive(context, variant, { reference = false } = {}) {
  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, frame.width, frame.height);
  context.fillStyle = paint.underlay;
  context.fillRect(underlay.x, underlay.y, underlay.width, underlay.height);
  if (reference) {
    context.translate(frame.x, frame.y);
    context.scale(frame.scale, frame.scale);
  }
  context.beginPath();
  if (reference) referencePath(context, variant);
  else trace(context, pixelCommands(variant));
  context.globalAlpha = paint.opacity;
  context.fillStyle = paint.fill;
  if (variant.kind === "clip") {
    context.clip(variant.fillRule);
    if (reference) context.fillRect(0, 0, 14, 10);
    else context.fillRect(shapeBounds.x, shapeBounds.y, shapeBounds.width, shapeBounds.height);
  } else {
    context.fill(variant.fillRule);
    if (variant.kind !== "points") {
      context.strokeStyle = paint.stroke;
      context.lineWidth = reference ? 2 / frame.scale : 2;
      context.stroke();
    }
  }
  context.restore();
}

export function primitiveSVG(variant) {
  const d = pixelCommands(variant).map(c => c.op === "Z" ? "Z" : c.op === "C"
    ? `C${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}` : `${c.op}${c.x} ${c.y}`).join(" ");
  const background = `<rect width="${frame.width}" height="${frame.height}" fill="white"/>` +
    `<rect x="${underlay.x}" y="${underlay.y}" width="${underlay.width}" height="${underlay.height}" fill="${paint.underlay}"/>`;
  const path = variant.kind === "clip"
    ? `<defs><clipPath id="mask"><path d="${d}" clip-rule="${variant.fillRule}"/></clipPath></defs>` +
      `<rect x="${shapeBounds.x}" y="${shapeBounds.y}" width="${shapeBounds.width}" height="${shapeBounds.height}" fill="${paint.fill}" opacity="${paint.opacity}" clip-path="url(#mask)"/>`
    : `<path d="${d}" fill="${paint.fill}" fill-rule="${variant.fillRule}" opacity="${paint.opacity}"` +
      (variant.kind === "points" ? "" : ` stroke="${paint.stroke}" stroke-width="2"`) + "/>";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}">${background}${path}</svg>`;
}
