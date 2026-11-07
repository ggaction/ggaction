import { resolvePointItems, resolvePointItemsStages, resolvePointSourceItems } from "../items/point.js";
import { normalizePointHighlightStyle } from "../styles.js";

export const pointSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolvePointItems,
  resolveItemsStages: resolvePointItemsStages,
  resolveSourceItems: resolvePointSourceItems,
  normalizeHighlightStyle: normalizePointHighlightStyle,
  applyHighlightOp: "applyPointHighlight",
  rematerializeOp: "rematerializePointMark"
});
