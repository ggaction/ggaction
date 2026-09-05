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
import { validatePathSeriesAppearance } from "../../grammar/pathSeries.js";
import { assertEncodingSelectionCompatibility } from "../../materialization/selection/compatibility.js";

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
    description: "Assign constant or field-driven line or rule stroke width."
  },
  function (args = {}) {
    validateOptions(args, WIDTH_OPTIONS, "encodeStrokeWidth");
    const hasValue = Object.hasOwn(args, "value");
    const hasField = Object.hasOwn(args, "field");
    if (hasValue === hasField) {
      throw new Error("encodeStrokeWidth requires exactly one of value or field.");
    }
    if (hasValue) {
      if (args.fieldType !== undefined || args.scale !== undefined) {
        throw new Error("Constant stroke width does not accept fieldType or scale.");
      }
      validateRuleStrokeWidth(args.value);
      const { id, layer } = resolveTarget(this, args.target, ["rule", "line"], "rule or line mark");
      assertEncodingSelectionCompatibility(this, id, ["strokeWidth"]);
      let next = this.guideConfigs.legend?.strokeWidth?.target === id
        ? this.removeLegend({ target: id, channels: ["strokeWidth"] })
        : this;
      if (findLayer(next, id)?.encoding?.strokeWidth !== undefined) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.strokeWidth`,
          remove: true
        });
      }
      next = next._withMarkConfig(id, {
          ...next.markConfigs[id],
          strokeWidth: args.value
        });
      if (layer.mark.type === "line") {
        return rematerializeEncoding(next, id, "strokeWidth", undefined, layer);
      }
      next = next.rematerializeRuleMark({ id });
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
    validatePathSeriesAppearance(dataset.values, {
      ...layer, encoding: { ...layer.encoding, strokeWidth: { field: args.field, fieldType } }
    });
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
