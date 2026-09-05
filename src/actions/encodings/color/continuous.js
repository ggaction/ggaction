import {
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit
} from "../../../grammar/scales/index.js";
import { validateContinuousColorConsumer } from "../../../grammar/scales/colorConsumers.js";
import { validateAggregateFieldValues } from "../../../grammar/aggregate.js";
import {
  resolveQuantitativeColorScaleDefinition
} from "../../scales/definitions.js";
import {
  resolveReassignmentScaleOptions,
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
  resolveColorScaleOptions
} from "./policy.js";

import { applyTemporalUnit } from "../temporal.js";

export function encodeContinuousColor(program, args) {
  if (!["quantitative", "temporal"].includes(args.fieldType)) {
    throw new Error(`Unsupported color field type "${args.fieldType}".`);
  }
  if (args.layout !== undefined) {
    throw new Error("Continuous color does not support layout.");
  }
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "bar", "rect"],
    "continuous color mark"
  );
  assertNoConstantColor(program, layer);
  const temporalUnit = resolveTemporalUnit(args, args.fieldType, layer.encoding?.color);
  const requestedScale = resolveReassignmentScaleOptions(
    layer.encoding?.color,
    resolveColorScaleOptions(args)
  );
  const scale = resolveQuantitativeColorScaleDefinition(
    program,
    args.fieldType,
    requestedScale
  );
  const aggregate = validateContinuousColorConsumer(layer, args, scale, { inferAggregate: true });
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
  const next = applyTemporalUnit(program, target, "color", temporalUnit, layer.encoding?.color)
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
}
