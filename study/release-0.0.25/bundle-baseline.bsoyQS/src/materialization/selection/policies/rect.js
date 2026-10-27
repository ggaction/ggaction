import { resolveRectItems } from "../items/index.js";
import { normalizeRectHighlightStyle } from "../styles.js";

export const rectSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveRectItems,
  normalizeHighlightStyle: normalizeRectHighlightStyle,
  applyHighlightOp: "applyRectHighlight",
  rematerializeOp: "rematerializeRectMark"
});
