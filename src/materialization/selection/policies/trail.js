import { resolveTrailPlot } from "../../trail/plot.js";
import { finalizeItems } from "../items/common.js";
import { normalizeAreaHighlightStyle } from "../styles.js";
export const trailSelectionPolicy = Object.freeze({ supportedGrains: Object.freeze(["item"]),
  resolveItems(program, layer, dataset, _grain, _resolveItems, selectionResolvers) {
    const resolved = resolveTrailPlot(program, layer, program.markConfigs[layer.id].trailPlot);
    return finalizeItems(program, layer, "item", resolved.items, "path", { selectionResolvers });
  },
  normalizeHighlightStyle: normalizeAreaHighlightStyle, applyHighlightOp: "applyPathHighlight", rematerializeOp: "materializeTrailPlot" });
