import { action } from "../../core/action.js";
import { noOptions } from "../../core/validation.js";
import { resolveProgramPlotDrawOrder } from "../../materialization/plotDrawOrder.js";

export const rematerializePlotDrawOrder = action({
  op: "rematerializePlotDrawOrder", description: "Reconcile explicit guide underlays without changing graphic content."
}, function (args = {}) {
  noOptions(args, "rematerializePlotDrawOrder");
  const plot = this.graphicSpec.objects["plot-main"];
  if (this.compositionSpec !== undefined || plot === undefined) return this;
  const children = resolveProgramPlotDrawOrder(this);
  if (children.every((id, index) => id === plot.children[index])) return this;
  return this.editGraphics({ target: "plot-main", property: "children", value: children });
});
