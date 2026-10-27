import { resolvePointItems } from "../items/index.js";
import { normalizePointHighlightStyle } from "../styles.js";

export const pointSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolvePointItems,
  normalizeHighlightStyle: normalizePointHighlightStyle,
  applyHighlightOp: "applyPointHighlight",
  rematerializeOp: "rematerializePointMark"
});
