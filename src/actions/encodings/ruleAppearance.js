import { action } from "../../core/action.js";
import {
  validateRuleStroke,
  validateRuleStrokeWidth
} from "../../grammar/ruleAppearance.js";
import { resolveTarget, validateOptions } from "./shared.js";

const OPTIONS = Object.freeze(["target", "value"]);

const encodeStroke = action(
  {
    op: "encodeStroke",
    description: "Set a constant graphical stroke on a rule mark."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeStroke");
    const { id } = resolveTarget(this, args.target, ["rule"], "rule mark");
    return this
      ._withMarkConfig(id, {
        ...this.markConfigs[id],
        stroke: validateRuleStroke(args.value)
      })
      .rematerializeRuleMark({ id });
  }
);

const encodeStrokeWidth = action(
  {
    op: "encodeStrokeWidth",
    description: "Set a constant graphical stroke width on a rule mark."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeStrokeWidth");
    const { id } = resolveTarget(this, args.target, ["rule"], "rule mark");
    return this
      ._withMarkConfig(id, {
        ...this.markConfigs[id],
        strokeWidth: validateRuleStrokeWidth(args.value)
      })
      .rematerializeRuleMark({ id });
  }
);

export function registerRuleAppearanceEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeStroke = encodeStroke;
  ProgramClass.prototype.encodeStrokeWidth = encodeStrokeWidth;
}
