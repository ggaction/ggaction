import { registerBuiltinResourceKinds } from "./materialization/resourceKinds.js";
import { imageResourceHandler } from "./materialization/imageState.js";
import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerActions } from "./actions/index.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";

export class ChartProgram extends CoreChartProgram {}

registerBuiltinResourceKinds(ChartProgram, { image: imageResourceHandler });
registerActions(ChartProgram);
recordBuiltinActions(ChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new ChartProgram();
}
