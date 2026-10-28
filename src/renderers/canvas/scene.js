import { canvasSceneProgram } from "../canvasScene.js";
import { render } from "./index.js";

/** Paint concrete Canvas scenes with the ordinary renderer; no semantics or DOM. */
export function renderTransitionScene(scene, context, options) {
  return render(canvasSceneProgram(scene), context, options);
}
