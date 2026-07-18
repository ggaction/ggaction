import { action } from "../../core/action.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  validateCategoricalFieldType
} from "../../grammar/scales.js";
import {
  BAR_GRAINS,
  inferBarColorLayout,
  resolveBarChannels,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { validateColorLayout } from "../../grammar/seriesLayout.js";
import {
  validateAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues
} from "../../grammar/aggregate.js";
import {
  resolveColorScaleDefinition,
  resolveOffsetScaleDefinition,
  resolveQuantitativeColorScaleDefinition
} from "../scales/definitions.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateLineSeriesCompatibility,
  validateOptions
} from "./shared.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";

const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "palette", "layout", "aggregate"
]);

function resolveColorScaleOptions(args) {
  const options = args.scale ?? {};
  if (args.palette === undefined) return options;
  if (options.palette !== undefined || options.range !== undefined) {
    throw new Error(
      "encodeColor palette cannot be combined with scale.palette or scale.range."
    );
  }
  return { ...options, palette: args.palette };
}

function assertNoConstantColor(program, layer) {
  const config = program.markConfigs[layer.id];
  const hasConstant = layer.mark.type === "point"
    ? config?.fill !== undefined
    : layer.mark.type === "line"
      ? config?.stroke !== undefined
      : layer.mark.type === "bar"
        ? config?.barAppearance?.fill !== undefined
        : layer.mark.type === "arc"
          ? config?.fill !== undefined
        : false;
  if (hasConstant) {
    throw new Error(
      `encodeColor cannot replace constant appearance on ${layer.mark.type} mark "${layer.id}".`
    );
  }
}

function isRangedArea(layer) {
  return layer.mark.type === "area" && (
    layer.encoding?.x2 !== undefined ||
    layer.encoding?.y2 !== undefined
  );
}

function resolveColorLayout(layer, requested, barGrain) {
  const existing = layer.encoding?.color === undefined
    ? undefined
    : layer.encoding.color.layout ?? (
        layer.mark.type === "bar"
          ? inferBarColorLayout(layer)
          : layer.mark.type === "area"
            ? "overlay"
            : undefined
      );
  if (requested !== undefined) validateColorLayout(requested);
  if (existing !== undefined && requested !== undefined && requested !== existing) {
    throw new Error(
      `Color layout transition from "${existing}" to "${requested}" is not supported.`
    );
  }
  const layout = requested ?? existing ?? (
    layer.mark.type === "bar"
      ? barGrain === BAR_GRAINS.histogram ? "stack" : barGrain === BAR_GRAINS.ranged ? "overlay" : "group"
      : layer.mark.type === "area"
        ? "overlay"
        : undefined
  );

  if (["point", "line"].includes(layer.mark.type) && layout !== undefined) {
    throw new Error(`Color layout is not supported for ${layer.mark.type} marks.`);
  }
  if (layer.mark.type === "area" && layout === "group") {
    throw new Error('Area color layout does not support "group".');
  }
  if (
    layer.mark.type === "arc" &&
    layout !== undefined &&
    layout !== "overlay"
  ) {
    throw new Error('Arc color layout currently supports only "overlay".');
  }
  if (
    isRangedArea(layer) &&
    layout !== "overlay"
  ) {
    throw new Error('Ranged area color encoding supports only "overlay" layout.');
  }
  return layout;
}

function applyColorLayoutCompanion(
  program,
  { target, layer, layout, scale, field }
) {
  if (layout === undefined) return program;
  if (layer.mark.type === "arc") return program;
  if (layer.mark.type === "bar" && resolveBarGrain(layer) === BAR_GRAINS.ranged) return program;
  if (isRangedArea(layer)) {
    return program;
  }
  const channels = layer.mark.type === "bar" ? resolveBarChannels(layer) : undefined;
  const measureChannel = channels?.measure ?? "y";
  const measure = layer.encoding?.[measureChannel];
  if (measure?.field === undefined || measure.scale === undefined) {
    throw new Error(`Color layout on mark "${target}" requires a measure encoding.`);
  }
  const stack = layout === "fill"
    ? "normalize"
    : layout === "overlay" || layout === "group"
      ? null
      : "zero";
  let next = program;
  if (layout === "group") {
    const offsetChannel = resolveBarOffsetChannel(layer);
    const method = offsetChannel === "xOffset" ? "encodeXOffset" : "encodeYOffset";
    next = next[method]({
      field,
      target,
      scale: {
        ...(layer.encoding?.[offsetChannel]?.scale === undefined
          ? {}
          : { id: layer.encoding[offsetChannel].scale }),
        domain: scale.domain
      }
    });
  }
  return next[measureChannel === "x" ? "encodeX" : "encodeY"]({
    target,
    field: measure.field,
    fieldType: measure.fieldType,
    ...(measure.aggregate === undefined ? {} : { aggregate: measure.aggregate }),
    stack
  });
}

function preSynchronizeGroupedOffset(
  program,
  { target, layer, layout, field, fieldType, scale, requestedScale }
) {
  if (
    layer.mark.type !== "bar" ||
    layout !== "group" ||
    layer.encoding?.color?.scale !== scale.id ||
    !Object.keys(requestedScale).some(key => key !== "id")
  ) {
    return program;
  }
  const offsetChannel = resolveBarOffsetChannel(layer);
  const offset = layer.encoding?.[offsetChannel];
  if (offset?.scale === undefined) return program;
  const offsetScale = resolveOffsetScaleDefinition(program, {
    id: offset.scale,
    domain: scale.domain
  }, offsetChannel);
  return program
    .editSemantic({
      property: `layer[${target}].encoding.${offsetChannel}.field`,
      value: field
    })
    .editSemantic({
      property: `layer[${target}].encoding.${offsetChannel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `scale[${offsetScale.id}].domain`,
      value: offsetScale.domain
    });
}

function encodeContinuousColor(program, args) {
  if (!["quantitative", "temporal"].includes(args.fieldType)) {
    throw new Error(`Unsupported color field type "${args.fieldType}".`);
  }
  if (args.layout !== undefined) {
    throw new Error("Continuous color does not support layout.");
  }
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "bar"],
    "continuous color mark"
  );
  assertNoConstantColor(program, layer);
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
  if (layer.mark.type === "point") {
    if (args.aggregate !== undefined) {
      throw new Error("Point continuous color does not support aggregate.");
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
  if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, args.field, args.fieldType, {
      allowUnknown: true
    });
  } else if (args.fieldType === "temporal") {
    readTemporalField(dataset.values, args.field);
  } else {
    readQuantitativeField(dataset.values, args.field);
  }
  const next = program
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
  return applyMaterializationPlan(
    scaled,
    planEncodingRematerialization(scaled, {
      target,
      channel: "color",
      scale: scale.id
    })
  );
}

const encodeColor = action(
  {
    op: "encodeColor",
    description: "Encode a field as graphical color."
  },
  function (args = {}) {
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const requestedFieldType = args.fieldType ?? "nominal";
    if (!["nominal", "ordinal"].includes(requestedFieldType)) {
      return encodeContinuousColor(this, {
        ...args,
        fieldType: requestedFieldType
      });
    }
    if (args.aggregate !== undefined) {
      throw new Error("Categorical color does not support aggregate.");
    }
    const fieldType = validateCategoricalFieldType(requestedFieldType);
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["point", "line", "bar", "area", "arc"],
      "color mark"
    );
    assertNoConstantColor(this, layer);
    if (
      layer.mark.type === "area" &&
      (layer.encoding?.group?.field === undefined ||
        layer.encoding.group.field !== args.field)
    ) {
      throw new Error(
        "Area color encoding must match an existing group encoding."
      );
    }
    validateLineSeriesCompatibility(layer, "color", args.field);

    const barGrain = resolveBarGrain(layer);
    if (layer.mark.type === "bar" && barGrain === undefined) {
      throw new Error(
        "Bar color encoding requires a complete histogram encoding or a complete ordinal aggregate encoding."
      );
    }
    const layout = resolveColorLayout(layer, args.layout, barGrain);
    const requestedScale = resolveReassignmentScaleOptions(
      layer.encoding?.color,
      resolveColorScaleOptions(args)
    );
    const scale = resolveColorScaleDefinition(this, requestedScale);
    if (Object.hasOwn(scale, "unknown") && layer.mark.type !== "point") {
      throw new Error(
        "Categorical color scale unknown currently requires a row-owned point mark."
      );
    }
    if (Object.hasOwn(scale, "unknown")) {
      readScaleField(dataset.values, args.field, fieldType, {
        allowUnknown: true
      });
    } else {
      readNominalField(dataset.values, args.field);
    }

    let next = this
      .editSemantic({
        property: `layer[${target}].encoding.color.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.scale`,
        value: scale.id
      });
    if (layout !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.color.layout`,
        value: layout
      });
    }
    next = preSynchronizeGroupedOffset(next, {
      target,
      layer,
      layout,
      field: args.field,
      fieldType,
      scale,
      requestedScale
    });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: layer.encoding?.color?.scale === scale.id
    });
    next = applyColorLayoutCompanion(next, {
      target,
      layer,
      layout,
      scale,
      field: args.field
    });

    return applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "color",
        scale: scale.id
      })
    );
  }
);

export function registerColorEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeColor = encodeColor;
}
