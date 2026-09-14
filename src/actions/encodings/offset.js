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
      const scaleOptions = {
        ...requestedScale,
        ...Object.fromEntries(
          ["paddingInner", "paddingOuter"]
            .filter(property => Object.hasOwn(args, property))
            .map(property => [property, args[property]])
        )
      };
      const scale = resolveOffsetScaleDefinition(this, scaleOptions, channel);
      if (Object.hasOwn(scale, "unknown")) {
        throw new Error(
          `${channel} scale unknown is not supported for offset positions.`
        );
      }

      const grouped = layer.mark.type === "bar" ? inferSeriesGroup(this, layer, args.field, "offset") : this;
      let next = setEncodingProperties(grouped, target, channel, {
        field: args.field,
        fieldType,
        scale: scale.id
      });
      next = applyEncodingScale(next, scale, {
        ...Object.fromEntries(Object.entries(scaleOptions).filter(
          ([property]) => property !== "range"
        )),
        paddingInner: scale.paddingInner,
        paddingOuter: scale.paddingOuter,
        align: scale.align
      }, {
        reassignment: findSemanticScale(this, scale.id) !== undefined
      });
      next = next._withoutMaterializationConfig(["marks", target, channel]);
      if (layer.mark.type === "bar") {
        if (findSemanticScale(this, scale.id) === undefined && args.scale?.id === undefined) next = next._withMarkConfig(target, { ...next.markConfigs[target], seriesOffsetScale: scale.id });
        if (layer.layout?.mode !== "group" || layer.encoding?.group?.field !== args.field) return next.layoutSeries({ target, mode: "group" });
        return rematerializeEncoding(next, target, channel, scale.id, layer);
      }
      return rematerializeEncoding(next, target, channel, scale.id, layer);
    }
  );
}

const encodeXOffset = /* @__PURE__ */ createOffsetEncoding("xOffset");
const encodeYOffset = /* @__PURE__ */ createOffsetEncoding("yOffset");

export function registerOffsetEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeXOffset = encodeXOffset;
  ProgramClass.prototype.encodeYOffset = encodeYOffset;
}
