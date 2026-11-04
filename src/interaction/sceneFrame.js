import { animationSceneLength, animationSceneRows } from "../core/sceneRows.js";
import { validateBatchSceneStructure } from "../grammar/schemas/batchScene.js";
import { snapshotInteractionInput } from "./input.js";
import { ownRecord } from "../core/ownData.js";
import { normalizeHitPreparation } from "../grammar/hitPolicy.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

// Snapshot host frames before reading optional properties, without invoking accessors.
export function ownHitScene(scene, options) {
  const policy = normalizeHitPreparation(options);
  ownRecord(scene, "Interaction frame");
  const batch = Object.hasOwn(scene, "version") && scene.version === 3;
  if (batch) validateBatchSceneStructure(scene, undefined, policy.maxSceneNodes);
  if (!(batch ? Array.isArray(scene.entries) : Object.hasOwn(scene, "nodes") && Array.isArray(scene.nodes)) ||
      (batch ? animationSceneLength(scene) : scene.nodes.length) > policy.maxSceneNodes) {
    throw new RangeError("Interaction frame exceeds its node budget.");
  }
  const result = snapshotInteractionInput(scene, "Interaction frame");
  canvasSceneProgram(result);
  for (const { node } of animationSceneRows(result, { decisions: false })) validateConcreteGraphicProperties(node.type, node.properties);
  return result;
}
