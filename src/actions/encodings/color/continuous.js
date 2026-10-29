import {
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit
} from "../../../grammar/scales/index.js";
import { validateContinuousColorConsumer } from "../../../grammar/scales/colorConsumers.js";
import { validatePathGroupAppearance } from "../../../materialization/marks/grouping.js";
import { readArcColorValues } from "../../../grammar/arcs.js";
import { validateAggregateFieldValues } from "../../../grammar/aggregate.js";
import {
  resolveQuantitativeColorScaleDefinition
} from "../../scales/definitions.js";
import {
  releaseDetachedEncodingScale,
  resolveTarget
} from "../shared.js";
import {
  applyDetachedScaleRematerialization,
  applyMaterializationPlan
} from "../../../materialization/dependencies.js";
import {
  planEncodingRematerialization
} from "../../../materialization/encodings.js";
import {
  assertNoConstantColor,
  withoutConstantColor,
  resolveColorScaleOptions,
  resolveColorReassignmentScaleOptions,
  withColorLegendReassignment
} from "./policy.js";

import { applyTemporalUnit } from "../temporal.js";
import { applyRequestedItemMissingPolicy } from
  "../../../grammar/itemMissing.js";

export function encodeContinuousColor(program, args) {
  if (!["quantitative", "temporal"].includes(args.fieldType)) {
    throw new Error(`Unsupported color field type "${args.fieldType}".`);
  }
  if (args.layout !== undefined) {
    throw new Error("Continuous color does not support layout.");
  }
  const { id: target, dataset: sourceDataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "line", "bar", "rect", "text", "area", "arc", "tick", "geo"],
    "continuous color mark"
  );
  const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
  const baseline = withoutConstantColor(program, layer);
  assertNoConstantColor(baseline, layer);
  const temporalUnit = resolveTemporalUnit(args, args.fieldType, layer.encoding?.color);
  const requestedScale = resolveColorReassignmentScaleOptions(
    program, layer, "color", args.fieldType,
    resolveColorScaleOptions(args)
  );
  const scale = resolveQuantitativeColorScaleDefinition(
    program,
    args.fieldType,
    requestedScale
  );
  const aggregate = validateContinuousColorConsumer(layer, args, scale, { inferAggregate: true });
  if (["line", "area"].includes(layer.mark.type)) {
    validatePathGroupAppearance(program, {
      ...layer, encoding: { ...layer.encoding, color: { field: args.field, fieldType: args.fieldType } }
    }, dataset);
  }
  if (layer.mark.type === "arc") {
    readArcColorValues(dataset.values, {
      ...layer, encoding: { ...layer.encoding,
        color: { field: args.field, fieldType: args.fieldType, temporalUnit } }
    });
  }
  if (aggregate !== undefined) validateAggregateFieldValues(dataset.values, args.field, args.fieldType);
  if (layer.mark.type === "rect") {
    readScaleField(dataset.values, args.field, args.fieldType, {
      allowUnknown: true, temporalUnit
    });
  } else if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, args.field, args.fieldType, {
      allowUnknown: true, temporalUnit
    });
  } else if (args.fieldType === "temporal") {
    readTemporalField(dataset.values, args.field, temporalUnit);
  } else {
    readQuantitativeField(dataset.values, args.field);
  }
  return withColorLegendReassignment(baseline, layer, scale, candidate => {
    const prepared = baseline === program ? candidate : releaseDetachedEncodingScale(candidate, scale.id);
    let next = applyTemporalUnit(prepared, target, "color", temporalUnit, layer.encoding?.color)
      .editSemantic({
        property: `layer[${target}].encoding.color.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.fieldType`,
        value: args.fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.scale`,
        value: scale.id
      });
    if (layer.mark.type === "tick") {
      const config = { ...next.markConfigs[target] };
      delete config.stroke;
      next = next._withMarkConfig(target, config);
    }
    const encoded = aggregate === undefined
      ? next
      : next.editSemantic({
          property: `layer[${target}].encoding.color.aggregate`,
          value: aggregate
        });
    const scaled = encoded.setQuantitativeColorScale(scale);
    return applyDetachedScaleRematerialization(applyMaterializationPlan(
      scaled,
      planEncodingRematerialization(scaled, {
        target,
        channel: "color",
        scale: scale.id
      })
    ), [layer]);
  });
}
