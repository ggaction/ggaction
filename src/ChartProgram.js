import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerActions } from "./actions/index.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";
import { registerBuiltinResourceKinds } from "./materialization/resourceKinds.js";
import { graphResourceHandler } from "./materialization/graph/state.js";
import { registerDataResourceRevision } from "./actions/data/resourceRevision.js";
import { reviseGraphInputs } from "./actions/graphs/resources.js";

export class ChartProgram extends CoreChartProgram {}

registerBuiltinResourceKinds(ChartProgram, { graph: graphResourceHandler });
registerDataResourceRevision(ChartProgram, { kinds: ["graph"], revise: reviseGraphInputs });
registerActions(ChartProgram);
recordBuiltinActions(ChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new ChartProgram();
}
