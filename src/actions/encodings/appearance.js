import { action } from "../../core/action.js";
import { validatePathSeriesAppearance } from "../../grammar/pathSeries.js";
import { assertEncodingSelectionCompatibility } from "../../materialization/selection/compatibility.js";
import {
  readNominalField,
  readQuantitativeField,
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
  applyDetachedScaleRematerialization,
  clearMarkGraphic,
  rematerializeEncoding,
  resolveReassignmentScaleOptions,
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";

const RADIUS_OPTIONS = Object.freeze(["value", "target"]);
const REMOVE_RADIUS_OPTIONS = Object.freeze(["target"]);
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

  let next = setEncodingProperties(program, target, channel, {
    field: args.field,
    fieldType,
    scale: scale.id
  });
  next = applyEncodingScale(next, scale, requestedScale, {
    reassignment: previous?.scale === scale.id
  });
  return rematerializeEncoding(next, target, channel, scale.id, layer);
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

const encodePointRadius = action(
  {
    op: "encodePointRadius",
    description: "Set a constant graphical radius on a point mark."
  },
  function (args = {}) {
    return this.encodeRadius(args);
  }
);

const removePointRadius = action(
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
        this.markConfigs[candidate.id]?.radius !== undefined,
      label: "point mark with an explicit radius"
    });
    const next = this
      ._withoutMaterializationConfig(["marks", layer.id, "radius"]);
    const baseline = clearMarkGraphic(next, layer.id);
    return baseline.rematerializePointMark({ id: layer.id });
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
    if (hasValue && (args.fieldType !== undefined || args.scale !== undefined)) {
      throw new Error("Constant opacity does not accept fieldType or scale.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["point", "rule", "line"],
      "point, rule or line mark"
    );
    if (hasValue) {
      validateOpacityValue(args.value, "encodeOpacity");
      assertEncodingSelectionCompatibility(this, target, ["opacity"]);
      const { opacity, ...config } = this.markConfigs[target] ?? {};
      void opacity;
      const withoutLegend = this.guideConfigs.legend?.opacity?.target === target
        ? this.removeOpacityLegend()
        : this;
      const next = withoutLegend
        .clearOpacityEncoding({ target })
        ._withoutMaterializationConfig(["marks", target, "opacity"])
        ._withMarkConfig(target, { ...config, opacity: args.value });
      if (layer.mark.type === "line") {
        return rematerializeEncoding(next, target, "opacity", undefined, layer);
      }
      const materialized = layer.mark.type === "rule"
        ? next.rematerializeRuleMark({ id: target })
        : next.rematerializePointMark({ id: target });
      return applyDetachedScaleRematerialization(materialized, [layer]);
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
    if (layer.mark.type === "line") {
      if (Object.hasOwn(scale, "unknown")) {
        throw new Error("Line opacity does not support unknown fallback.");
      }
      validatePathSeriesAppearance(dataset.values, {
        ...layer, encoding: { ...layer.encoding, opacity: { field: args.field, fieldType } }
      });
    }
    if (Object.hasOwn(scale, "unknown")) {
      readScaleField(dataset.values, args.field, fieldType, {
        allowUnknown: true
      });
    } else {
      readQuantitativeField(dataset.values, args.field);
    }
    const { opacity, ...config } = this.markConfigs[target] ?? {};
    void opacity;
    let next = setEncodingProperties(
      this._withoutMaterializationConfig(["marks", target, "opacity"]),
      target,
      "opacity",
      { field: args.field, fieldType, scale: scale.id }
    );
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    });
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
