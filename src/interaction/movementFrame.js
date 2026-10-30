import { freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { resolveHitCoordinates } from "../grammar/hitCoordinates.js";
import { programHitOwnerPlacement } from "./hitProgram.js";

// Shared by native node and annotation movement. A stored semantic baseline
// cannot supply the meaning of an independently sampled animation frame.
export function prepareMovementFrame(base, scene, rootTransform, target, start, nodeKeys) {
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Movement frame work");
  const original = new Map(), current = new Map();
  for (const [nodes, output] of [[base.scene.nodes, original], [scene.nodes, current]]) {
    for (const node of nodes) { spend(1); if (nodeKeys.has(node.key)) output.set(node.key, node); }
  }
  for (const key of nodeKeys) {
    const before = JSON.stringify(original.get(key)), after = JSON.stringify(current.get(key));
    spend(key.length + (before?.length ?? 0) + (after?.length ?? 0));
    if (before === undefined || before !== after) throw new Error("Movement requires the owner's committed concrete frame.");
  }
  const offset = programHitOwnerPlacement(base, target.childPath).offset;
  return prepareMovementCoordinates(scene, rootTransform, start, offset);
}

export function prepareMovementCoordinates(scene, rootTransform, start, offset) {
  const map = point => {
    const mapped = resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: scene.width, height: scene.height }, rootTransform,
      childTransforms: [[1, 0, 0, 1, ...offset]] });
    if (mapped.localPoint === null) throw new Error("Movement requires invertible current coordinates.");
    return mapped.localPoint;
  };
  return freezeOwned({ start: map(start), map });
}
