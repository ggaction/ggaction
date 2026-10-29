import { validateGraphicClip, graphicClipBounds, translateGraphicClip } from '../grammar/schemas/graphicClip.js';
import { validateConcreteGraphicProperties } from '../grammar/schemas/concreteGraphic.js';
import { requireSingleOrderedGraphicByType, walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
function opaqueKey(value) {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

export function collectTransitionGraphics(graphicSpec, identities, { onNode, onCanvas } = {}) {
  const { id: root, object: canvas } = requireSingleOrderedGraphicByType(graphicSpec, "canvas");
  const { width, height } = canvas.properties ?? {};
  if (![width, height].every(n => Number.isFinite(n) && n >= 0)) throw new TypeError('Scene requires finite nonnegative Canvas dimensions.');
  const nodes = [], stack = [{ x: 0, y: 0, clip: [0, 0, width, height], clips: [] }];
  const used = new Map();
  const add = (id, graphic, suffix = "") => {
    if (graphic.type === "collection") {
      for (const [index, item] of (graphic.items ?? []).entries()) add(item.id ?? id, item, `${suffix}/${index}`);
      return;
    }
    validateConcreteGraphicProperties(graphic.type, graphic.properties);
    const frame = stack.at(-1);
    const identity = identities.get(id);
    const base = identity?.key ?? `graphic:${opaqueKey([id, suffix])}`;
    const count = used.get(base) ?? 0; used.set(base, count + 1);
    const node = { key: `${base}#${count}`, type: graphic.type,
      topology: identity?.topology ?? "",
      properties: graphic.properties,
      offset: [frame.x, frame.y], clip: frame.clip, clips: frame.clips };
    onNode?.(id, node);
    nodes.push(node);
  };
  const background = (id, object) => {
    const p = object.properties;
    if (p.background !== undefined) add(`${id}/background`, { type: "rect", properties: {
      x: 0, y: 0, width: p.width, height: p.height, fill: p.background,
      stroke: "none", strokeWidth: 0
    } });
  };
  onCanvas?.(root, stack[0]);
  background(root, canvas);
  walkGraphicTreeEvents(graphicSpec, {
    enter({ id, object }) {
      if (id === root) return;
      if (object.type === "canvas") {
        const p = object.properties, parent = stack.at(-1);
        if (![p.x, p.y, p.width, p.height].every(Number.isFinite) || p.width < 0 || p.height < 0) throw new TypeError('Invalid nested Canvas geometry.');
        const x = parent.x + p.x, y = parent.y + p.y;
        const left = Math.max(x, parent.clip[0]), top = Math.max(y, parent.clip[1]);
        stack.push({ x, y, clips: [...parent.clips, [x, y, p.width, p.height]], clip: [left, top,
          Math.max(0, Math.min(x + p.width, parent.clip[0] + parent.clip[2]) - left),
          Math.max(0, Math.min(y + p.height, parent.clip[1] + parent.clip[3]) - top)] });
        onCanvas?.(id, stack.at(-1));
        background(id, object);
      } else {
        if (object.clip !== undefined) {
          const clip = validateGraphicClip(object.clip, object.type), parent = stack.at(-1);
          const bounds = graphicClipBounds(clip, parent.x, parent.y);
          const left = Math.max(bounds.left, parent.clip[0]), top = Math.max(bounds.top, parent.clip[1]);
          const absolute = clip.type === "path" ? translateGraphicClip(clip, parent.x, parent.y)
            : [bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top];
          stack.push({ ...parent, clips: [...parent.clips, absolute], clip: [left, top,
            Math.max(0, Math.min(bounds.right, parent.clip[0] + parent.clip[2]) - left),
            Math.max(0, Math.min(bounds.bottom, parent.clip[1] + parent.clip[3]) - top)] });
        }
        if (object.type !== "collection" && !Array.isArray(object.items)) add(id, object);
      }
    },
    item({ id, object, owner }) { add(id, { ...object, type: object.type ?? owner.type }); },
    exit({ id, object }) { if (id !== root && (object.type === "canvas" || object.clip !== undefined)) stack.pop(); }
  });
  return { version: 2, width, height, nodes };
}
