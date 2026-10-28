import { resolveConditionalRectSourceItems } from "../items/rect.js";
import { resolveRectItems } from "../items/index.js";
import { normalizeRectHighlightStyle } from "../styles.js";

export const rectSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveRectItems,
  resolveSourceItems(program, layer, dataset, grain, resolvers) {
    if (["x", "y", "x2", "y2"].some(channel => layer.conditionals?.[channel] !== undefined)) return resolveConditionalRectSourceItems(program, layer, dataset);
    return resolveRectItems(program, layer, dataset, grain, resolvers.resolveMarkItems, { ...resolvers, sourceOnly: true });
  },
  normalizeHighlightStyle: normalizeRectHighlightStyle,
  applyHighlightOp: "applyRectHighlight",
  rematerializeOp: "rematerializeRectMark"
});
