import { registerCanvasActions } from "./canvas/index.js";
import { registerCoordinateActions } from "./coordinates/index.js";
import { registerDataActions } from "./data/index.js";
import { registerEncodingActions } from "./encodings/index.js";
import { registerGuideActions } from "./guides/index.js";
import { registerMarkActions } from "./marks/index.js";
import { registerPrimitiveActions } from "./primitives/index.js";
import { registerScaleActions } from "./scales/index.js";
import { registerTitleActions } from "./titles/index.js";

export function registerActions(ProgramClass) {
  registerPrimitiveActions(ProgramClass);
  registerCanvasActions(ProgramClass);
  registerDataActions(ProgramClass);
  registerMarkActions(ProgramClass);
  registerScaleActions(ProgramClass);
  registerEncodingActions(ProgramClass);
  registerCoordinateActions(ProgramClass);
  registerGuideActions(ProgramClass);
  registerTitleActions(ProgramClass);
}
