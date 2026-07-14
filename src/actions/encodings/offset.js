import { action } from "../../core/action.js";
import {
  readNominalField,
  validateNominalFieldType
} from "../../grammar/scales.js";
import { resolveOffsetScaleDefinition } from "../scales/definitions.js";
import { resolveTarget, validateOptions } from "./shared.js";
import { isAggregate } from "../../grammar/aggregate.js";

const ENCODING_OPTIONS = Object.freeze(["field", "target", "fieldType", "scale"]);
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
      layer.encoding?.x?.fieldType !== "ordinal" ||
      layer.encoding.x.scale === undefined ||
      !isAggregate(layer.encoding?.y?.aggregate) ||
      layer.encoding.y.stack !== null
    ) {
      throw new Error(
        "encodeXOffset requires an ordinal x and aggregate/non-stacked y bar encoding."
      );
    }

    readNominalField(dataset.values, args.field);
    const scale = resolveOffsetScaleDefinition(this, args.scale ?? {});

    return this
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
      .createScale(scale)
      .rematerializeScale({ id: scale.id });
  }
);

export function registerOffsetEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeXOffset = encodeXOffset;
}
