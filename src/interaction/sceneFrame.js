import { snapshotInteractionInput } from "./input.js";
import { ownRecord } from "../core/ownData.js";
import { MAX_HIT_INDEX_ITEMS } from "../grammar/hitIndex.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

// Snapshot host frames before reading optional properties, without invoking accessors.
export function ownHitScene(scene) {
  ownRecord(scene, "Interaction frame");
  if (!Object.hasOwn(scene, "nodes") || !Array.isArray(scene.nodes) || scene.nodes.length > MAX_HIT_INDEX_ITEMS) {
    throw new RangeError("Interaction frame exceeds its node budget.");
  }
  const result = snapshotInteractionInput(scene, "Interaction frame");
  canvasSceneProgram(result);
  for (const node of result.nodes) validateConcreteGraphicProperties(node.type, node.properties);
  return result;
}
