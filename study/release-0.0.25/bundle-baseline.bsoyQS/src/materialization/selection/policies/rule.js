import { resolveRuleItems } from "../items/index.js";
import { normalizeStrokeHighlightStyle } from "../styles.js";

export const ruleSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolveRuleItems,
  normalizeHighlightStyle: args => normalizeStrokeHighlightStyle(args, "Rule"),
  applyHighlightOp: "applyRuleHighlight",
  rematerializeOp: "rematerializeRuleMark"
});
