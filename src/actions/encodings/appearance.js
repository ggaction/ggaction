import { validatePointShape } from "../../grammar/pointShapes.js";
import { APPEARANCE_MARK_TYPES } from "../../core/vocabulary.js";
import { removeEncoding } from "./remove.js";
import { canMaterializeBar } from "../../materialization/marks/index.js";
import { action } from "../../core/action.js";
import { validatePathSeriesAppearance } from "../../grammar/pathSeries.js";
import { validatePathGroupAppearance } from "../../materialization/marks/grouping.js";
import { assertEncodingSelectionCompatibility } from "../../materialization/selection/compatibility.js";
import {
  readScaleField,
  validateOpacityValue
} from "../../grammar/scales/index.js";
import {
  resolveAppearanceScaleDefinition,
  resolveOpacityScaleDefinition
} from "../scales/definitions.js";
import {
  findLayer,
  resolveEligibleLayer
} from "../../selectors/layers.js";
import {
  applyEncodingScale,
  releaseDetachedEncodingScale,
  applyDetachedScaleRematerialization,
  clearMarkGraphic,
  rematerializeEncoding,
  resolveReassignmentScaleOptions,
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";
import { applyRequestedItemMissingPolicy } from
  "../../grammar/itemMissing.js";

const RADIUS_OPTIONS = Object.freeze(["value", "target"]);
const REMOVE_RADIUS_OPTIONS = Object.freeze(["target"]);
const OPACITY_OPTIONS = Object.freeze([
  "value", "field", "target", "fieldType", "scale"
]);
const FIELD_OPTIONS = Object.freeze(["field", "target", "fieldType", "scale"]);
function encodeAppearanceField(program, channel, args, operation) {
  validateOptions(args, FIELD_OPTIONS, operation);
  const { id: target, dataset: sourceDataset, layer } = resolveTarget(
    program,
    args.target,
    APPEARANCE_MARK_TYPES[operation],
    "point mark"
  );
  const fieldTypes = channel === "shape" ? ["nominal"] : ["quantitative", "nominal", "ordinal"];
  const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
  const fieldType = args.fieldType ?? fieldTypes[0];
  if (!fieldTypes.includes(fieldType)) {
    throw new Error(`${operation} requires a ${fieldTypes.join(" or ")} field.`);
  }

  const previous = layer.encoding?.[channel];
  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    args.scale ?? {}
  );
  const scale = resolveAppearanceScaleDefinition(
    program,
    channel,
    requestedScale,
    fieldType
  );
  readScaleField(dataset.values, args.field, fieldType, {
    allowUnknown: Object.hasOwn(scale, "unknown")
  });

  if (channel === "size" && layer.conditionals?.pointRadius !== undefined) program = program.editSemantic({ property: `layer[${target}].conditionals.pointRadius`, remove: true });
  const baseline = channel === "size"
    ? program._withoutMaterializationConfig(["marks", target, "radius"])
    : program;
  const prepared = channel === "size" && program.markConfigs[target]?.radius !== undefined
    ? releaseDetachedEncodingScale(baseline, scale.id) : baseline;
  let next = setEncodingProperties(prepared, target, channel, {
    field: args.field,
    fieldType,
    scale: scale.id
  });
  next = applyEncodingScale(next, scale, requestedScale, {
    reassignment: previous?.scale === scale.id
  });
  return rematerializeEncoding(next, target, channel, scale.id, layer);
}

const encodeRadius = /* @__PURE__ */ action(
  {
    op: "encodeRadius",
    description: "Set a constant graphical radius on a point mark."
  },
  function (args = {}) {
    validateOptions(args, RADIUS_OPTIONS, "encodeRadius");
    const { id: target } = resolveTarget(
      this,
      args.target,
      ["point"],
      "point mark"
    );

    if (!Number.isFinite(args.value) || args.value < 0) {
      throw new RangeError(
        "encodeRadius requires a non-negative finite value."
      );
    }

    const layer = findLayer(this, target);
    if (layer.encoding?.size !== undefined || layer.conditionals?.size !== undefined) {
      throw new Error("encodeRadius cannot be combined with a size encoding.");
    }
    const baseline = layer.conditionals?.pointRadius === undefined ? this : this.editSemantic({ property: `layer[${target}].conditionals.pointRadius`, remove: true });
    return baseline
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        radius: args.value
      })
      .rematerializePointMark({ id: target });
  }
);

const encodePointRadius = /* @__PURE__ */ action(
  {
    op: "encodePointRadius",
    description: "Set a constant graphical radius on a point mark."
  },
  function (args = {}) {
    return this.encodeRadius(args);
  }
);

const removePointRadius = /* @__PURE__ */ action(
  {
    op: "removePointRadius",
    description: "Remove a constant point radius and restore the theme default."
  },
  function (args = {}) {
    validateOptions(args, REMOVE_RADIUS_OPTIONS, "removePointRadius");
    const requested = args.target === undefined
      ? undefined
      : args.target;
    const layer = resolveEligibleLayer(this, {
      target: requested,
      predicate: candidate =>
        candidate.mark?.type === "point" &&
        (this.markConfigs[candidate.id]?.radius !== undefined || candidate.conditionals?.pointRadius !== undefined),
      label: "point mark with an explicit radius"
    });
    const without = layer.conditionals?.pointRadius === undefined ? this : this.editSemantic({ property: `layer[${layer.id}].conditionals.pointRadius`, remove: true });
    const next = without._withoutMaterializationConfig(["marks", layer.id, "radius"]);
    const baseline = clearMarkGraphic(next, layer.id);
    return baseline.rematerializePointMark({ id: layer.id });
  }
);

const encodeSize = /* @__PURE__ */ action(
  {
    op: "encodeSize",
    description: "Assign constant or field-driven equal-area point size."
  },
  function (args = {}) {
    validateOptions(args, [...FIELD_OPTIONS, "value"], "encodeSize");
    const hasValue = Object.hasOwn(args, "value");
    if (hasValue === Object.hasOwn(args, "field")) {
      throw new Error("encodeSize requires exactly one of value or field.");
    }
    if (hasValue) {
      if (args.fieldType !== undefined || args.scale !== undefined) {
        throw new Error("Constant size does not accept fieldType or scale.");
      }
      if (!Number.isFinite(args.value) || args.value < 0) {
        throw new RangeError("encodeSize requires a non-negative finite area.");
      }
      const { id: target, layer } = resolveTarget(this, args.target, APPEARANCE_MARK_TYPES.encodeSize, "point mark");
      const next = layer.encoding?.size === undefined ? this
        : removeEncoding.call(this, { target, channel: "size" });
      return next.encodeRadius({ target, value: Math.sqrt(args.value / Math.PI) });
    }
    return encodeAppearanceField(this, "size", args, "encodeSize");
  }
);

const encodeShape = /* @__PURE__ */ action(
  {
    op: "encodeShape",
    description: "Assign constant or field-driven point shape."
  },
  function (args = {}) {
    validateOptions(args, [...FIELD_OPTIONS, "value"], "encodeShape");
    const hasValue = Object.hasOwn(args, "value");
    if (hasValue === Object.hasOwn(args, "field")) {
      throw new Error("encodeShape requires exactly one of value or field.");
    }
    if (hasValue) {
      if (args.fieldType !== undefined || args.scale !== undefined) {
        throw new Error("Constant shape does not accept fieldType or scale.");
      }
      const shape = validatePointShape(args.value);
      const { id: target, layer } = resolveTarget(this, args.target, APPEARANCE_MARK_TYPES.encodeShape, "point mark");
      const next = layer.encoding?.shape === undefined ? this
        : removeEncoding.call(this, { target, channel: "shape" });
      return next.editPointMark({ target, shape });
    }
    return encodeAppearanceField(this, "shape", args, "encodeShape");
  }
);

const clearOpacityEncoding = /* @__PURE__ */ action(
  {
    op: "clearOpacityEncoding",
    description: "Remove the semantic field-driven opacity assignment."
  },
  function ({ target } = {}) {
    const layer = findLayer(this, target);
    if (layer?.encoding?.opacity === undefined) return this;
    return this.editSemantic({
      property: `layer[${target}].encoding.opacity`,
      remove: true
    });
  }
);

function withoutConstantOpacity(program, target) {
  const { opacity, ...config } = program.markConfigs[target] ?? {};
  void opacity;
  if (config.barAppearance?.opacity !== undefined) {
    const { opacity: barOpacity, ...appearance } = config.barAppearance;
    void barOpacity;
    config.barAppearance = appearance;
  }
  return program._withMarkConfig(target, config);
}

const encodeOpacity = /* @__PURE__ */ action(
  {
    op: "encodeOpacity",
    description: "Assign constant or field-driven mark opacity."
  },
  function (args = {}) {
    validateOptions(args, OPACITY_OPTIONS, "encodeOpacity");
    const hasValue = Object.hasOwn(args, "value");
    const hasField = Object.hasOwn(args, "field");
    if (hasValue === hasField) {
      throw new Error("encodeOpacity requires exactly one of value or field.");
    }
    if (hasValue && (args.fieldType !== undefined || args.scale !== undefined)) {
      throw new Error("Constant opacity does not accept fieldType or scale.");
    }
    const { id: target, dataset: sourceDataset, layer } = resolveTarget(
      this,
      args.target,
      APPEARANCE_MARK_TYPES.encodeOpacity,
      "point, rule, line, area, bar or rect mark"
    );
    if (hasValue) {
      validateOpacityValue(args.value, "encodeOpacity");
      assertEncodingSelectionCompatibility(this, target, ["opacity"]);
      const config = withoutConstantOpacity(this, target).markConfigs[target];
      const withoutLegend = this.guideConfigs.legend?.opacity?.target === target
        ? this.removeOpacityLegend()
        : this;
      const next = withoutLegend
        .clearOpacityEncoding({ target })
        ._withoutMaterializationConfig(["marks", target, "opacity"])
        ._withMarkConfig(target, { ...config, opacity: args.value });
      if (["line", "area", "rect"].includes(layer.mark.type)) {
        return rematerializeEncoding(next, target, "opacity", undefined, layer);
      }
      if (layer.mark.type === "bar") {
        return canMaterializeBar(next, findLayer(next, target))
          ? applyDetachedScaleRematerialization(next.rematerializeBarMark({ id: target }), [layer])
          : next;
      }
      const materialized = layer.mark.type === "rule"
        ? next.rematerializeRuleMark({ id: target })
        : next.rematerializePointMark({ id: target });
      return applyDetachedScaleRematerialization(materialized, [layer]);
    }
    const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
    const fieldType = args.fieldType ?? "quantitative";
    if (fieldType !== "quantitative") {
      throw new Error("encodeOpacity requires a quantitative field.");
    }
    const previous = layer.encoding?.opacity;
    const requestedScale = resolveReassignmentScaleOptions(
      previous,
      args.scale ?? {}
    );
    const scale = resolveOpacityScaleDefinition(this, requestedScale);
    if (["line", "area", "rect"].includes(layer.mark.type)) {
      if (Object.hasOwn(scale, "unknown")) {
        throw new Error("Line, Area and Rect opacity do not support unknown fallback.");
      }
      const prospective = {
        ...layer, encoding: { ...layer.encoding, opacity: { field: args.field, fieldType } }
      };
      if (layer.mark.type === "area") validatePathGroupAppearance(this, prospective, dataset);
      else validatePathSeriesAppearance(dataset.values, prospective, this.semanticSpec.scales);
    }
    readScaleField(dataset.values, args.field, fieldType, {
      allowUnknown: Object.hasOwn(scale, "unknown")
    });
    const { opacity, ...config } = this.markConfigs[target] ?? {};
    void opacity;
    let next = setEncodingProperties(
      this.markConfigs[target]?.opacity !== undefined || this.markConfigs[target]?.barAppearance?.opacity !== undefined
        ? releaseDetachedEncodingScale(withoutConstantOpacity(this, target), scale.id)
        : withoutConstantOpacity(this, target),
      target,
      "opacity",
      { field: args.field, fieldType, scale: scale.id }
    );
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    });
    if (layer.mark.type === "bar" && !canMaterializeBar(next, findLayer(next, target))) {
      return next.rematerializeScale({ id: scale.id });
    }
    return rematerializeEncoding(next, target, "opacity", scale.id, layer);
  }
);

export function registerBasicAppearanceEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeSize = encodeSize;
  ProgramClass.prototype.encodeShape = encodeShape;
  ProgramClass.prototype.encodeRadius = encodeRadius;
  ProgramClass.prototype.encodePointRadius = encodePointRadius;
}

export function registerAppearanceEncodingAction(ProgramClass) {
  registerBasicAppearanceEncodingActions(ProgramClass);
  ProgramClass.prototype.removePointRadius = removePointRadius;
  ProgramClass.prototype.encodeOpacity = encodeOpacity;
  ProgramClass.prototype.clearOpacityEncoding = clearOpacityEncoding;
}
