import { resolveAreaItems } from "../items.js";
import { normalizeAreaHighlightStyle } from "../styles.js";

export const areaSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveAreaItems,
  normalizeHighlightStyle: normalizeAreaHighlightStyle,
  applyHighlightOp: "applyPathHighlight",
  rematerializeOp: "rematerializeAreaMark"
});
