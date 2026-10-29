import { registerMarkItemResolver } from "./materialization/selection/itemResolver.js";
import { resolveMarkItems } from "./materialization/selection/policies/index.js";
import { recordBuiltinActions } from "./core/extensionRegistry.js";
import { registerBasicActions } from "./actions/basic.js";
import { ChartProgram as CoreChartProgram } from "./core/ChartProgram.js";

export class BasicChartProgram extends CoreChartProgram {}

registerMarkItemResolver(BasicChartProgram, resolveMarkItems);

registerBasicActions(BasicChartProgram);
recordBuiltinActions(BasicChartProgram, ["hconcat", "vconcat", "rematerializeEncodingScales", "encodeStroke", "editScale", "removeEncoding", "removeScale"]);

export function chart() {
  return new BasicChartProgram();
}
