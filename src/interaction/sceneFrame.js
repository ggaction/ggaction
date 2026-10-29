import { freezeOwned, isOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK } from "../grammar/hitIndex.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

// Snapshot host frames before reading optional properties, without invoking accessors.
export function ownHitScene(scene) {
  ownRecord(scene, "Interaction frame");
  if (!Object.hasOwn(scene, "nodes") || !Array.isArray(scene.nodes) || scene.nodes.length > MAX_HIT_INDEX_ITEMS) {
    throw new RangeError("Interaction frame exceeds its node budget.");
  }
  let work = 0;
  const spend = amount => { if ((work += amount) > MAX_HIT_INDEX_WORK) throw new RangeError("Interaction frame exceeds its snapshot work budget."); };
  const ancestors = new WeakSet(), pending = [];
  const copy = input => {
    spend(1);
    if (typeof input === "string") spend(input.length);
    if (input === null || typeof input !== "object") {
      if (!["undefined", "number", "string", "boolean"].includes(typeof input) && input !== null) throw new TypeError("Interaction frames require plain data.");
      return input;
    }
    if (isOwned(input)) return input;
    if (ancestors.has(input)) throw new TypeError("Interaction frames cannot contain cycles.");
    const array = Array.isArray(input);
    if (array) { spend(input.length); ownArray(input, "Interaction frame array"); }
    else ownRecord(input, "Interaction frame record");
    const entries = Object.entries(input), output = array ? [] : Object.create(null);
    spend(entries.length); ancestors.add(input); pending.push({ input, output, entries, cursor: 0 });
    return output;
  };
  const result = copy(scene);
  while (pending.length) {
    const frame = pending.at(-1);
    if (frame.cursor === frame.entries.length) { freezeOwned(frame.output); ancestors.delete(frame.input); pending.pop(); }
    else { const [key, value] = frame.entries[frame.cursor++]; spend(key.length); frame.output[key] = copy(value); }
  }
  canvasSceneProgram(result);
  for (const node of result.nodes) validateConcreteGraphicProperties(node.type, node.properties);
  return result;
}
