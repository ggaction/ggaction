import { action } from "../../core/action.js";
import {
  validateRuleStroke,
  validateRuleStrokeWidth
} from "../../grammar/ruleAppearance.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { resolveStrokeWidthScaleDefinition } from "../scales/definitions.js";
import {
  applyEncodingScale,
  applyDetachedScaleRematerialization,
  rematerializeEncoding,
  resolveReassignmentScaleOptions,
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";
import { findLayer } from "../../selectors/layers.js";

const STROKE_OPTIONS = Object.freeze(["target", "value"]);
const WIDTH_OPTIONS = Object.freeze([
  "target", "value", "field", "fieldType", "scale"
]);

const encodeStroke = action(
  {
    op: "encodeStroke",
    description: "Set a constant graphical stroke on a rule mark."
  },
  function (args = {}) {
    validateOptions(args, STROKE_OPTIONS, "encodeStroke");
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
    validateOptions(args, WIDTH_OPTIONS, "encodeStrokeWidth");
    const hasValue = Object.hasOwn(args, "value");
    const hasField = Object.hasOwn(args, "field");
    if (hasValue === hasField) {
      throw new Error("encodeStrokeWidth requires exactly one of value or field.");
    }
    if (hasValue) {
      const { id, layer } = resolveTarget(this, args.target, ["rule"], "rule mark");
      let next = this.guideConfigs.legend?.strokeWidth?.target === id
        ? this.removeLegend({ target: id })
        : this;
      if (findLayer(next, id)?.encoding?.strokeWidth !== undefined) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.strokeWidth`,
          remove: true
        });
      }
      next = next
        ._withMarkConfig(id, {
          ...next.markConfigs[id],
          strokeWidth: validateRuleStrokeWidth(args.value)
        })
        .rematerializeRuleMark({ id });
      return applyDetachedScaleRematerialization(next, [layer]);
    }
    const { id, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["rule", "line"],
      "rule or line mark"
    );
    const fieldType = args.fieldType ?? "quantitative";
    if (fieldType !== "quantitative") {
      throw new Error("encodeStrokeWidth requires a quantitative field.");
    }
    const values = readQuantitativeField(dataset.values, args.field);
    if (values.some(value => value < 0)) {
      throw new RangeError(
        `encodeStrokeWidth field "${args.field}" cannot contain negative values.`
      );
    }
    const previous = layer.encoding?.strokeWidth;
    const requestedScale = resolveReassignmentScaleOptions(
      previous,
      args.scale ?? {}
    );
    const scale = resolveStrokeWidthScaleDefinition(this, requestedScale);
    const { strokeWidth, ...config } = this.markConfigs[id] ?? {};
    void strokeWidth;
    let next = setEncodingProperties(
      this._withMarkConfig(id, config),
      id,
      "strokeWidth",
      { field: args.field, fieldType, scale: scale.id }
    );
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    });
    return rematerializeEncoding(next, id, "strokeWidth", scale.id, layer);
  }
);

export function registerRuleAppearanceEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeStroke = encodeStroke;
  ProgramClass.prototype.encodeStrokeWidth = encodeStrokeWidth;
}
