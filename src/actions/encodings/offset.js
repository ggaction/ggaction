import { inferSeriesGroup } from "./shared.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { action } from "../../core/action.js";
import {
  readNominalField,
  validateCategoricalFieldType
} from "../../grammar/scales/index.js";
import { resolveOffsetScaleDefinition } from "../scales/definitions.js";
import {
  applyEncodingScale,
  rematerializeEncoding,
  resolveReassignmentScaleOptions,
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";
import {
  resolveBarChannels,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeOffsetPadding } from "../../grammar/bars/geometry.js";

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
        ["bar", "point", "rule"],
        "offset-compatible mark"
      );

      if (layer.mark.type === "bar") {
        const channels = resolveBarChannels(layer);
        if (
          resolveBarGrain(layer) === undefined ||
          channels?.category !== parentChannel
        ) {
          throw new Error(
            `${operation} requires a complete bar with a ${parentChannel} category encoding.`
          );
        }

      } else {
        const parent = layer.encoding?.[parentChannel];
        if (
          parent === undefined ||
          !["nominal", "ordinal"].includes(parent.fieldType)
        ) {
          throw new Error(
            `${operation} requires a ${parentChannel} category encoding (categorical position).`
          );
        }
      }

      readNominalField(dataset.values, args.field);
      const requestedScale = resolveReassignmentScaleOptions(
        layer.encoding?.[channel],
        args.scale ?? {}
      );
      const scale = resolveOffsetScaleDefinition(this, requestedScale, channel);
      if (Object.hasOwn(scale, "unknown")) {
        throw new Error(
          `${channel} scale unknown is not supported for offset positions.`
        );
      }
      const padding = normalizeOffsetPadding(
        args,
        this.markConfigs[target]?.[channel],
        channel
      );

      const grouped = layer.mark.type === "bar" ? inferSeriesGroup(this, layer, args.field, "offset") : this;
      let next = setEncodingProperties(grouped, target, channel, {
        field: args.field,
        fieldType,
        scale: scale.id
      })._withMarkConfig(target, {
          ...this.markConfigs[target],
          [channel]: padding
        });
      next = applyEncodingScale(next, scale, requestedScale, {
        reassignment: layer.encoding?.[channel]?.scale === scale.id
      });
      if (layer.mark.type === "bar") {
        if (findSemanticScale(this, scale.id) === undefined && args.scale?.id === undefined) next = next._withMarkConfig(target, { ...next.markConfigs[target], seriesOffsetScale: scale.id });
        if (layer.layout?.mode !== "group" || layer.encoding?.group?.field !== args.field) return next.layoutSeries({ target, mode: "group" });
        return rematerializeEncoding(next, target, channel, scale.id, layer);
      }
      return rematerializeEncoding(next, target, channel, scale.id, layer);
    }
  );
}

const encodeXOffset = createOffsetEncoding("xOffset");
const encodeYOffset = createOffsetEncoding("yOffset");

export function registerOffsetEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeXOffset = encodeXOffset;
  ProgramClass.prototype.encodeYOffset = encodeYOffset;
}
