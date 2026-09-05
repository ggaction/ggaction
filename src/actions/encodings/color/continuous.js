import {
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit
} from "../../../grammar/scales/index.js";
import {
  BAR_GRAINS,
  resolveBarChannels,
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import {
  validateAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues
} from "../../../grammar/aggregate.js";
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
  if (Object.hasOwn(scale, "unknown") && layer.mark.type !== "point") {
    throw new Error(
      "Continuous color scale unknown currently requires a row-owned point mark."
    );
  }
  if (
    layer.mark.type === "bar" &&
    ["nominal", "ordinal"].includes(layer.encoding?.color?.fieldType)
  ) {
    throw new Error(
      "Continuous bar color cannot replace an existing nominal color layout."
    );
  }
  let aggregate;
  if (["point", "rect"].includes(layer.mark.type)) {
    if (args.aggregate !== undefined) {
      throw new Error(`${layer.mark.type} continuous color does not support aggregate.`);
    }
  } else {
    if (args.fieldType !== "quantitative") {
      throw new Error("Aggregate bar color currently requires a quantitative field.");
    }
    if (resolveBarGrain(layer) !== BAR_GRAINS.aggregate) {
      throw new Error(
        "Continuous bar color requires a complete categorical aggregate bar."
      );
    }
    const channels = resolveBarChannels(layer);
    const measure = layer.encoding?.[channels.measure];
    aggregate = args.aggregate ?? (
      measure?.field === args.field ? measure.aggregate : undefined
    );
    if (aggregate === undefined) {
      throw new Error(
        "Continuous bar color requires aggregate when its field differs from the measure field."
      );
    }
    aggregate = validateAggregate(aggregate);
    validateAggregateFieldType(aggregate, args.fieldType);
    validateAggregateFieldValues(dataset.values, args.field, args.fieldType);
  }
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
