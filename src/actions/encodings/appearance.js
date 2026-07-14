import { action } from "../../core/action.js";
import {
  readNominalField,
  readQuantitativeField
} from "../../grammar/scales.js";
import { resolveAppearanceScaleDefinition } from "../scales/definitions.js";
import { findLayer } from "../../selectors/layers.js";
import {
  applyEncodingScale,
  rematerializeExistingLegend,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "./shared.js";

const RADIUS_OPTIONS = Object.freeze(["value", "target"]);
const OPACITY_OPTIONS = Object.freeze(["value", "target"]);
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
  if (channel === "shape") readNominalField(dataset.values, args.field);
  else readQuantitativeField(dataset.values, args.field);
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
  })
    .rematerializeScale({ id: scale.id })
    .rematerializePointMark({ id: target });
  return rematerializeExistingLegend(next);
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

const encodeOpacity = action(
  {
    op: "encodeOpacity",
    description: "Set a constant graphical opacity on a point mark."
  },
  function (args = {}) {
    validateOptions(args, OPACITY_OPTIONS, "encodeOpacity");
    const { id: target } = resolveTarget(
      this,
      args.target,
      ["point"],
      "point mark"
    );
    if (!Number.isFinite(args.value) || args.value < 0 || args.value > 1) {
      throw new RangeError("encodeOpacity requires a finite value from 0 to 1.");
    }
    return this
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        opacity: args.value
      })
      .rematerializePointMark({ id: target });
  }
);

export function registerAppearanceEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeRadius = encodeRadius;
  ProgramClass.prototype.encodeSize = encodeSize;
  ProgramClass.prototype.encodeShape = encodeShape;
  ProgramClass.prototype.encodeOpacity = encodeOpacity;
}
