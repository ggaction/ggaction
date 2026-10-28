import { APPEARANCE_MARK_TYPES, FIXED_APPEARANCE_MARK_TYPES } from "../../core/vocabulary.js";
import { action } from "../../core/action.js";
import { validateRuleStrokeWidth } from "../../grammar/ruleAppearance.js";
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
import { applyRequestedItemMissingPolicy } from
  "../../grammar/itemMissing.js";

const WIDTH_OPTIONS = Object.freeze([
  "target", "value", "field", "fieldType", "scale"
]);

const encodeStrokeWidth = /* @__PURE__ */ action(
  {
    op: "encodeStrokeWidth",
    description: "Assign constant or field-driven mark stroke width."
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
      const { id, layer } = resolveTarget(this, args.target, FIXED_APPEARANCE_MARK_TYPES.encodeStrokeWidth, "stroked mark");
      assertEncodingSelectionCompatibility(this, id, ["strokeWidth"]);
      if (!APPEARANCE_MARK_TYPES.encodeStrokeWidth.includes(layer.mark.type)) {
        const config = { ...this.markConfigs[id] };
        const appearance = layer.mark.type === "bar" ? { ...config.barAppearance } : config;
        // Width authoring enables an absent outline; existing constant or
        // field-driven strokes keep their color and scale ownership.
        const needsStroke = !layer.encoding?.stroke && !layer.conditionals?.stroke && (appearance.stroke === false ||
          (["point", "area"].includes(layer.mark.type) && appearance.stroke === undefined));
        if (needsStroke) appearance.stroke = "#000000";
        appearance.strokeWidth = args.value;
        if (layer.mark.type === "bar") config.barAppearance = appearance;
        return rematerializeEncoding(this._withMarkConfig(id, config), id, "strokeWidth", undefined, layer);
      }
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
      if (["line", "rect"].includes(layer.mark.type)) {
        return rematerializeEncoding(next, id, "strokeWidth", undefined, layer);
      }
      next = next.rematerializeRuleMark({ id });
      return applyDetachedScaleRematerialization(next, [layer]);
    }
    const { id, dataset: sourceDataset, layer } = resolveTarget(
      this,
      args.target,
      APPEARANCE_MARK_TYPES.encodeStrokeWidth,
      "rule, line or rect mark"
    );
    const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
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
    }, this.semanticSpec.scales);
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
  ProgramClass.prototype.encodeStrokeWidth = encodeStrokeWidth;
}
