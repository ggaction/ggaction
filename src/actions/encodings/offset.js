import { action } from "../../core/action.js";
import {
  readNominalField,
  validateNominalFieldType
} from "../../grammar/scales.js";
import { resolveOffsetScaleDefinition } from "../scales/definitions.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "./shared.js";
import {
  resolveBarColorLayout,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeOffsetPadding } from "../../grammar/bars/geometry.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";

const ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "paddingInner", "paddingOuter"
]);
const encodeXOffset = action(
  {
    op: "encodeXOffset",
    description: "Encode a nominal field within each ordinal x band."
  },
  function (args = {}) {
    validateOptions(args, ENCODING_OPTIONS, "encodeXOffset");
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["bar"],
      "bar mark"
    );

    if (
      resolveBarGrain(layer) === undefined ||
      layer.encoding.x.scale === undefined
    ) {
      throw new Error(
        "encodeXOffset requires a complete bar x/y encoding."
      );
    }
    if (
      layer.encoding?.color !== undefined &&
      (resolveBarColorLayout(layer) !== "group" ||
        layer.encoding.color.field !== args.field)
    ) {
      throw new Error(
        "encodeXOffset field must match a grouped bar color field."
      );
    }

    readNominalField(dataset.values, args.field);
    const requestedScale = resolveReassignmentScaleOptions(
      layer.encoding?.xOffset,
      args.scale ?? {}
    );
    const scale = resolveOffsetScaleDefinition(this, requestedScale);
    if (Object.hasOwn(scale, "unknown")) {
      throw new Error("xOffset scale unknown is not supported for grouped bars.");
    }
    const padding = normalizeOffsetPadding(
      args,
      this.markConfigs[target]?.xOffset
    );

    let next = this
      .editSemantic({
        property: `layer[${target}].encoding.xOffset.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.xOffset.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.xOffset.scale`,
        value: scale.id
      })
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        xOffset: padding
      });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: layer.encoding?.xOffset?.scale === scale.id
    });
    return applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "xOffset",
        scale: scale.id
      })
    );
  }
);

export function registerOffsetEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeXOffset = encodeXOffset;
}
