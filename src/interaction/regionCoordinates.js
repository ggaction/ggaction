import { freezeOwned } from "../core/immutable.js";
import { resolveHitCoordinates, transformHitPoint } from "../grammar/hitCoordinates.js";

// The same CSS/child coordinate path serves brush creation and handle editing.
export function regionCoordinates(scene, rootTransform, offset) {
  const map = point => {
    const mapped = resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: scene.width, height: scene.height }, rootTransform,
      childTransforms: [[1, 0, 0, 1, ...offset]] });
    if (mapped.localPoint === null) throw new Error("Region gesture requires invertible current coordinates.");
    return mapped.localPoint;
  };
  const toRoot = point => transformHitPoint([1, 0, 0, 1, ...offset], point);
  return freezeOwned({ map, toRoot, toScreen: point => transformHitPoint(rootTransform, toRoot(point)),
    screenToRoot: point => resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: scene.width, height: scene.height }, rootTransform, childTransforms: [] }).localPoint });
}
