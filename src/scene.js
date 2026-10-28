import { collectTransitionGraphics } from "./renderers/transitionScene.js";
export { renderTransitionScene } from "./renderers/canvas/scene.js";
import { renderTransitionGraphics } from "./renderers/svgSerialization.js";
import { cloneAndFreeze } from "./core/immutable.js";
import { contentDigest } from "./core/contentDigest.js";

const scenes = new WeakMap(), canvasScenes = new WeakMap();
function identities(graphicSpec) {
  const result = new Map();
  const token = value => contentDigest(JSON.stringify(value));
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

/** Read-only, browser-safe, structured-cloneable scene for animation consumers. */
export function createTransitionScene(program, { format = "svg", shadows } = {}) {
  if (!["svg", "canvas"].includes(format)) throw new TypeError("Unknown transition scene format.");
  const cache = format === "canvas" ? canvasScenes : scenes;
  if (!program?.graphicSpec) throw new TypeError("createTransitionScene requires a ChartProgram.");
  if (shadows === undefined && cache.has(program)) return cache.get(program);
  const scene = cloneAndFreeze((format === "canvas" ? collectTransitionGraphics : renderTransitionGraphics)(program.graphicSpec, identities(program.graphicSpec), { shadows }));
  if (shadows === undefined) cache.set(program, scene);
  return scene;
}
