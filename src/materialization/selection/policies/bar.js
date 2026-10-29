import { resolveBarSourceItems, validateBarStackGrain } from "../items/bar.js";
import { resolveBarItems } from "../items/index.js";
import { normalizeBarHighlightStyle } from "../styles.js";

export const barSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item", "stack"]),
  resolveItems: resolveBarItems,
  validateGrain: (layer, grain) => { if (grain === "stack") validateBarStackGrain(layer); },
  resolveSourceItems: resolveBarSourceItems,
  normalizeHighlightStyle: normalizeBarHighlightStyle,
  applyHighlightOp: "applyBarHighlight",
  rematerializeOp: "rematerializeBarMark"
});
