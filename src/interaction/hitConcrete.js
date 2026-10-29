import { translateGraphicClip } from "../grammar/schemas/graphicClip.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { resolveTextBounds } from "../core/textMetrics.js";
import { prepareHitShape, prepareHitShapeUnion } from "../grammar/hitShapes.js";
import { transformHitPoint } from "../grammar/hitCoordinates.js";
import { resolveStrokeDetails } from "../grammar/strokeStyle.js";

const identity = [1, 0, 0, 1, 0, 0];
function textGeometry(properties, metrics) {
  const p = properties, cosine = Math.cos(p.rotation ?? 0), sine = Math.sin(p.rotation ?? 0);
  const transform = [cosine, sine, -sine, cosine, p.x, p.y];
  const commands = [];
  for (const line of p.lines ?? [{ text: p.text, x: 0, y: 0 }]) {
    if (!line.text) continue;
    const b = resolveTextBounds({ ...p, lines: undefined, text: line.text, x: line.x, y: line.y, rotation: 0 }, metrics);
    const expansion = p.outline === undefined ? 0 : p.outline.width / 2;
    const points = [[b.left - expansion, b.top - expansion], [b.right + expansion, b.top - expansion],
      [b.right + expansion, b.bottom + expansion], [b.left - expansion, b.bottom + expansion]];
    points.forEach(([x, y], index) => commands.push({ op: index === 0 ? "M" : "L", ...transformHitPoint(transform, { x, y }) }));
    commands.push({ op: "Z" });
  }
  // Metrics define Text targeting. Empty lines deliberately have no target area.
  return { type: "path", commands: commands.length ? commands : [{ op: "M", x: p.x, y: p.y }], fillRule: "nonzero" };
}
function geometry(node, metrics) {
  const p = node.properties;
  switch (node.type) {
    case "rect": case "image": return { type: node.type, rect: { x: p.x, y: p.y, width: p.width, height: p.height } };
    case "circle": return { type: "circle", x: p.x, y: p.y, radius: p.radius };
    case "line": return { type: "line", from: { x: p.x1, y: p.y1 }, to: { x: p.x2, y: p.y2 } };
    case "path": return { type: "path", commands: p.commands, fillRule: p.fillRule ?? "nonzero" };
    case "text": return textGeometry(p, metrics);
    default: throw new TypeError("Hit adapter requires a supported concrete scene node.");
  }
}
function stroke(p) {
  const width = p.outline?.width ?? p.strokeWidth ?? 0;
  const color = p.outline?.color ?? p.stroke;
  return width > 0 && color !== undefined && color !== "none"
    ? { width, ...(p.strokeDash === undefined ? {} : { dash: p.strokeDash }), ...resolveStrokeDetails(p) } : null;
}
function clipGeometry(clip) {
  return Array.isArray(clip)
    ? { type: "rect", rect: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } }
    : { type: "path", commands: clip.commands, fillRule: clip.fillRule ?? "nonzero" };
}

/** Consume validated concrete scene geometry, never semantic encodings or renderer objects. */
export function prepareConcreteHitShape(node, metrics, rootTransform = identity) {
  if (node.type === "weighted-blend") {
    validateConcreteGraphicProperties(node.type, node.properties);
    const asSceneClip = clip => clip.type === "path" ? clip : [clip.x, clip.y, clip.width, clip.height];
    return prepareHitShapeUnion(node.properties.sources.map(source => {
      const moved = clip => asSceneClip(translateGraphicClip(clip, ...node.offset));
      return prepareConcreteHitShape({ type: source.type,
        properties: { ...source.properties, opacity: (source.properties.opacity ?? 1) * source.weight * (node.properties.opacity ?? 1) },
        offset: [node.offset[0] + source.offset[0], node.offset[1] + source.offset[1]], clip: node.clip,
        clips: [...node.clips ?? [], moved(source.clip), ...source.clips.map(moved)] }, metrics, rootTransform);
    }));
  }
  const p = node.properties, edge = stroke(p);
  const origin = transformHitPoint(rootTransform, { x: node.offset[0], y: node.offset[1] });
  const fill = node.type === "image" || p.fill !== undefined && p.fill !== "none";
  return prepareHitShape({ geometry: geometry(node, metrics),
    paint: { fill: node.type === "text" ? fill || edge !== null : fill,
      stroke: node.type === "text" ? null : edge, opacity: p.opacity ?? 1 },
    transform: [...rootTransform.slice(0, 4), origin.x, origin.y],
    clips: [node.clip, ...(node.clips ?? [])].map(clip => ({ geometry: clipGeometry(clip), transform: rootTransform })) });
}
