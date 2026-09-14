import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerBasicActions } from "./actions/basic.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";

export class BasicChartProgram extends CoreChartProgram {}

registerBasicActions(BasicChartProgram);
recordBuiltinActions(BasicChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales"]);

export function chart() {
  return new BasicChartProgram();
}
