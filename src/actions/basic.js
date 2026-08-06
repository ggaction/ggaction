import { registerBasicCanvasActions } from "./canvas/index.js";
import { registerBasicChartActions } from "./charts/basic.js";
import { registerCoordinateActions } from "./coordinates/actions.js";
import { registerBasicDataActions } from "./data/basic.js";
import { registerBasicEncodingActions } from "./encodings/basic.js";
import { registerBasicGuideActions } from "./guides/basic.js";
import { registerBasicMarkActions } from "./marks/basic.js";
import { registerBasicPrimitiveActions } from "./primitives/index.js";
import { registerBasicScaleActions } from "./scales/index.js";

export function registerBasicActions(ProgramClass) {
  registerBasicPrimitiveActions(ProgramClass);
  registerBasicCanvasActions(ProgramClass);
  registerBasicDataActions(ProgramClass);
  registerBasicMarkActions(ProgramClass);
  registerBasicScaleActions(ProgramClass);
  registerBasicEncodingActions(ProgramClass);
  registerCoordinateActions(ProgramClass);
  registerBasicGuideActions(ProgramClass);
  registerBasicChartActions(ProgramClass);
}
