import { resolvePointItems } from "../items.js";
import { normalizePointHighlightStyle } from "../styles.js";

export const pointSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolvePointItems,
  normalizeHighlightStyle: normalizePointHighlightStyle,
  applyHighlightOp: "applyPointHighlight",
  rematerializeOp: "rematerializePointMark"
});
