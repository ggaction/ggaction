import { action } from "../../core/action.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  validateOpacityValue
} from "../../grammar/scales.js";
import {
  resolveAppearanceScaleDefinition,
  resolveOpacityScaleDefinition
} from "../scales/definitions.js";
import { findLayer } from "../../selectors/layers.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "./shared.js";

const RADIUS_OPTIONS = Object.freeze(["value", "target"]);
const OPACITY_OPTIONS = Object.freeze([
  "value", "field", "target", "fieldType", "scale"
]);
const FIELD_OPTIONS = Object.freeze(["field", "target", "fieldType", "scale"]);
function encodeAppearanceField(program, channel, args, operation) {
  validateOptions(args, FIELD_OPTIONS, operation);
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point"],
    "point mark"
  );
  const expectedFieldType = channel === "shape" ? "nominal" : "quantitative";
  const fieldType = args.fieldType ?? expectedFieldType;
  if (fieldType !== expectedFieldType) {
    throw new Error(`${operation} requires a ${expectedFieldType} field.`);
  }
  if (channel === "size" && program.markConfigs[target]?.radius !== undefined) {
    throw new Error("encodeSize cannot be combined with a constant radius.");
  }
  const previous = layer.encoding?.[channel];
  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    args.scale ?? {}
  );
  const scale = resolveAppearanceScaleDefinition(
    program,
    channel,
    requestedScale
  );
  if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, args.field, fieldType, {
      allowUnknown: true
    });
  } else if (channel === "shape") {
    readNominalField(dataset.values, args.field);
  } else {
    readQuantitativeField(dataset.values, args.field);
  }

  let next = program
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.field`,
      value: args.field
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.scale`,
      value: scale.id
    });
  next = applyEncodingScale(next, scale, requestedScale, {
    reassignment: previous?.scale === scale.id
  });
  return applyMaterializationPlan(
    next,
    planEncodingRematerialization(next, {
      target,
      channel,
      scale: scale.id
    })
  );
}

const encodeRadius = action(
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
    if (layer.encoding?.size !== undefined) {
      throw new Error("encodeRadius cannot be combined with a size encoding.");
    }
    return this
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        radius: args.value
      })
      .rematerializePointMark({ id: target });
  }
);

const encodeSize = action(
  {
    op: "encodeSize",
    description: "Encode a quantitative field as equal-area point size."
  },
  function (args = {}) {
    return encodeAppearanceField(this, "size", args, "encodeSize");
  }
);

const encodeShape = action(
  {
    op: "encodeShape",
    description: "Encode a nominal field as point shape."
  },
  function (args = {}) {
    return encodeAppearanceField(this, "shape", args, "encodeShape");
  }
);

const clearOpacityEncoding = action(
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

const encodeOpacity = action(
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
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["point", "rule"],
      "point or rule mark"
    );
    if (hasValue) {
      validateOpacityValue(args.value, "encodeOpacity");
      const { opacity, ...config } = this.markConfigs[target] ?? {};
      void opacity;
      const withoutLegend = this.guideConfigs.legend?.opacity === undefined
        ? this
        : this.removeOpacityLegend();
      const next = withoutLegend
        .clearOpacityEncoding({ target })
        ._withoutMaterializationConfig(["marks", target, "opacity"])
        ._withMarkConfig(target, { ...config, opacity: args.value });
      return layer.mark.type === "rule"
        ? next.rematerializeRuleMark({ id: target })
        : next.rematerializePointMark({ id: target });
    }
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
    if (Object.hasOwn(scale, "unknown")) {
      readScaleField(dataset.values, args.field, fieldType, {
        allowUnknown: true
      });
    } else {
      readQuantitativeField(dataset.values, args.field);
    }
    const { opacity, ...config } = this.markConfigs[target] ?? {};
    void opacity;
    let next = this
      ._withoutMaterializationConfig(["marks", target, "opacity"])
      .editSemantic({
        property: `layer[${target}].encoding.opacity.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.opacity.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.opacity.scale`,
        value: scale.id
      })
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    });
    return applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "opacity",
        scale: scale.id
      })
    );
  }
);

export function registerAppearanceEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeRadius = encodeRadius;
  ProgramClass.prototype.encodeSize = encodeSize;
  ProgramClass.prototype.encodeShape = encodeShape;
  ProgramClass.prototype.encodeOpacity = encodeOpacity;
  ProgramClass.prototype.clearOpacityEncoding = clearOpacityEncoding;
}
