import { resolveBarSourceItems } from "../items/bar.js";
import { resolveBarItems } from "../items/index.js";
import { normalizeBarHighlightStyle } from "../styles.js";

export const barSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item", "stack"]),
  resolveItems: resolveBarItems,
  resolveSourceItems: resolveBarSourceItems,
  normalizeHighlightStyle: normalizeBarHighlightStyle,
  applyHighlightOp: "applyBarHighlight",
  rematerializeOp: "rematerializeBarMark"
});
