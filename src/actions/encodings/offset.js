import { action } from "../../core/action.js";
import {
  readNominalField,
  validateCategoricalFieldType
} from "../../grammar/scales/index.js";
import { resolveOffsetScaleDefinition } from "../scales/definitions.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "./shared.js";
import {
  resolveBarColorLayout,
  resolveBarChannels,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeOffsetPadding } from "../../grammar/bars/geometry.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";

const ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "paddingInner", "paddingOuter"
]);
function createOffsetEncoding(channel) {
  const operation = channel === "xOffset" ? "encodeXOffset" : "encodeYOffset";
  const parentChannel = channel === "xOffset" ? "x" : "y";
  return action(
    {
      op: operation,
      description: `Encode a categorical field within each ${parentChannel} category band.`
    },
    function (args = {}) {
      validateOptions(args, ENCODING_OPTIONS, operation);
      const fieldType = validateCategoricalFieldType(args.fieldType ?? "nominal");
      const { id: target, dataset, layer } = resolveTarget(
        this,
        args.target,
        ["bar"],
        "bar mark"
      );

      const channels = resolveBarChannels(layer);
      if (
        resolveBarGrain(layer) === undefined ||
        channels?.category !== parentChannel
      ) {
        throw new Error(
          `${operation} requires a complete bar with a ${parentChannel} category encoding.`
        );
      }
      if (
        layer.encoding?.color !== undefined &&
        (resolveBarColorLayout(layer) !== "group" ||
          layer.encoding.color.field !== args.field)
      ) {
        throw new Error(
          `${operation} field must match a grouped bar color field.`
        );
      }

      readNominalField(dataset.values, args.field);
      const requestedScale = resolveReassignmentScaleOptions(
        layer.encoding?.[channel],
        args.scale ?? {}
      );
      const scale = resolveOffsetScaleDefinition(this, requestedScale, channel);
      if (Object.hasOwn(scale, "unknown")) {
        throw new Error(
          `${channel} scale unknown is not supported for grouped bars.`
        );
      }
      const padding = normalizeOffsetPadding(
        args,
        this.markConfigs[target]?.[channel],
        channel
      );

      let next = this
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
        })
        ._withMarkConfig(target, {
          ...this.markConfigs[target],
          [channel]: padding
        });
      next = applyEncodingScale(next, scale, requestedScale, {
        reassignment: layer.encoding?.[channel]?.scale === scale.id
      });
      if (layer.encoding?.color === undefined) {
        return next
          .rematerializeScale({ id: scale.id })
          .editGraphics({ target, property: "length", value: 0 });
      }
      return applyMaterializationPlan(
        next,
        planEncodingRematerialization(next, {
          target,
          channel,
          scale: scale.id
        })
      );
    }
  );
}

const encodeXOffset = createOffsetEncoding("xOffset");
const encodeYOffset = createOffsetEncoding("yOffset");

export function registerOffsetEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeXOffset = encodeXOffset;
  ProgramClass.prototype.encodeYOffset = encodeYOffset;
}
