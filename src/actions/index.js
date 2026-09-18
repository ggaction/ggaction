import { registerPrimitiveActions } from "./primitives/index.js";
import { registerCanvasActions } from "./canvas/index.js";
import { registerBasicCoordinateActions } from "./coordinates/actions.js";
import { registerCoordinateEditActions } from "./coordinates/edit.js";
import { registerDataActions } from "./data/index.js";
import { registerMarkActions } from "./marks/index.js";
import { registerScaleActions } from "./scales/index.js";
import { registerEncodingActions } from "./encodings/index.js";
import { registerGuideActions } from "./guides/index.js";
import { registerTitleActions } from "./titles/index.js";
import { registerRegressionActions } from "./regression/index.js";
import { registerErrorBarActions } from "./errorBars/index.js";
import { registerErrorBandActions } from "./errorBands/index.js";
import { registerBoxPlotActions } from "./boxPlots/index.js";
import { registerGradientPlotActions } from "./gradientPlots/index.js";
import { registerViolinPlotActions } from "./violinPlots/index.js";
import { registerChartActions } from "./charts/index.js";
import { registerCategoryOrderActions } from "./categoryOrder/index.js";
import { registerSelectionActions } from "./selection/index.js";
import { registerResourceActions } from "./resources/index.js";
import { registerTextMetricActions } from "./textMetrics/index.js";
import { registerCompositionActions } from "./composition/index.js";
import { registerFacetActions } from "./facets/index.js";
import { registerThemeActions } from "./theme/index.js";
import {
  applyCompositionTheme,
  removeCompositionTheme
} from "./theme/composition.js";

export function registerActions(ProgramClass) {
  registerThemeActions(ProgramClass, {
    apply: applyCompositionTheme,
    remove: removeCompositionTheme
  });
  registerPrimitiveActions(ProgramClass);
  registerCompositionActions(ProgramClass);
  registerFacetActions(ProgramClass);
  registerCanvasActions(ProgramClass);
  registerDataActions(ProgramClass);
  registerMarkActions(ProgramClass);
  registerScaleActions(ProgramClass);
  registerEncodingActions(ProgramClass);
  registerBasicCoordinateActions(ProgramClass);
  registerCoordinateEditActions(ProgramClass);
  registerGuideActions(ProgramClass);
  registerTitleActions(ProgramClass);
  registerRegressionActions(ProgramClass);
  registerErrorBarActions(ProgramClass);
  registerErrorBandActions(ProgramClass);
  registerBoxPlotActions(ProgramClass);
  registerGradientPlotActions(ProgramClass);
  registerViolinPlotActions(ProgramClass);
  registerChartActions(ProgramClass);
  registerCategoryOrderActions(ProgramClass);
  registerSelectionActions(ProgramClass);
  registerResourceActions(ProgramClass);
  registerTextMetricActions(ProgramClass);
}
