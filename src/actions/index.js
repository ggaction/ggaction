import { registerGeoMarkActions } from "./geo/marks.js";
import { registerGeometryActions } from "./geo/resources.js";
import { registerGeoJoinActions } from "./geo/join.js";
import { registerProjectionActions } from "./geo/projections.js";
import { reviseSourceResourceInputs } from "./data/resourcePlan.js";
import { registerCalendarResourceActions, reviseCalendarInputs } from "./calendar/resources.js";
import { registerCalendarPlotActions } from "./calendar/plots.js";
import { registerImageResourceActions } from "./images/index.js";
import { registerLayoutActions } from "./layouts/index.js";
import { registerGraphPlotActions } from "./graphs/plots.js";
import { registerEdgeRouteActions } from "./graphs/edgeRoutes.js";
import { registerHierarchyPlotActions } from "./hierarchy/plots.js";
import { registerDataResourceRevision } from "./data/resourceRevision.js";
import { registerHierarchyResourceActions, reviseHierarchyInputs } from "./hierarchy/resources.js";
import { registerFontResourceActions } from "./fonts/index.js";
import { registerPrimitiveActions } from "./primitives/index.js";
import { registerCanvasActions } from "./canvas/index.js";
import { registerGeoCoordinateActions } from "./geo/coordinates.js";
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
import { registerGraphActions, reviseGraphInputs, projectGraphInputs } from "./graphs/resources.js";
import { registerFlowActions } from "./flow/resources.js";
import { registerFlowPlotActions } from "./flow/plots.js";
import { registerContourResourceActions, reviseContourInputs } from "./contours/resources.js";
import { registerContourMarkActions } from "./contours/marks.js";
import { registerTextMetricActions } from "./textMetrics/index.js";
import { registerCompositionActions } from "./composition/index.js";
import { registerFacetActions } from "./facets/index.js";
import { registerOverlayActions } from "./overlays/index.js";
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
  registerImageResourceActions(ProgramClass);
  registerFontResourceActions(ProgramClass);
  registerCompositionActions(ProgramClass);
  registerFacetActions(ProgramClass);
  registerCanvasActions(ProgramClass);
  registerDataActions(ProgramClass);
  registerMarkActions(ProgramClass);
  registerOverlayActions(ProgramClass);
  registerScaleActions(ProgramClass);
  registerEncodingActions(ProgramClass);
  registerGeoCoordinateActions(ProgramClass);
  registerGeoMarkActions(ProgramClass);
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
  registerGraphActions(ProgramClass);
  registerGraphPlotActions(ProgramClass);
  registerEdgeRouteActions(ProgramClass);
  registerFlowActions(ProgramClass);
  registerFlowPlotActions(ProgramClass);
  registerCalendarResourceActions(ProgramClass);
  registerCalendarPlotActions(ProgramClass);
  registerGeometryActions(ProgramClass);
  registerGeoJoinActions(ProgramClass);
  registerProjectionActions(ProgramClass);
  registerContourResourceActions(ProgramClass);
  registerContourMarkActions(ProgramClass);
  registerHierarchyResourceActions(ProgramClass);
  registerLayoutActions(ProgramClass);
  registerHierarchyPlotActions(ProgramClass);
  registerDataResourceRevision(ProgramClass, { kinds: ["hierarchy", "graph", "geometry", "layout", "edge-route"],
    revise: (program, replacements) => reviseCalendarInputs(reviseContourInputs(reviseGraphInputs(reviseHierarchyInputs(program, replacements), replacements), replacements), replacements),
    project: (program, replacements) => reviseCalendarInputs(reviseContourInputs(projectGraphInputs(reviseHierarchyInputs(program, replacements), replacements), replacements), replacements),
    reviseSource: reviseSourceResourceInputs });
  registerTextMetricActions(ProgramClass);
}
