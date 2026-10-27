import { resolveTickItems } from "../items/index.js";
import { normalizeStrokeHighlightStyle } from "../styles.js";

export const tickSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveTickItems,
  normalizeHighlightStyle: args => normalizeStrokeHighlightStyle(args, "Tick"),
  applyHighlightOp: "applyRuleHighlight",
  rematerializeOp: "rematerializeTickMark"
});
