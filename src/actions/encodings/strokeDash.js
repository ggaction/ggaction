import { action } from "../../core/action.js";
import {
  normalizeStrokeDashPattern,
  readNominalField,
  validateNominalFieldType
} from "../../grammar/scales/index.js";
import { resolveStrokeDashScaleDefinition } from "../scales/definitions.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateLineSeriesCompatibility,
  validateOptions
} from "./shared.js";
import { findLayer } from "../../selectors/layers.js";

const STROKE_DASH_ENCODING_OPTIONS = Object.freeze([
  "field", "value", "target", "fieldType", "scale"
]);

const clearStrokeDashEncoding = action(
  {
    op: "clearStrokeDashEncoding",
    description: "Remove the current semantic stroke-dash assignment."
  },
  function ({ target } = {}) {
    const layer = findLayer(this, target);
    if (layer?.encoding?.strokeDash === undefined) return this;
    return this.editSemantic({
      property: `layer[${target}].encoding.strokeDash`,
      remove: true
    });
  }
);

function reconcileLegendAfterDashRemoval(program, target) {
  const config = program.guideConfigs.legend?.series;
  if (
    config?.target !== target ||
    !config.channels.includes("strokeDash")
  ) {
    return program;
  }
  const layer = findLayer(program, target);
  const channels = config.channels.filter(
    channel =>
      channel !== "strokeDash" &&
      layer.encoding?.[channel]?.scale !== undefined
  );
  if (channels.length === 0) return program.removeCategoricalLegend();
  return program
    .editSemantic({
      property: "guide.legend.series.channels",
      value: channels
    })
    .rematerializeLegend();
}

const encodeStrokeDash = action(
  {
    op: "encodeStrokeDash",
    description: "Encode a nominal field as line stroke dash."
  },
  function (args = {}) {
    validateOptions(args, STROKE_DASH_ENCODING_OPTIONS, "encodeStrokeDash");
    const hasField = Object.hasOwn(args, "field");
    const hasValue = Object.hasOwn(args, "value");
    if (hasField === hasValue) {
      throw new Error("encodeStrokeDash requires exactly one of field or value.");
    }
    if (hasValue && (args.fieldType !== undefined || args.scale !== undefined)) {
      throw new Error("Constant stroke dash does not accept fieldType or scale.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["line", "rule"],
      "line or rule mark"
    );
    if (hasValue) {
      normalizeStrokeDashPattern(args.value);
      let next = layer.encoding?.strokeDash === undefined
        ? this
        : this.clearStrokeDashEncoding({ target });
      next = next.editSemantic({
        property: `layer[${target}].encoding.strokeDash.datum`,
        value: args.value
      });
      next = reconcileLegendAfterDashRemoval(next, target);
      return layer.mark.type === "rule"
        ? next.rematerializeRuleMark({ id: target })
        : next.rematerializeLineMark({ id: target });
    }

    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    validateLineSeriesCompatibility(layer, "strokeDash", args.field);
    const previous = layer.encoding?.strokeDash;
    const requestedScale = previous?.field === args.field
      ? resolveReassignmentScaleOptions(previous, args.scale ?? {})
      : args.scale ?? {};
    const scale = resolveStrokeDashScaleDefinition(this, requestedScale);
    if (Object.hasOwn(scale, "unknown")) {
      throw new Error(
        "StrokeDash scale unknown is not supported for grouped line or rule paths."
      );
    }
    readNominalField(dataset.values, args.field);

    let next = previous === undefined
      ? this
      : this.clearStrokeDashEncoding({ target });
    next = next
      .editSemantic({
        property: `layer[${target}].encoding.strokeDash.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.strokeDash.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.strokeDash.scale`,
        value: scale.id
      });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    });

    return applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "strokeDash",
        scale: scale.id
      })
    );
  }
);

export function registerStrokeDashEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeStrokeDash = encodeStrokeDash;
  ProgramClass.prototype.clearStrokeDashEncoding = clearStrokeDashEncoding;
}
