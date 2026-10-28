import { registerBuiltinResourceKinds } from "./materialization/resourceKinds.js";
import { imageResourceHandler } from "./materialization/imageState.js";
import { hierarchyResourceHandler, hierarchyLayoutResourceHandler } from "./materialization/hierarchy/state.js";
import { fontResourceHandler } from "./materialization/fontState.js";
import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerActions } from "./actions/index.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";

export class ChartProgram extends CoreChartProgram {}

registerBuiltinResourceKinds(ChartProgram, { image: imageResourceHandler, hierarchy: hierarchyResourceHandler, layout: hierarchyLayoutResourceHandler, font: fontResourceHandler });
registerActions(ChartProgram);
recordBuiltinActions(ChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new ChartProgram();
}
