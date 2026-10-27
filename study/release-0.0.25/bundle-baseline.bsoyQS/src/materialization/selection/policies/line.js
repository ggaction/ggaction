import { resolveLineItems } from "../items/index.js";
import { normalizeStrokeHighlightStyle } from "../styles.js";

export const lineSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveLineItems,
  normalizeHighlightStyle: args => normalizeStrokeHighlightStyle(args, "Line"),
  applyHighlightOp: "applyPathHighlight",
  rematerializeOp: "rematerializeLineMark"
});
