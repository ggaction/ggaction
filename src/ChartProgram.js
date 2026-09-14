import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerActions } from "./actions/index.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";

export class ChartProgram extends CoreChartProgram {}

registerActions(ChartProgram);
recordBuiltinActions(ChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new ChartProgram();
}
