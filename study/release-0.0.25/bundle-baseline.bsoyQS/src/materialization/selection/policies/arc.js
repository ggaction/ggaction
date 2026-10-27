import { resolveArcItems } from "../items/index.js";
import { normalizeAreaHighlightStyle } from "../styles.js";

export const arcSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveArcItems,
  normalizeHighlightStyle: args => normalizeAreaHighlightStyle(args, "Arc"),
  applyHighlightOp: "applyPathHighlight",
  rematerializeOp: "rematerializeArcMark"
});
