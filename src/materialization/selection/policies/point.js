import { resolvePointItems, resolvePointSourceItems } from "../items/point.js";
import { normalizePointHighlightStyle } from "../styles.js";

export const pointSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolvePointItems,
  resolveSourceItems: resolvePointSourceItems,
  normalizeHighlightStyle: normalizePointHighlightStyle,
  applyHighlightOp: "applyPointHighlight",
  rematerializeOp: "rematerializePointMark"
});
