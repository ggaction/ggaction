import { action } from "../../core/action.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit,
  validateCategoricalFieldType
} from "../../grammar/scales/index.js";
import { validateContinuousColorConsumer } from
  "../../grammar/scales/colorConsumers.js";
import { validatePathSeriesAppearance } from "../../grammar/pathSeries.js";
import { validateRuleStroke } from "../../grammar/ruleAppearance.js";
import { assertEncodingSelectionCompatibility } from
  "../../materialization/selection/compatibility.js";
import {
  resolveColorScaleDefinition,
  resolveQuantitativeColorScaleDefinition
} from "../scales/definitions.js";
import { applyTemporalUnit } from "./temporal.js";
import {
  applyEncodingScale,
  rematerializeEncoding,
  resolveReassignmentScaleOptions,
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";
import { applyRequestedItemMissingPolicy } from
  "../../grammar/itemMissing.js";

const OPTIONS = Object.freeze([
  "target", "value", "field", "fieldType", "temporalUnit", "scale"
]);
const MARK_TYPES = Object.freeze([
  "point", "line", "area", "bar", "rect", "arc", "rule", "tick"
]);

function withoutConstantStroke(program, layer) {
  const config = { ...program.markConfigs[layer.id] };
  if (layer.mark.type === "bar") {
    const appearance = { ...config.barAppearance };
    delete appearance.stroke;
    config.barAppearance = appearance;
  } else {
    delete config.stroke;
    if (layer.mark.type === "area") delete config.strokeFromFill;
  }
  return program._withMarkConfig(layer.id, config);
}

function withConstantStroke(program, layer, value) {
  const config = { ...program.markConfigs[layer.id] };
  if (layer.mark.type === "bar") {
    const appearance = { ...config.barAppearance, stroke: value };
    if (config.barAppearance?.stroke === false && appearance.strokeWidth === undefined) {
      appearance.strokeWidth = 0.5;
    }
    config.barAppearance = appearance;
  } else {
    const restores = config.stroke === false;
    config.stroke = value;
    if (layer.mark.type === "area") delete config.strokeFromFill;
    if (
      (restores || ["point", "area"].includes(layer.mark.type)) &&
      config.strokeWidth === undefined
    ) {
      config.strokeWidth = 1;
    }
  }
  return program._withMarkConfig(layer.id, config);
}

function hasStrokeLegend(program, target) {
  return Object.values(program.guideConfigs.legend ?? {}).some(config =>
    config?.target === target && (
      config.channel === "stroke" || config.channels?.includes("stroke")
    )
  );
}

function validateStrokeField(dataset, layer, args, scale, temporalUnit) {
  const { field, fieldType } = args;
  validateContinuousColorConsumer(layer, args, scale, { channel: "stroke" });
  if (["line", "area"].includes(layer.mark.type)) {
    validatePathSeriesAppearance(dataset.values, {
      ...layer,
      encoding: {
        ...layer.encoding,
        stroke: { field, fieldType, temporalUnit, scale: scale.id }
      }
    });
  }
  if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, field, fieldType, {
      allowUnknown: true,
      temporalUnit
    });
  } else if (fieldType === "temporal") {
    readTemporalField(dataset.values, field, temporalUnit);
  } else {
    readQuantitativeField(dataset.values, field);
  }
}

export const encodeStroke = /* @__PURE__ */ action(
  {
    op: "encodeStroke",
    description: "Assign constant or field-driven graphical stroke color."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeStroke");
    const hasValue = Object.hasOwn(args, "value");
    const hasField = Object.hasOwn(args, "field");
    if (hasValue === hasField) {
      throw new Error("encodeStroke requires exactly one of value or field.");
    }
    if (hasValue && (
      args.fieldType !== undefined ||
      args.temporalUnit !== undefined ||
      args.scale !== undefined
    )) {
      throw new Error(
        "Constant stroke does not accept fieldType, temporalUnit, or scale."
      );
    }
    const { id: target, dataset: sourceDataset, layer } = resolveTarget(
      this,
      args.target,
      MARK_TYPES,
      "stroke-capable mark"
    );

    if (hasValue) {
      const value = validateRuleStroke(args.value);
      if (
        layer.mark.type === "rule" &&
        layer.encoding?.stroke === undefined &&
        !hasStrokeLegend(this, target)
      ) {
        return this
          ._withMarkConfig(target, { ...this.markConfigs[target], stroke: value })
          .rematerializeRuleMark({ id: target });
      }
      assertEncodingSelectionCompatibility(this, target, ["stroke"]);
      let next = hasStrokeLegend(this, target)
        ? this.removeLegend({ target, channels: ["stroke"] })
        : this;
      if (layer.encoding?.stroke !== undefined) {
        next = next.editSemantic({
          property: `layer[${target}].encoding.stroke`,
          remove: true
        });
      }
      next = withConstantStroke(next, layer, value);
      return rematerializeEncoding(next, target, "stroke", undefined, layer);
    }

    const fieldType = args.fieldType ?? "nominal";
    const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
    const previous = layer.encoding?.stroke;
    const temporalUnit = resolveTemporalUnit(args, fieldType, previous);
    const requestedScale = resolveReassignmentScaleOptions(
      previous,
      args.scale ?? {}
    );
    let scale;
    if (["nominal", "ordinal"].includes(fieldType)) {
      validateCategoricalFieldType(fieldType);
      if (temporalUnit !== undefined) {
        throw new Error("Categorical stroke does not support temporalUnit.");
      }
      scale = resolveColorScaleDefinition(this, requestedScale, "stroke");
      if (Object.hasOwn(scale, "unknown")) {
        readScaleField(dataset.values, args.field, fieldType, {
          allowUnknown: true
        });
      } else {
        readNominalField(dataset.values, args.field);
      }
      if (["line", "area"].includes(layer.mark.type)) {
        validatePathSeriesAppearance(dataset.values, {
          ...layer,
          encoding: {
            ...layer.encoding,
            stroke: {
              field: args.field,
              fieldType,
              scale: scale.id
            }
          }
        });
      }
    } else if (["quantitative", "temporal"].includes(fieldType)) {
      scale = resolveQuantitativeColorScaleDefinition(
        this,
        fieldType,
        requestedScale,
        "stroke"
      );
      validateStrokeField(
        dataset,
        layer,
        { ...args, fieldType },
        scale,
        temporalUnit
      );
    } else {
      throw new Error(`Unsupported stroke field type "${fieldType}".`);
    }

    let next = withoutConstantStroke(this, layer);
    next = applyTemporalUnit(next, target, "stroke", temporalUnit, previous);
    next = setEncodingProperties(next, target, "stroke", {
      field: args.field,
      fieldType,
      scale: scale.id
    });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id,
      allowTypeChange: true
    });
    return rematerializeEncoding(next, target, "stroke", scale.id, layer);
  }
);

export function registerStrokeEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeStroke = encodeStroke;
}
