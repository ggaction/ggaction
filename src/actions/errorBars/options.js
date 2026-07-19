import {
  validateKeys,
  validatePositiveFinite
} from "../../core/validation.js";
import {
  normalizeStrokeDashPattern,
  validateOpacityValue
} from "../../grammar/scales/index.js";
import {
  validateRuleStroke,
  validateRuleStrokeWidth
} from "../../grammar/ruleAppearance.js";

export const ERROR_BAR_EDIT_OPTIONS = Object.freeze([
  "target", "caps", "capSize", "stroke", "strokeWidth",
  "strokeDash", "opacity"
]);

export function resolveErrorBarAppearance(args, {
  defaults,
  operation
}) {
  validateKeys(args, ERROR_BAR_EDIT_OPTIONS, operation);
  const caps = args.caps ?? defaults.caps;
  if (typeof caps !== "boolean") {
    throw new TypeError(`${operation} caps must be a boolean.`);
  }
  const capSize = args.capSize ?? defaults.capSize;
  validatePositiveFinite(capSize, `${operation} capSize`);
  const stroke = validateRuleStroke(
    args.stroke ?? defaults.stroke,
    `${operation} stroke`
  );
  const strokeWidth = validateRuleStrokeWidth(
    args.strokeWidth ?? defaults.strokeWidth,
    `${operation} strokeWidth`
  );
  const strokeDash = args.strokeDash ?? defaults.strokeDash;
  normalizeStrokeDashPattern(strokeDash);
  const opacity = validateOpacityValue(
    args.opacity ?? defaults.opacity,
    `${operation} opacity`
  );
  return {
    caps,
    capSize,
    stroke,
    strokeWidth,
    strokeDash,
    opacity
  };
}
