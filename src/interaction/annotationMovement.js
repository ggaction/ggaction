import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { findLayer, requireLayer } from "../selectors/layers.js";
import { interactionOwner } from "./selection.js";
import { prepareMovementFrame } from "./movementFrame.js";
import { interactionOptions as options } from "./input.js";

export function resolveAnnotationMovement(program, binding, allowMissing = false) {
  const owner = interactionOwner(program, binding.target, allowMissing);
  if (!owner || (allowMissing && !findLayer(owner.view, owner.target.id))) return null;
  if (typeof program.editAnnotation !== "function") throw new Error("Annotation dragging requires Full annotation editing.");
  if (owner.target.facetSource || owner.view.compositionSpec?.type === "facet") throw new Error("Annotation dragging requires a concrete owner, not a facet source.");
  const layer = requireLayer(owner.view, owner.target.id), geo = layer.mark.type === "geo" && layer.geoBinding.mode === "annotation";
  if (layer.mark.type !== "text" && !geo) throw new TypeError("Annotation dragging requires a Text or geographic annotation target.");
  if (["dx", "dy"].some(key => layer.encoding?.[key] !== undefined || layer.conditionals?.[key] !== undefined)) {
    throw new Error("Annotation dragging cannot replace encoded offsets.");
  }
  const config = owner.view.markConfigs[layer.id];
  return { ...owner, offsets: geo ? config.geo : config };
}

export function normalizeAnnotationMovement(program, value) {
  const request = options(value, ["type", "target"], [], "Annotation movement binding");
  const owner = resolveAnnotationMovement(program, request);
  return cloneAndFreeze({ type: "annotate", target: owner.target });
}

export function prepareAnnotationMovement(program, binding, base, scene, rootTransform, start, hit) {
  const owner = resolveAnnotationMovement(program, binding, true);
  if (!owner) return null;
  let work = 0;
  const matches = item => {
    validateWorkLimit(work += 1 + item.childPath.length, "Annotation movement work");
    return item.ownerId === owner.target.id && item.childPath.length === owner.target.childPath.length &&
      item.childPath.every((id, index) => id === owner.target.childPath[index]);
  };
  if (!hit.candidates.some(matches)) return null;
  const keys = new Set(base.entries.filter(entry => matches(entry.metadata)).map(entry => entry.nodeKey));
  return freezeOwned({ target: owner.target, dx: owner.offsets.dx, dy: owner.offsets.dy,
    ...prepareMovementFrame(base, scene, rootTransform, owner.target, start, keys) });
}

export function annotationMovementCommand(context, points) {
  const end = context.map(points.at(-1));
  return { command: { type: "annotate", target: context.target, origin: "user", payload: {
    dx: context.dx + (end.x - context.start.x), dy: context.dy + (end.y - context.start.y)
  } } };
}
