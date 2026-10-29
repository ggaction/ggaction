import { canvasSceneSnapshot, sceneIdentities } from "./sceneSnapshot.js";
export { renderTransitionScene } from "./renderers/canvas/scene.js";
import { renderTransitionGraphics } from "./renderers/svgSerialization.js";
import { cloneAndFreeze } from "./core/immutable.js";

const scenes = new WeakMap();
/** Read-only, browser-safe, structured-cloneable scene for animation consumers. */
export function createTransitionScene(program, { format = "svg", shadows } = {}) {
  if (!["svg", "canvas"].includes(format)) throw new TypeError("Unknown transition scene format.");
  const cache = scenes;
  if (!program?.graphicSpec) throw new TypeError("createTransitionScene requires a ChartProgram.");
  if (format === "canvas") return canvasSceneSnapshot(program, shadows === undefined).scene;
  if (shadows === undefined && cache.has(program)) return cache.get(program);
  const scene = cloneAndFreeze(renderTransitionGraphics(program.graphicSpec, sceneIdentities(program.graphicSpec), { shadows }));
  if (shadows === undefined) cache.set(program, scene);
  return scene;
}
