import { action } from "../../core/action.js";
import { createArcPlot } from "./radial.js";

export const createPiePlot = /* @__PURE__ */ action({
  op: "createPiePlot", description: "Create a categorical count or weighted-sum pie or donut plot."
}, function (args = {}) {
  return createArcPlot(this, args, { operation: "createPiePlot", defaultId: "piePlot" });
});
