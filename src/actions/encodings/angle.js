import { action } from "../../core/action.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import {
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";

const OPTIONS = Object.freeze(["target", "value", "field", "fieldType"]);

function rematerialize(program, layer, target) {
  return layer.mark.type === "tick"
    ? program.rematerializeTickMark({ id: target })
    : program.rematerializePointMark({ id: target });
}

export const encodeAngle = action(
  {
    op: "encodeAngle",
    description: "Assign direct clockwise degree rotation to point or Tick glyphs."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeAngle");
    const hasValue = Object.hasOwn(args, "value");
    const hasField = Object.hasOwn(args, "field");
    if (hasValue === hasField) {
      throw new Error("encodeAngle requires exactly one of value or field.");
    }
    if (hasValue && args.fieldType !== undefined) {
      throw new Error("Constant angle does not accept fieldType.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["point", "tick"],
      "point or Tick mark"
    );
    if (hasValue && !Number.isFinite(args.value)) {
      throw new TypeError("encodeAngle value must be finite degrees.");
    }
    if (hasField) {
      const fieldType = args.fieldType ?? "quantitative";
      if (fieldType !== "quantitative") {
        throw new Error("encodeAngle requires a quantitative field.");
      }
      readQuantitativeField(dataset.values, args.field);
    }

    const previous = layer.encoding?.angle;
    let next = this;
    for (const property of ["datum", "field", "fieldType"]) {
      if (Object.hasOwn(previous ?? {}, property)) {
        next = next.editSemantic({
          property: `layer[${target}].encoding.angle.${property}`,
          remove: true
        });
      }
    }
    if (hasValue) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.angle.datum`,
        value: args.value
      });
    } else {
      next = setEncodingProperties(next, target, "angle", {
        field: args.field,
        fieldType: "quantitative"
      });
    }
    return rematerialize(next, layer, target);
  }
);

export function registerAngleEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeAngle = encodeAngle;
}
