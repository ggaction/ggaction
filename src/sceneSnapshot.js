import { collectTransitionGraphics } from "./renderers/transitionScene.js";
import { cloneAndFreeze } from "./core/immutable.js";
import { contentDigest } from "./core/contentDigest.js";

const snapshots = new WeakMap();
export function sceneIdentities(graphicSpec) {
  const result = new Map(), token = value => contentDigest(JSON.stringify(value));
  for (const [id, object] of Object.entries(graphicSpec.objects)) {
    result.set(id, { key: token([id]), topology: "" });
    if (object.type === "canvas") result.set(`${id}/background`, { key: token([id, "background"]), topology: "" });
    for (const item of object.items ?? []) {
      const identity = item.identity;
      result.set(item.id, identity === undefined ? {
        key: token([id, object.type === "text" ? item.properties.text : item.id]), topology: ""
      } : { key: token([identity.key, identity.role]), topology: identity.topology });
    }
  }
  return result;
}

// Ephemeral association only: the public concrete scene stays structured-cloneable.
export function canvasSceneSnapshot(program, cache = true) {
  if (!program?.graphicSpec) throw new TypeError("Scene snapshot requires a ChartProgram.");
  if (cache && snapshots.has(program)) return snapshots.get(program);
  const sources = [], canvases = [];
  const scene = collectTransitionGraphics(program.graphicSpec, sceneIdentities(program.graphicSpec), {
    onNode(graphicId, node) { sources.push({ graphicId, nodeKey: node.key }); },
    onCanvas(graphicId, frame) { canvases.push({ graphicId, offset: [frame.x, frame.y], clip: frame.clip }); }
  });
  const snapshot = cloneAndFreeze({ scene, sources, canvases });
  if (cache) snapshots.set(program, snapshot);
  return snapshot;
}
