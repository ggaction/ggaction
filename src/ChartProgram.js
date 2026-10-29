import { registerGeoLabelAnchorResolver } from "./materialization/textSourceAnchors.js";
import { geoLabelAnchors } from "./materialization/geo/labelAnchors.js";
import { registerBuiltinResourceKinds } from "./materialization/resourceKinds.js";
import { imageResourceHandler } from "./materialization/imageState.js";
import { hierarchyResourceHandler } from "./materialization/hierarchy/state.js";
import { layoutResourceHandler } from "./materialization/layoutState.js";
import { fontResourceHandler } from "./materialization/fontState.js";
import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerActions } from "./actions/index.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";
import { graphResourceHandler } from "./materialization/graph/state.js";
import { geometryResourceHandler } from "./materialization/geometryState.js";
import { edgeRouteResourceHandler } from "./materialization/graph/routeState.js";
import { projectionResourceHandler } from "./materialization/geo/projectionState.js";

export class ChartProgram extends CoreChartProgram {}

registerBuiltinResourceKinds(ChartProgram, { image: imageResourceHandler, hierarchy: hierarchyResourceHandler, layout: layoutResourceHandler, font: fontResourceHandler, graph: graphResourceHandler, geometry: geometryResourceHandler, "edge-route": edgeRouteResourceHandler, projection: projectionResourceHandler });
registerGeoLabelAnchorResolver(ChartProgram, geoLabelAnchors);
registerActions(ChartProgram);
recordBuiltinActions(ChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new ChartProgram();
}
