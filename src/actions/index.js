import { registerCanvasActions } from "./canvas/index.js";
import { registerCoordinateActions } from "./coordinates/index.js";
import { registerCompositionActions } from "./composition/index.js";
import { registerDataActions } from "./data/index.js";
import { registerEncodingActions } from "./encodings/index.js";
import { registerErrorBandActions } from "./errorBands/index.js";
import { registerErrorBarActions } from "./errorBars/index.js";
import { registerFacetActions } from "./facets/index.js";
import { registerBoxPlotActions } from "./boxPlots/index.js";
import { registerGuideActions } from "./guides/index.js";
import { registerMarkActions } from "./marks/index.js";
import { registerPrimitiveActions } from "./primitives/index.js";
import { registerRegressionActions } from "./regression/index.js";
import { registerScaleActions } from "./scales/index.js";
import { registerTitleActions } from "./titles/index.js";
import { registerSelectionActions } from "./selection/index.js";

export function registerActions(ProgramClass) {
  registerPrimitiveActions(ProgramClass);
  registerCompositionActions(ProgramClass);
  registerFacetActions(ProgramClass);
  registerCanvasActions(ProgramClass);
  registerDataActions(ProgramClass);
  registerMarkActions(ProgramClass);
  registerScaleActions(ProgramClass);
  registerEncodingActions(ProgramClass);
  registerCoordinateActions(ProgramClass);
  registerGuideActions(ProgramClass);
  registerTitleActions(ProgramClass);
  registerRegressionActions(ProgramClass);
  registerErrorBarActions(ProgramClass);
  registerErrorBandActions(ProgramClass);
  registerBoxPlotActions(ProgramClass);
  registerSelectionActions(ProgramClass);
}
