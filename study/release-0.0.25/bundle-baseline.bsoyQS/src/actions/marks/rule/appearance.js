import { validateRuleStroke, validateRuleStrokeWidth } from "../../../grammar/ruleAppearance.js";
import { normalizeStrokeDashPattern, validateOpacityValue } from "../../../grammar/scales/index.js";

const STYLE_ACTIONS = Object.freeze({
  stroke: ["encodeStroke", validateRuleStroke],
  strokeWidth: ["encodeStrokeWidth", validateRuleStrokeWidth],
  strokeDash: ["encodeStrokeDash", normalizeStrokeDashPattern],
  opacity: ["encodeOpacity", validateOpacityValue]
});

export function planRuleAppearance(args, layer) {
  return Object.entries(STYLE_ACTIONS).flatMap(([property, [op, validate]]) => {
    if (!Object.hasOwn(args, property)) return [];
    if (layer?.encoding?.[property]?.field !== undefined) {
      throw new Error(`Rule ${property} conflicts with a field encoding; use ${op} with value to replace it.`);
    }
    validate(args[property], `Rule ${property}`);
    return [{ op, value: args[property] }];
  });
}

export function applyRuleAppearance(program, target, plan) {
  let next = program;
  for (const { op, value } of plan) next = next[op]({ target, value });
  return next;
}
